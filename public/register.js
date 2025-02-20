async function register(event) {
    event.preventDefault();
    const nickname = document.getElementById("nickname");
    const password1 = document.getElementById("password1");
    const password2 = document.getElementById("password2");
    const registerError = document.getElementById("register-error");
    if (password1.value == password2.value) {
        try{
            const response = await fetch('http://localhost:3000/api/v1/auth/register',{
                method: 'POST',
                headers: {
                    'Content-Type':'application/json'
                },
                body: JSON.stringify({'username':nickname.value, 'password':password1.value})
            });
            const data = await response.json();
            if (response.ok) {
                registerError.innerText = data.message;
                registerError.style.display = 'block';
                registerError.style.color = 'green';
                window.location.replace("login.html");
            } else {
                registerError.innerText = data.message || "Registration failed.";
                registerError.style.color = 'red';
                registerError.style.display = 'block';
            }
        } catch (error) {
            registerError.innerText = "An error occurred: " + error.message; 
            registerError.style.color = 'red';
            registerError.style.display = 'block';
        }
            
    } else {
        registerError.innerText = "Passwords are not same";
        registerError.style.color = 'red';
        registerError.style.display = 'block';
    }
}