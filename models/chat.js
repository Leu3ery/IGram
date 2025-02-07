module.exports = (sequelize, DataTypes) => {
    const Chat = sequelize.define('Chat', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Name is required'
                },
                len: {
                    args: [3, 32],
                    msg: 'Name must be between 3 and 32 characters long'
                }
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id'
            },
            onDelete: 'CASCADE'
        }
    });
    return Chat;
};