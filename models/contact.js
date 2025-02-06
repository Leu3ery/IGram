module.exports = (sequelize, DataTypes) => {
    const Contact = sequelize.define(
        'Contact',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            senderId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'User',
                    key: 'id'
                },
                onDelete: 'CASCADE' 
            },
            receiverId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'User',
                    key: 'id',
                    onDelete: 'CASCADE'
                }
            },
            isAccepted: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
        },
        {
            timestamps: false
        }
    );
    return Contact;
};
