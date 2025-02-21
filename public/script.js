window.addEventListener('load', async () => {
    const url = 'http://192.168.0.115:3000/api/v1'

    // if (!navigator.onLine) {
    //     alert("No internet connection! Please check your network.");
    //     return;
    // }

    await refreshToken();
    renderFooter();
    if (window.location.pathname == '/account.html') {
        await setAccountData();
    }

    async function setAccountData() {
        try {
            // if (!navigator.onLine) {
            //     alert("No internet connection! Please check your network.");
            //     return;
            // }
            const query = new URLSearchParams(window.location.search);
            if (query.get('username')) {
                const response = await fetch(url + '/account/' + query.get('username'), {
                    method: 'GET',
                    headers: {
                        'accept':'application/json'
                    }
                });
                const data = await response.json();
                if (response.ok) {
                    const nickname = document.getElementById('account-nickname');
                    const name = document.getElementById('account-name');
                    const description = document.getElementById('account-description');
                    nickname.textContent = data.username || "nonickname";
                    name.textContent = data.name || "No name";
                    description.textContent = data.description || "No description";
                } else if (response.status == 403) {
                    await refreshToken();
                    await setAccountData();
                } else {
                    alert(data.message);
                }
            } else {
                const response = await fetch(url + '/account/', {
                    method: 'GET',
                    headers: {
                        'accept':'application/json',
                        'Authorization':'Bearer ' + window.localStorage.getItem('accessToken')
                    }
                });
                const data = await response.json();
                if (response.ok) {
                    const nickname = document.getElementById('account-nickname');
                    const name = document.getElementById('account-name');
                    const description = document.getElementById('account-description');
                    nickname.textContent = data.username || "nonickname";
                    name.textContent = data.name || "No name";
                    description.textContent = data.description || "No description";
                } else if (response.status == 403) {
                    await refreshToken();
                    await setAccountData();
                } else {
                    alert(data.message);
                }
            }
        } catch (error) {
            alert(error);
        }
        
    }

    async function refreshToken() {
        try {
            // if (!navigator.onLine) {
            //     alert("No internet connection! Please check your network.");
            //     return;
            // }
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

