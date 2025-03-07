window.addEventListener('load', async () => {
    const url = 'http://172.21.50.113:3000/api/v1';
    // if (!navigator.onLine) {
    //     alert("No internet connection! Please check your network.");
    //     return;
    // }

    await refreshToken();
    renderFooter();

    async function refreshToken() {
        try {
            const refreshToken = window.localStorage.getItem('refreshToken');
            if (!refreshToken) {
                window.location.replace('login.html');
            }
            const response = await fetch(url + '/auth/refresh/', {
                method: 'POST',
                headers:{
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'refreshToken':refreshToken})
            });
            const data = await response.json();
            if (response.ok) {
                window.localStorage.setItem('accessToken', data.accessToken);
            } else {
                window.location.replace('login.html');
            }
        } catch (error) {
            alert(error);
        }
    }
    
    function renderFooter() {
        const footer = document.querySelector('footer');
        footer.innerHTML = `
            <nav>
                <a href="contact.html"><i class="fa-regular fa-circle-user"></i></a>
                <a href="chat.html"><i class="fa-regular fa-comments"></i></a>
                <a href="post.html"><i class="fa-regular fa-newspaper"></i></a>
                <a href="account.html"><i class="fa-regular fa-address-card"></i></a>
            </nav>
        `
    }
});

