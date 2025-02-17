const form = document.getElementById('form');
const validation = document.getElementById("validation");

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    console.log("good1");

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const country = document.getElementById("country").value;

    if (password.length < 6) {
        validation.textContent = "Password must be at least 6 characters.";
        return;
    }

    const data = { username, password, firstName, lastName, country };
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
            const result = await response.json();
            if (result.success) {
                window.location.href = '/';
            } else {
                validation.textContent = result.message;
            }
    } catch (error) {
        console.error('Fetch error:', error);
    }
});