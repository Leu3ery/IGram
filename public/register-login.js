const url = 'http://172.21.50.113:3000/api/v1'

async function register(event) {
    event.preventDefault();
    // if (!navigator.onLine) {
    //     alert("No internet connection! Please check your network.");
    //     return;
    // }
    const nickname = document.getElementById("nickname");
    const password1 = document.getElementById("password1");
    const password2 = document.getElementById("password2");
    const registerError = document.getElementById("register-error");
    if (password1.value == password2.value) {
        try{
            const response = await fetch(url + '/auth/register',{
                method: 'POST',
                headers: {
                    'Content-Type':'application/json'
                },
                body: JSON.stringify({'username':nickname.value, 'password':password1.value})
            });
            const data = await response.json();
            if (response.ok) {
                registerError.textContent = data.message;
                registerError.style.display = 'block';
                registerError.style.color = 'green';
                window.location.replace("login.html");
            } else {
                registerError.textContent = data.message || "Registration failed.";
                registerError.style.color = 'red';
                registerError.style.display = 'block';
            }
        } catch (error) {
            registerError.textContent = "An error occurred: " + error.message; 
            registerError.style.color = 'red';
            registerError.style.display = 'block';
        }
            
    } else {
        registerError.textContent = "Passwords are not same";
        registerError.style.color = 'red';
        registerError.style.display = 'block';
    }
}


async function login(event) {
    event.preventDefault();
    // if (!navigator.onLine) {
    //     alert("No internet connection! Please check your network.");
    //     return;
    // }
    const nickname = document.getElementById("nickname");
    const password1 = document.getElementById("password1");
    const registerError = document.getElementById("register-error");
    try {
        const response = await fetch(url + '/auth/login', {
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
            registerError.textContent = 'Success!';
            registerError.style.color = 'green';
            registerError.style.display = 'block';
            window.localStorage.setItem('accessToken', data.accessToken);
            window.localStorage.setItem('refreshToken', data.refreshToken);
            window.location.replace('account.html');
        } else {
            registerError.textContent = data.message || "Error";
            registerError.style.color = 'red';
            registerError.style.display = 'block';
        }
    } catch (error) {
        registerError.textContent = "An error occurred: " + error.message; 
        registerError.style.color = 'red';
        registerError.style.display = 'block';
    }
}