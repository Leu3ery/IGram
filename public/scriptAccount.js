window.addEventListener('load', async () => {
    const url = 'http://localhost:3000/api/v1';
    const basic_url = 'http://localhost:3000';

    await setAccountData();
    await setSettingsData();
    

    window.addEventListener('click', (event) => {
        // console.log(event.target.className.match('popup'));
        if (!event.target.className.match('popup')) {
            accountSettingsPopUp.style.display = 'none';
            settingsError.style.display = 'none';
            settingsError.style.color = 'red';
            settingsError.textContent = ''
        }
    })

    const accountSettingsButton = document.getElementById('account-settings');
    const accountSettingsPopUp = document.getElementById('account-settings-popup');
    const settingsError = document.getElementById('settings-error');
    accountSettingsButton.addEventListener('click', () => {
        accountSettingsPopUp.style.display = accountSettingsPopUp.style.display == 'none' ? 'block' : 'none';
        settingsError.style.display = 'none';
        settingsError.style.color = 'red';
        settingsError.textContent = ''
    });


    const settingsButton = document.getElementById('settings-button');
    settingsButton.addEventListener('click', async (event) => {
        try {
            event.preventDefault();
            let forward = true;
            const avatar = document.getElementById('settings-avatar-file');
            if (avatar.files[0]) {
                let formData = new FormData();
                formData.append('file', avatar.files[0]);
                const response = await fetch(url + '/account/photo', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Authorization': 'Bearer ' + window.localStorage.getItem('accessToken'),
                    },
                    body: formData
                });
                const data = await response.json();
                if (response.ok) {
                    settingsError.style.display = 'block';
                    settingsError.style.color = 'green';
                    settingsError.textContent = 'changed';
                    avatar.value = "";
                } else if (response.status == 403) {
                    return await refreshToken();
                } else if (response.status == 400) {
                    forward = false;
                    settingsError.style.display = 'block';
                    settingsError.style.color = 'red';
                    settingsError.textContent = data.message;
                } 
            }
            if (!forward) {
                return;
            }
            const name = document.getElementById('settings-name');
            const description = document.getElementById('settings-description');
            if (!name.value && !description.value) {
                return;
            }
            const response = await fetch(url + '/account/', {
                method:'PATCH',
                headers: {
                    'accept': 'application/json',
                    'Authorization': 'Bearer ' + window.localStorage.getItem('accessToken'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'name':name.value, 'description':description.value || ""})
            });
            const data = await response.json();
            if (response.ok) {
                settingsError.style.display = 'block';
                settingsError.style.color = 'green';
                settingsError.textContent = 'changed';
                await setAccountData();
                await setSettingsData();
            } else if (response.status == 403) {
                return await refreshToken();
            } else if (response.status == 400) {
                settingsError.style.display = 'block';
                settingsError.style.color = 'red';
                settingsError.textContent = data.message;
            } 
        } catch (error) {
            console.log(error);
        }
    })

    async function setSettingsData() {
        try {
            const name = document.getElementById('settings-name');
            const description = document.getElementById('settings-description');
            const avatar = document.getElementById('settings-avatar');
            const userData = await getUserData();
            if (userData.name) {
                name.value = userData.name;
            }
            if (userData.description) {
                description.value = userData.description;
            }
            if (userData.avatar) {
                avatar.src = userData.avatar;
            }
        } catch (error) {
            console.log(error);
        }
    }

    async function getUserData(username=null) {
        try {
            let nickname, name, description, avatar, user_info_response;
            if (username) {
                user_info_response = await fetch(url + '/account/' + username, {
                    method: 'GET',
                    headers: {
                        'accept':'application/json'
                    }
                });
            } else {
                user_info_response = await fetch(url + '/account/', {
                    method: 'GET',
                    headers: {
                        'accept':'application/json',
                        'Authorization':'Bearer ' + window.localStorage.getItem('accessToken')
                    }
                });
            }
            const user_info_data = await user_info_response.json();
            if (user_info_response.ok) {
                nickname = user_info_data.username;
                name = user_info_data.name;
                description = user_info_data.description;

                if (nickname) {
                    const user_image_response = await fetch(url + '/account/photo/' + user_info_data.username, {
                        method: 'GET',
                        accept: 'application/json'
                    });
                    const user_image_data = await user_image_response.json();
                    if (user_image_response.ok) {
                        avatar = basic_url + '/' + user_image_data.photoPath;
                    } else if (user_image_response.status == 403) {
                        await refreshToken();
                        return await getUserData();
                    } 
                }

            } else if (user_info_response.status == 403) {
                await refreshToken();
                return await getUserData();
            } 
            return {nickname, name, description, avatar}
        } catch (error) {
            console.log(error)
        }
    }

    async function setAccountData() {
        try {
            const nickname = document.getElementById('account-nickname');
            const name = document.getElementById('account-name');
            const description = document.getElementById('account-description');
            const avatar = document.getElementById('account-avatar');
            const query = new URLSearchParams(window.location.search);
            const userData = await getUserData(query.get('username'))
            if (userData.nickname || userData.nickname == '') {
                nickname.textContent = userData.nickname;
            }
            if (userData.name || userData.name == '') {
                name.textContent = userData.name;
            }
            if (userData.description || userData.description == '') {
                description.textContent = userData.description;
            }
            if (userData.avatar) {
                avatar.src = userData.avatar;
            }
        } catch (error) {
            alert(error);
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
    }
    
});

