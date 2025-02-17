const form = document.getElementById('form');
const validation = document.getElementById("validation");

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const data = { username, password };
    try {
        const response = await fetch('/login', {
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