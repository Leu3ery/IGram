module.exports = (sequelize, DataTypes) => {
    const Contact = sequelize.define(
        'Contact',
        {
            senderId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            receiverId: {
                type: DataTypes.INTEGER,
                allowNull: false
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
