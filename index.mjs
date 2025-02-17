import express from 'express';
import mysql from 'mysql2/promise';
import fetch from 'node-fetch';
import bcrypt from 'bcrypt';
import session from 'express-session';
const app = express();


app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }))

app.set('trust proxy', 1)
app.use(session({
 secret: '343ji43j4n3jn4jk3n',
 resave: false,
 saveUninitialized: true
}))

const pool = mysql.createPool({
   host: "william-peltz.tech",
   user: "*confidential*",
   password: "*confidential*",
   database: "williamp_window",
   connectionLimit: 10,
   waitForConnections: true
});
const conn = await pool.getConnection();

const WINDY_API_KEY = '*confidential*';

app.get('/', isAuthenticated, async (req, res) => {
    
    const countrySql = `SELECT hometown FROM user WHERE userId = ?`;
    const [countryRows] = await conn.query(countrySql, [req.session.userId]);
    const countryData = countryRows[0];
    console.log(countryData.hometown);

    const countryResponse = await fetch(`https://api.windy.com/webcams/api/v3/webcams?lang=en&countries=${countryData.hometown}`, {
        headers: {
            'x-windy-api-key': WINDY_API_KEY,
            'accept': 'application/json',
        },
    });
    const countries = await countryResponse.json();

    console.log('Countries:', countries); 

    const usernameSQL = `SELECT username FROM user WHERE userId = ?`;
    const [usernameRows] = await conn.query(usernameSQL, [req.session.userId]);
    if (usernameRows.length === 0) {
        return res.status(404).send('User not found');
    }
    const usernameData = usernameRows[0];

    let livePlayerUrl = null;

    if (countries.webcams[0]?.webcamId) {

    console.log('Countries:', countries); 
    console.log(countries.webcams.length);
    const randomIndex = Math.floor(Math.random() * countries.webcams.length);
    console.log(randomIndex);
    const webcamId = countries.webcams[randomIndex].webcamId;
        console.log('Fetching webcam data...'); // Check if the endpoint is being reached
        
        // Fetch the webcam data by ID
        //const webcamId = 1650186608; // Berlin › South
        const response = await fetch(`https://api.windy.com/webcams/api/v3/webcams/${webcamId}?lang=en&include=player`, {
            headers: {
                'x-windy-api-key': WINDY_API_KEY,
                'accept': 'application/json',
            },
        });

        const data = await response.json();
        
        console.log('API Response:', data); 

        livePlayerUrl = data;
        console.log(livePlayerUrl);

        const locResponse = await fetch(`https://api.windy.com/webcams/api/v3/webcams/${webcamId}?lang=en&include=location`, {
            headers: {
                'x-windy-api-key': WINDY_API_KEY,
                'accept': 'application/json',
            },
        });
    
        const locData = await locResponse.json();
        console.log('API Response (Location):', locData); 
    
        let latitude = locData.location.latitude;
        let longitude = locData.location.longitude;
        //console.log(latitude);
        //console.log(longitude);
    
        let url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,rain,snowfall,cloud_cover,wind_speed_10m&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
        let weatherInfo = await fetch(url);
        let weatherData = await weatherInfo.json();
        console.log(weatherData);

        let sql = "SELECT * FROM `likes` WHERE camId LIKE ? AND userId LIKE ? ";
        let params = [webcamId, req.session.userId];
        const [rows] = await conn.query(sql, params);

        let isChecked = false;
        if (rows.length > 0) {
            isChecked = true;
        }

        sql = "SELECT likes FROM `camera` WHERE camId LIKE ?";
        params = [livePlayerUrl.webcamId];
        let [numLikes] = await conn.query(sql, params);

        //Will asked for this
        if (numLikes.length == 0) {
            numLikes = [{ likes: 0 }];
        }

        res.render('home', { livePlayerUrl, locResponse, weatherData, isChecked, numLikes, usernameData });
    } else {
        res.render('home', { livePlayerUrl, usernameData });
    }
});

// will redirect here if not signed in
app.get('/login', (req, res) => {
    res.render('login')
});
 
 
 app.get('/signup', async (req, res) => {
    const countryResponse = await fetch(`https://api.windy.com/webcams/api/v3/countries?lang=en`, {
        headers: {
            'x-windy-api-key': WINDY_API_KEY,
            'accept': 'application/json',
        },
    });
    const countries = await countryResponse.json();
    console.log('Countries:', countries); 
    res.render('signup', {countries});
});
 
 
 // logging out ends session
 app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/')
});
 
 
// login functionality, takes user and password
app.post('/login', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let passwordHash = "";
    let sql = `SELECT * FROM user WHERE username = ? `;
    const [rows] = await conn.query(sql, [username]);
    if (rows.length > 0) {
        passwordHash = rows[0].password;
    }
    let match = await bcrypt.compare(password, passwordHash);
    if (match) {
        // if we find a match we make the session work and remember their id for later
        req.session.authenticated = true;
        req.session.userId = rows[0].userId;
        console.log(req.session.userId);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Incorrect username or password" });
    }
 });
 
 app.post('/signup', async (req, res) => {
    console.log("good");
 
    let username = req.body.username;
 
 
    let sql = `SELECT userId FROM user WHERE username LIKE ?;`
    let params = [ username ];
    const [rows] = await conn.query(sql, params);
 
 
    if (rows.length > 0) {
        res.json({ success: false, message: "Username not available." });
    } else {
        // turns input into hash before we put it into the database
        let password = await bcrypt.hash(req.body.password, 10);
        let firstName = req.body.firstName;
        let lastName = req.body.lastName;
        let hometown = req.body.country;
 
 
        let sql = `INSERT INTO user (username, password, firstName, lastName, hometown) VALUES (?, ?, ?, ?, ?);`
        let params = [username, password, firstName, lastName, hometown];
        const [rows] = await conn.query(sql, params);
        res.json({ success: true });
    }
 }); 

app.get('/search', isAuthenticated, async (req, res) => {
        console.log('Fetching webcam data...'); 
        
        const countryResponse = await fetch(`https://api.windy.com/webcams/api/v3/countries?lang=en`, {
            headers: {
                'x-windy-api-key': WINDY_API_KEY,
                'accept': 'application/json',
            },
        });
        const countries = await countryResponse.json();
        console.log('Countries:', countries); 
        const categoryResponse = await fetch(`https://api.windy.com/webcams/api/v3/categories?lang=en`, {
            headers: {
                'x-windy-api-key': WINDY_API_KEY,
                'accept': 'application/json',
            },
        });
        const categories = await categoryResponse.json();
        console.log('Categories:', categories); 


        //Micah's code(the username stuff), so if it doesn't work blame me(Micah)
        const usernameSQL = `SELECT username FROM user WHERE userId = ?`;
        const [usernameRows] = await conn.query(usernameSQL, [req.session.userId]);
        if (usernameRows.length === 0) {
            return res.status(404).send('User not found');
        }
        const usernameData = usernameRows[0];

        res.render('search', { countries, categories, usernameData });
});

app.get('/webcams', isAuthenticated, async (req, res) => {
    const { country, category } = req.query;

    console.log('Query Params:', req.query); 

    let apiUrl = `https://api.windy.com/webcams/api/v3/webcams?lang=en&limit=10&include=images`;
    if (country) apiUrl += `&countries=${country}`;
    if (category) apiUrl += `&categories=${category}`;

    console.log(`API URL: ${apiUrl}`); 

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'x-windy-api-key': WINDY_API_KEY,
                'accept': 'application/json',
            },
        });
        const webcams = await response.json();

        const usernameSQL = `SELECT username FROM user WHERE userId = ?`;
        const [usernameRows] = await conn.query(usernameSQL, [req.session.userId]);
        if (usernameRows.length === 0) {
            return res.status(404).send('User not found');
        }
        const usernameData = usernameRows[0];

        console.log('Webcam Data:', webcams); 
        res.render('webcams', { webcams, usernameData });
    } catch (error) {
        console.error('Error fetching webcams:', error);
        res.status(500).send('Error fetching webcams');
    }
});

app.get('/displayCam', async (req, res) => {
    let webcamId = req.query.webcamId;
    console.log(webcamId);
    const response = await fetch(`https://api.windy.com/webcams/api/v3/webcams/${webcamId}?lang=en&include=player`, {
        headers: {
            'x-windy-api-key': WINDY_API_KEY,
            'accept': 'application/json',
        },
    });

    const data = await response.json();
    
    console.log('API Response:', data); 

    const livePlayerUrl = data;
    console.log(livePlayerUrl);

    const locResponse = await fetch(`https://api.windy.com/webcams/api/v3/webcams/${webcamId}?lang=en&include=location`, {
        headers: {
            'x-windy-api-key': WINDY_API_KEY,
            'accept': 'application/json',
        },
    });

    const locData = await locResponse.json();
    console.log('API Response (Location):', locData); 

    let latitude = locData.location.latitude;
    let longitude = locData.location.longitude;
    //console.log(latitude);
    //console.log(longitude);

    let url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,rain,snowfall,cloud_cover,wind_speed_10m&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
    let weatherInfo = await fetch(url);
    let weatherData = await weatherInfo.json();
    console.log(weatherData);

    // we check whether the like exists in the database already
    let sql = "SELECT * FROM `likes` WHERE camId LIKE ? AND userId LIKE ? ";
    let params = [webcamId, req.session.userId];
    const [rows] = await conn.query(sql, params);

    // turn that into a boolean to pass along
    let isChecked = false;
    if (rows.length > 0) {
        isChecked = true;
    }

    sql = "SELECT likes FROM `camera` WHERE camId LIKE ?";
    params = [livePlayerUrl.webcamId];
    let [numLikes] = await conn.query(sql, params);

    //Will asked for this
    if (numLikes.length == 0) {
        numLikes = [{ likes: 0 }];
    }

    //Micah's code(the username stuff), so if it doesn't work blame me(Micah)
    const usernameSQL = `SELECT username FROM user WHERE userId = ?`;
    const [usernameRows] = await conn.query(usernameSQL, [req.session.userId]);
    if (usernameRows.length === 0) {
        return res.status(404).send('User not found');
    }
    const usernameData = usernameRows[0];


    res.render('home', { livePlayerUrl, locData, weatherData, isChecked, numLikes, usernameData });
});

app.get('/profile', isAuthenticated, async (req, res) => {
        try {
            const sql = `SELECT * FROM user WHERE userId = ?`;
            const [rows] = await conn.query(sql, [req.session.userId]);
    
            if (rows.length === 0) {
                return res.status(404).send('User not found');
            }
    
            const userData = rows[0];
            res.render('profile', { user: userData });
        } catch (error) {
            console.error('Error fetching user data:', error);
            res.status(500).send('Server error');
        }
    });

    app.get('/editprofile', isAuthenticated, async (req, res) => {
        const sql = `SELECT * FROM user WHERE userId = ?`;
        const [rows] = await conn.query(sql, [req.session.userId]);
        const userData = rows[0];

        const countryResponse = await fetch(`https://api.windy.com/webcams/api/v3/countries?lang=en`, {
            headers: {
                'x-windy-api-key': WINDY_API_KEY,
                'accept': 'application/json',
            },
        });
        const countries = await countryResponse.json();
        console.log('Countries:', countries); 
        res.render('editprofile', {userData, countries})
    });
    
     
app.post('/editprofile', async (req, res) => {
    const { username, password, country } = req.body;
    const userId = req.session.userId; 

    if (!userId) {
        return res.status(401).send("Unauthorized: No user session found.");
    }

    let updates = [];
    let params = [];

    if (username) {
        updates.push("username = ?");
        params.push(username);
    }

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push("password = ?");
        params.push(hashedPassword);
    }

    if (country) {
        updates.push("hometown = ?");
        params.push(country);
    }

    if (updates.length === 0) {
        return res.status(400).send("Please provide at least one field to update.");
    }

    params.push(userId); 
    const sql = `UPDATE user SET ${updates.join(", ")} WHERE userId = ?;`;

    const conn = await pool.getConnection();
    try {
        await conn.query(sql, params);
        res.redirect('/profile'); 
    } catch (err) {
        console.error('SQL Error:', err);
        res.status(500).send("Database error.");
    } finally {
        conn.release();
    }
});


app.get('/mostliked', isAuthenticated, async (req, res) => {
    const sql = "SELECT camId, likes FROM camera ORDER BY likes DESC LIMIT 10;";
    const [rows] = await conn.query(sql);

    const webcams = {
        webcams: [],
    };
    
    try {
        for (let i =0; i < rows.length; i++) {
            const response = await fetch(`https://api.windy.com/webcams/api/v3/webcams/${rows[i].camId}?lang=en&include=categories,images,location,player,urls`, {
            headers: {
                'x-windy-api-key': WINDY_API_KEY,
                'accept': 'application/json',
            },
            });
    
            const webcam = await response.json();
            console.log("HERE", webcam);
        
            webcams.webcams.push({
                title: webcam.title || 'Unknown Title',
                viewCount: webcam.viewCount || 0,
                webcamId: webcam.webcamId || 'Unknown ID',
                status: webcam.status || 'Unknown Status',
                lastUpdatedOn: webcam.lastUpdatedOn || 'Unknown Date',
                images: webcam.images || {}, // Add player URLs as images object
            });
        }

        const usernameSQL = `SELECT username FROM user WHERE userId = ?`;
        const [usernameRows] = await conn.query(usernameSQL, [req.session.userId]);

        if (usernameRows.length === 0) {
            return res.status(404).send('User not found');
        }

        const usernameData = usernameRows[0];

        res.render('webcams', { webcams, usernameData });
    } catch (error) {
        console.error('Error fetching most liked webcams:', error);
        res.status(500).send('Error fetching most liked webcams');
    }
});


app.get('/yourliked', isAuthenticated, async (req, res) => {
    const sql = "SELECT camId FROM likes WHERE userId = ?";
    const [rows] = await conn.query(sql, [req.session.userId]);

    const webcams = {
        webcams: [],
    };
    
    try {
        for (let i =0; i < rows.length; i++) {
            const response = await fetch(`https://api.windy.com/webcams/api/v3/webcams/${rows[i].camId}?lang=en&include=categories,images,location,player,urls`, {
            headers: {
                'x-windy-api-key': WINDY_API_KEY,
                'accept': 'application/json',
            },
            });
    
            const webcam = await response.json();
            console.log("HERE", webcam);
        
            webcams.webcams.push({
                title: webcam.title || 'Unknown Title',
                viewCount: webcam.viewCount || 0,
                webcamId: webcam.webcamId || 'Unknown ID',
                status: webcam.status || 'Unknown Status',
                lastUpdatedOn: webcam.lastUpdatedOn || 'Unknown Date',
                images: webcam.images || {}, // Add player URLs as images object
            });
        }

        const usernameSQL = `SELECT username FROM user WHERE userId = ?`;
        const [usernameRows] = await conn.query(usernameSQL, [req.session.userId]);

        if (usernameRows.length === 0) {
            return res.status(404).send('User not found');
        }

        const usernameData = usernameRows[0];

        res.render('webcams', { webcams, usernameData });
    } catch (error) {
        console.error('Error fetching most liked webcams:', error);
        res.status(500).send('Error fetching most liked webcams');
    }
});
    

app.post('/like', async (req, res) => {
    const livePlayerUrl = JSON.parse(req.body.livePlayerUrl);
    
    let sql = "SELECT likes FROM `camera` WHERE camId LIKE ?";
    let params = [livePlayerUrl.webcamId];
    const [rows] = await conn.query(sql, params);
    console.log(rows);
    
    if (req.body.checkbox) {
        sql = `INSERT INTO likes (camId, userId) VALUES (?, ?);`
        params = [livePlayerUrl.webcamId, req.session.userId];
        await conn.query(sql, params);
    
        if (rows.length > 0) {
            sql = `UPDATE camera SET likes = likes + 1 WHERE camId LIKE ?;`
            params = [livePlayerUrl.webcamId];
            await conn.query(sql, params);
        } else {
            sql = `INSERT INTO camera (camId, location, likes) VALUES (?, ?, ?);`
            params = [livePlayerUrl.webcamId, livePlayerUrl.title, 1];
            await conn.query(sql, params);
        }
    } else {
        sql = `DELETE FROM likes WHERE camId = ? AND userId = ?;`
        params = [livePlayerUrl.webcamId, req.session.userId];
        await conn.query(sql, params);
    
        if (rows[0].likes > 1) {
            sql = `UPDATE camera SET likes = likes - 1 WHERE camId LIKE ?;`
            params = [livePlayerUrl.webcamId];
            await conn.query(sql, params);
        } else {
            sql = `DELETE FROM camera WHERE camId = ?;`
            params = [livePlayerUrl.webcamId];
            await conn.query(sql, params);
        }
    }
    
    
    res.sendStatus(200);
});
       

function isAuthenticated (req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect("/login");
    }
}
 
 
app.listen(3000, () => {
    console.log("Express server running");
});
