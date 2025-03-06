window.addEventListener('load', async () => {
    const url = 'http://localhost:3000/api/v1';
    const basic_url = 'http://localhost:3000';

    let lastPopupRequest = {};

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

    const popupSearchButton = document.getElementById('popup-search-button');
    popupSearchButton.addEventListener('click', async (e) => {
        try {
            e.preventDefault();
            lastPopupRequest = {};
            const inputField = document.getElementById('popup-input');
            await fillPopupList(0, 20, inputField.value);
        } catch (error) {
            console.log(error);
        }
        
    });

    async function fillPopupList(offSet=0, limit=30, startsWith="", dop=false) {
        try {
            let newOffSet = (lastPopupRequest.offSet || 0) + limit;
            lastPopupRequest = {'offSet':newOffSet, limit, startsWith};
            const contactList = document.getElementById('contact-list-popup');
            const response = await fetch(url+'/account/list?'+new URLSearchParams({
                offSet: offSet,
                limit: limit,
                startsWith: startsWith
            }), {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': 'Bearer ' + window.localStorage.getItem('accessToken')
                }
            });
            const data = await response.json();
            if (response.ok) {
                if (dop) {
                    const lastEl = contactList.lastElementChild;
                    if (lastEl) {
                        contactList.removeChild(lastEl);
                    }
                } else  {
                    contactList.innerHTML = '';
                }
                for (let i = 0; i < data.length; i++) {
                    const newEl = document.createElement('li');
                    newEl.className = 'contact-block-add popup-contact';
                    newEl.innerHTML = `<div class="contact-block-img-name popup-contact">
                                <img src="avatar.png" alt="avatar" class="popup-contact">
                                <div class="contact-block-name popup-contact">
                                    <h4 class="popup-contact"></h4>
                                    <h5 class="popup-contact"></h5>
                                </div>
                            </div>
                            <div class="contacts-blick-two-buttons popup-contact">
                                <button class="contact-button-send popup-contact">Send</button>
                            </div>`;
                    if (data[i].username) {
                        newEl.querySelector('h4').textContent = data[i].username;
                    }
                    if (data[i].name) {
                        newEl.querySelector('h5').textContent = data[i].name;
                    }
                    if (data[i].avatarImage) {
                        newEl.querySelector('img').src = basic_url + '/uploads/' + data[i].avatarImage;
                    }
                    newEl.querySelector('button.contact-button-send').addEventListener('click', async (e) => {
                        if (addFriend(data[i].username)) {
                            e.target.classList.remove('contact-button-send');
                            e.target.classList.add('contact-button-sent');
                            e.target.textContent = 'Sent';
                        }
                    });
                    contactList.appendChild(newEl);
                }
                const loadNextButton = document.createElement('button');
                loadNextButton.className = 'popup-contact';
                loadNextButton.id = 'popup-next-button';
                loadNextButton.textContent = 'Load next';
                loadNextButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const offSet = lastPopupRequest.offSet || 0;
                    const limit = lastPopupRequest.limit || 20;
                    const startsWith = lastPopupRequest.startsWith || "";
                    await fillPopupList(offSet, limit, startsWith, true);
                });
                contactList.appendChild(loadNextButton);
            } else if (response.status == 403) {
                return  await refreshToken();
            } else {
                console.log(data.message);
            }
        } catch (error) {
            console.log(error)
        }
    };


    async function addFriend(username) {
        try {
            if (username.length < 1) {
                return;
            }
            const response = await fetch(url+`/contact/${username}`, {
                method: "POST",
                headers: {
                    'accept': 'application/json',
                    'Authorization': 'Bearer ' + window.localStorage.getItem('accessToken')
                }
            });
            const data = await response.json();
            if (response.ok) {
                return true;
            } else if (response.status = 403) {
                return refreshToken();
            } else {
                console.log(data.message);
            }
        } catch (error) {
            console.log(error);
        }     
    }


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
    };

});
