module.exports = (sequelize, DataTypes) => {
    const Chat = sequelize.define('Chat', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            len: [3, 32],
            validate: {
                notNull: {
                    msg: 'Name is required'
                },
                len: {
                    args: [3, 32],
                    msg: 'Name must be between 3 and 32 characters long'
                }
            }
        }
    });
    return Chat;
};