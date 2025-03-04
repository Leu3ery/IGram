window.addEventListener('load', async () => {
    const url = 'http://localhost:3000/api/v1';

    const contactPopUp = document.getElementById('popup-contact-box');
    const contactButton = document.getElementById('contact-popup-button');
    contactButton.addEventListener('click', () => {
        contactPopUp.style.display = contactPopUp.style.display == 'none' ? 'flex' : 'none';
    });

    window.addEventListener('click', (event) => {
        if (!event.target.className.match('popup-contact')) {
            contactPopUp.style.display = 'none';
        }
    });

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
});

