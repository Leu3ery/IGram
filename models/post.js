module.exports = (sequelize, DataTypes) => {
    const Post = sequelize.define('Post', {
        creator: {
            type: DataTypes.STRING,
            allowNull: false,
            len: [3, 32],
            validate: {
                notNull: {
                    msg: 'Creator is required'
                },
                len: {
                    args: [3, 32],
                    msg: 'Creator must be between 3 and 32 characters long'
                }
            }
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            len: [3, 64],
            validate: {
                notNull: {
                    msg: 'Title is required'
                },
                len: {
                    args: [3, 64],
                    msg: 'Title must be between 3 and 64 characters long'
                }
            }
        },
        content: {
            type: DataTypes.STRING,
            allowNull: true,
            len: [0, 500],
            validate: {
                len: {
                    args: [0, 500],
                    msg: 'Content must be between 0 and 500 characters long'
                }
            }
        },
        image: {
            type: DataTypes.STRING,
            allowNull: true
        }
    });
    return Post;
}