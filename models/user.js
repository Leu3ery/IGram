module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        username: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Username is required'
                },
                len: {
                    args: [3, 32],
                    msg: 'Username must be between 3 and 32 characters long'
                }
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Password is required'
                }
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: {
                    args: [3, 32],
                    msg: 'Name must be between 3 and 32 characters long'
                }
            }
        },
        description: {
            type: DataTypes.STRING(150),
            allowNull: true,
            validate: {
                len: {
                    args: [0, 150],
                    msg: 'Description must be between 0 and 150 characters long'
                }
            }
        },
        avatarImage: {
            type: DataTypes.STRING,
            allowNull: true
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'user',
            validate: {
                notNull: {
                    msg: 'Role is required'
                },

                isRoleValid(value) {
                    if (value !== 'user' && value !== 'admin') {
                        throw new Error('Role must be either "user" or "admin"');
                    }
                }
            }
        }
    });
    return User;
};