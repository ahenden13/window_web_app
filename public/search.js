// ignore for now
document.getElementById('minLikes').addEventListener('change', async (event) => {
    document.getElementById('maxLikes').min = document.getElementById('minLikes').value;
});