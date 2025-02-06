const {Sequelize, DataTypes} = require('sequelize');
const sequelize = new Sequelize({
    'dialect': 'sqlite',
    'storage': './database.sqlite'
});

const User = require('./user')(sequelize, DataTypes);
const Post = require('./post')(sequelize, DataTypes);
const Contact = require('./contact')(sequelize, DataTypes);
const Chat = require('./chat')(sequelize, DataTypes);
const ChatTable = require('./chatTable')(sequelize, DataTypes);

User.hasMany(Post, {
    foreignKey: 'creator', // Specify the foreign key name
    sourceKey: 'username', // Specify the primary key in the User table
    onDelete: 'CASCADE'
});

Post.belongsTo(User, {
    foreignKey: 'creator', // Specify the foreign key name
    targetKey: 'username' // Specify the primary key in the User table
});

User.belongsToMany(User, {
    as: 'contacts',
    through: Contact,
    foreignKey: 'senderId',  // The user who sent the contact request
    otherKey: 'receiverId',  // The user who receives the contact request
    onDelete: 'CASCADE'
});

Chat.belongsToMany(User, {
    through: ChatTable,
    foreignKey: 'chatId',
    otherKey: 'userId',
    onDelete: 'CASCADE'
});

User.belongsToMany(Chat, {
    through: ChatTable,
    foreignKey: 'userId',
    otherKey: 'chatId',
    onDelete: 'CASCADE'
});

module.exports = {
    sequelize,
    User,
    Post,
    Contact,
    Chat,
    ChatTable
}