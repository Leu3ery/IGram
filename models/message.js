module.exports = (sequelize, DataTypes) => {
    const Message = sequelize.define('Message', {
        chatId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Chat',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        text: {
            type: DataTypes.STRING(2000),
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Text is required'
                },
                len: {
                    args: [1, 2000],
                    msg: 'Text must be between 1 and 2000 characters long'
                }
            }
        }
    });
    return Message;
};