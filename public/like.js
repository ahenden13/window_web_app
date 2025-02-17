document.getElementById('checkbox').addEventListener('change', async (event) => {
    // we use a fetch call so we dont have to reload the page (only method i could find)
    fetch('/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            checkbox: document.getElementById('checkbox').checked,
            livePlayerUrl: document.getElementById('livePlayerUrl').value,
        }),
    });

    // this changes the like counter whenever we like or unlike
    if (document.getElementById('checkbox').checked) {
        document.getElementById("numLikes").textContent = parseInt(document.getElementById("numLikes").textContent) + 1;
    } else {
        document.getElementById("numLikes").textContent = parseInt(document.getElementById("numLikes").textContent) - 1;
    }
});
