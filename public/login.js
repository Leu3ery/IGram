async function login(event) {
    event.preventDefault();
    const nickname = document.getElementById("nickname");
    const password1 = document.getElementById("password1");
    const registerError = document.getElementById("register-error");
    try {
        const response = await fetch('http://localhost:3000/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'username':nickname.value,
                'password':password1.value
            })
        });
        const data = await response.json();
        if (response.ok) {
            registerError.innerText = 'Success!';
            registerError.style.color = 'green';
            registerError.style.display = 'block';
            window.localStorage.setItem('accessToken', data.accessToken);
            window.localStorage.setItem('refreshToken', data.refreshToken);
            window.location.replace('main.html');
        } else {
            registerError.innerText = data.message || "Error";
            registerError.style.color = 'red';
            registerError.style.display = 'block';
        }
    } catch (error) {
        registerError.innerText = "An error occurred: " + error.message; 
        registerError.style.color = 'red';
        registerError.style.display = 'block';
    }
}