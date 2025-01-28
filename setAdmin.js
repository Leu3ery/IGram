const { Sequelize } = require('sequelize');
const { User } = require('./models/index');

async function setAdminRole() {
    const user = await User.findOne({ where: { username: 'admin' } });
    if (user) {
        await user.update({ role: 'admin' });
        console.log('User role updated to "admin"');
    }
}

setAdminRole();