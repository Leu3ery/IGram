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
const Message = require('./message')(sequelize, DataTypes);

User.hasMany(Post, {
    foreignKey: 'userId', // Specify the foreign key name
    sourceKey: 'id', // Specify the primary key in the User table
    onDelete: 'CASCADE'
});

Post.belongsTo(User, {
    foreignKey: 'userId', // Specify the foreign key name
    targetKey: 'id' // Specify the primary key in the User table
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

Message.belongsTo(Chat, {
    foreignKey: 'chatId',
    onDelete: 'CASCADE'
});

Chat.hasMany(Message, {
    foreignKey: 'chatId',
    onDelete: 'CASCADE'
});

Message.belongsTo(User, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
});

User.hasMany(Message, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
});


module.exports = {
    sequelize,
    User,
    Post,
    Contact,
    Chat,
    ChatTable,
    Message
}