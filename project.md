## Структура проєкту

- .gitignore
- database.sqlite
- middleware
  - authenticateJWT.js
  - multerMiddleware.js
- models
  - chat.js
  - chatTable.js
  - contact.js
  - index.js
  - message.js
  - post.js
  - user.js
- routes
  - account.js
  - auth.js
  - chat.js
  - contact.js
  - post.js
  - uploads.js
- server.js
- setAdmin.js
- websocket
  - JWTMiddleware.js
  - hello.js

## Код файлів

### .gitignore

```
# Node modules
node_modules/

# Environment variables
.env

# IDE specific files
.idea/
.vscode/
.DS_Store
swagger/.DS_Store

project.modules
test.py
database.sqlite

uploads/

project.md
```

### database.sqlite

```
Файл ./database.sqlite не вдалося прочитати: невідоме кодування або це не текстовий файл.
```

### middleware/authenticateJWT.js

```javascript
const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_ACCESS, (err, id) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = id;
            next();
        });
    } else {
        res.sendStatus(403);
    }
};

module.exports = authenticateJWT;
```

### middleware/multerMiddleware.js

```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadPath = path.resolve(__dirname, '../uploads/');

// Check if the uploads directory exists, if not, create it
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
        error.message = 'Invalid file type (only JPEG and PNG are allowed)';
        cb(error, false);
    }
};  

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
});

module.exports = upload;
```

### models/chat.js

```javascript
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
        }
    });
    return Chat;
};
```

### models/chatTable.js

```javascript
module.exports = (sequelize, DataTypes) => {
    const chatTable = sequelize.define('ChatTable', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
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
        isAdmin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        timestamps: false
    });
    return chatTable;
};
```

### models/contact.js

```javascript
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
                    key: 'id'
                },
                onUpdate: 'CASCADE'
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

```

### models/index.js

```javascript
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
```

### models/message.js

```javascript
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
```

### models/post.js

```javascript
module.exports = (sequelize, DataTypes) => {
    const Post = sequelize.define('Post', {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'User',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        creator: {
            type: DataTypes.STRING,
            allowNull: false,
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
            type: DataTypes.STRING(500),
            allowNull: true,
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
```

### models/user.js

```javascript
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
            type: DataTypes.STRING(512),
            allowNull: true,
            validate: {
                len: {
                    args: [0, 512],
                    msg: 'Description must be between 0 and 512 characters long'
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
```

### routes/account.js

```javascript
const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authenticateJWT');
const { User } = require('../models');
const dotenv = require('dotenv');
const { Op } = require('sequelize'); 
dotenv.config();


router.patch('/', authenticateJWT, async (req, res) => {
    const { name, description } = req.body; 

    if (!name && !description) {
        return res.status(400).json({"message": "At least one field (name or description) must be provided."});
    }

    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({"message": "User not found"});
        }

        await user.update({ name, description });
        res.status(200).json({"message": "User updated successfully"});
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        console.error(error);
        res.status(500).json({"message": "An error occurred while updating the user."});
    }
});

router.get('/', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        res.status(200).json({username: user.username, name: user.name, description: user.description});
    } catch (error) {
        console.error(error);
        res.status(500).json({"message": "An error occurred while fetching the user."});
    }
});

router.delete('/', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        await user.destroy();
        res.status(200).json({"message": "User deleted successfully"});
    } catch (error) {
        console.error(error);
        res.status(500).json({"message": "An error occurred while deleting the user."});
    }
});


router.get('/list', async (req, res) => {
    const offSet = req.query.offSet || 0;
    const limit = req.query.limit || 10;
    const startsWith = req.query.startsWith || "";
    try {
        const users = await User.findAll({
            attributes: ['username', 'name', 'description'],
            where: {
                username: {
                    [Op.startsWith]: startsWith
                }
            },
            offset: parseInt(offSet),
            limit: parseInt(limit)
        });
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({"message": "An error occurred while fetching the user list."});
    }
})

router.get('/:username', async (req, res) => {
    const username = req.params.username;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        res.status(200).json({username: user.username, name: user.name, description: user.description});
    } catch (error) {
        console.error(error);
        res.status(500).json({"message": "An error occurred while fetching the user."});
    }
});

router.delete('/:username', authenticateJWT, async (req, res) => {
    try {
        const adminUser = await User.findOne({ where: {id: req.user.id} });
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(400).json({"message": "You must be an admin to delete a user."});
        }
        const user = await User.findOne({ where: { username: req.params.username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        await user.destroy();
        res.status(200).json({"message": "User deleted successfully"});
    } catch (error) {
        console.error(error);
        res.status(500).json({"message": "An error occurred while deleting the user."});
    }
});


module.exports = router;
```

### routes/auth.js

```javascript
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

function isValidPassword(password) {
    const minLength = 8;
    const maxLength = 32;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);
    
    if (password.length < minLength || password.length > maxLength) {
        return { valid: false, message: `Password must be between ${minLength} and ${maxLength} characters long.` };
    }
    if (!hasUpperCase) {
        return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!hasLowerCase) {
        return { valid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    if (!hasNumeric) {
        return { valid: false, message: 'Password must contain at least one numeric digit.' };
    }
    if (!hasSpecialChar) {
        return { valid: false, message: 'Password must contain at least one special character.' };
    }
    
    return { valid: true };
}

router.post('/register', async (req, res) => {
    const {username, password} = req.body;
    if (!username || !password) {
        return res.status(400).json({"message": "Username and password are required"});
    }
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ "message": passwordValidation.message });
    }
    if (username.length < 3 || username.length > 32) {
        return res.status(400).json({"message": "Username must be between 3 and 32 characters long"});
    }
    const existingUser = await User.findOne({where: {username}});
    if (existingUser) {
        return res.status(400).json({"message": "Username already exists"});
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({username, password: hashedPassword});
        res.status(201).json({"message": "User created successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
})

router.post('/login', async (req, res) => {
    const {username, password} = req.body;
    if (!username || !password) {
        return res.status(400).json({"message": "Username and password are required"});
    }
    const user = await User.findOne({where: {username}});
    if (!user) {
        return res.status(400).json({"message": "User not found"});
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({"message": "Invalid password"});
    }
    const accessToken = jwt.sign({id: user.id}, process.env.JWT_ACCESS, {expiresIn: '1h'});
    const refreshToken = jwt.sign({id: user.id}, process.env.JWT_REFRESH, {expiresIn: '7d'});
    res.status(200).json({"accessToken": accessToken, "refreshToken": refreshToken});
})

router.post('/refresh', async (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        return res.status(400).json({"message": "Refresh token is required"});
    }
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({"message": "Refresh token expired"});
        }
        return res.status(400).json({"message": "Invalid refresh token"});
    }
    const accessToken = jwt.sign({id: decoded.id}, process.env.JWT_ACCESS, {expiresIn: '1h'});
    res.status(200).json({"accessToken": accessToken});
})


module.exports = router;
```

### routes/chat.js

```javascript
const express = require('express');
const router = express.Router();
const { Chat, ChatTable, User, Contact } = require('../models/index');
const { Op } = require('sequelize');
const authenticateJWT = require('../middleware/authenticateJWT');

async function checkChatMembership(chatId, userId, adminRequired = false) {
    const membership = await ChatTable.findOne({ where: { chatId, userId } });
    if (!membership) {
      throw new Error('You are not user of this chat');
    }
    if (adminRequired && !membership.dataValues.isAdmin) {
      throw new Error('You are not admin of this chat');
    }
    
    return membership;
  }


router.get('/list', authenticateJWT, async (req, res, next) => {
    try {
        const {startsWith} = req.query;
        const whereClause = startsWith
            ? { name: { [Op.startsWith]: startsWith } }
            : {};

        const user = await User.findByPk(req.user.id, {
            attributes: [],
            include: [
                {
                model: Chat,
                where: whereClause,
                attributes: ['id', 'name'],
                through: { attributes: [] },
                }
            ]
        });
        res.status(200).json(user ? user.Chats : []);
    } catch (error) {
        next(error);
    }
});

router.patch('/admin/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(400).json({"message": "Chat not found"});
        };
        const {username} = req.query;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        };
        const userId = user.id;
        if (req.user.id === userId) {
            return res.status(400).json({"message": "You cannot set yourself as admin of this chat"});
        };
        if (!await ChatTable.findOne({ where: { chatId, userId } })) {
            return res.status(400).json({"message": "User you want to set as admin is not in this chat"});
        };
        await checkChatMembership(chatId, req.user.id, true);
        if (await ChatTable.findOne({ where: { chatId, userId, isAdmin: true } })) {
            return res.status(400).json({"message": "User is already admin of this chat"});
        }
        await ChatTable.update({ isAdmin: true }, { where: { chatId, userId } });
        res.status(200).json({"message": "User set as admin of this chat"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.post('/user/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(400).json({"message": "Chat not found"});
        };
        const {username} = req.query;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        };
        const userId = user.id;
        await checkChatMembership(chatId, req.user.id, true);
        if (req.user.id === userId) {
            return res.status(400).json({"message": "You cannot add yourself to the chat"});
        }
        if (await ChatTable.findOne({ where: { chatId, userId } })) {
            return res.status(400).json({"message": "User is already in this chat"});
        }
        if (!await Contact.findOne({
            where: { [Op.or]: [{ senderId: req.user.id, receiverId: userId }, { senderId: userId, receiverId: req.user.id }] }
        })) {
            return res.status(400).json({"message": "You are not friends with this user"});
        };
        const chatTable = await ChatTable.create({ chatId, userId });
        res.status(201).json({"message": "User was added to the chat"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.get('/user/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const membership = await checkChatMembership(chatId, req.user.id);
        const chat = await Chat.findOne({
            where: { id: chatId },
            attributes: [],
            include: [{
                model: User,
                attributes: ['id', 'username', 'name'],
                through: { attributes: ['isAdmin'] } // Get 'isAdmin' from ChatTable
            }]
        });
        if (!chat) {
            return res.status(400).json({"message": "Chat not found"});
        };
        return res.status(200).json(chat.Users.map(user => ({id: user.id, username: user.username, name: user.name, isAdmin: user.ChatTable.isAdmin})));
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.delete('/user/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(400).json({"message": "Chat not found"});
        };
        const {username} = req.query;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        };
        const userId = user.id;
        if (userId != req.user.id) {
            await checkChatMembership(chatId, req.user.id, true);
        };
        await checkChatMembership(chatId, userId);
        
        if (!await ChatTable.findOne({ where: { chatId, userId } })) {
            return res.status(400).json({"message": "User not found in this chat"});
        };
        if ((await ChatTable.findOne({ where: { chatId, userId } })).dataValues.isAdmin && req.user.id != userId) {
            return res.status(400).json({"message": "You can't remove an admin from the chat"});
        };
        if ((await ChatTable.findOne({ where: { chatId, userId } })).dataValues.isAdmin 
            && req.user.id == userId 
            && (await ChatTable.findAll({where: {
                chatId,
                isAdmin: true
            }})).length == 1) {
            return res.status(400).json({"message": "You can't leave if you are the only admin"});
        }
        await ChatTable.destroy({ where: { chatId, userId } });
        res.status(200).json({"message": "User was removed from the chat"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.post('/', authenticateJWT, async (req, res, next) => {
    try {
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({"message": "Name is required"});
        }
        if (name.length < 3 || name.length > 32) {
            return res.status(400).json({"message": "Name length must be between 3 and 32 characters"});
        }
        const chat = await Chat.create({name});
        await ChatTable.create({chatId: chat.id, userId: req.user.id, isAdmin: true});
        res.status(201).json({"message": "Chat created successfully"});
    } catch (error) {
        next(error);
    }
});

router.get('/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        };
        const chat = await Chat.findByPk(chatId, {
            attributes: ['name']
        });
        if (!chat) {
            return res.status(404).json({"message": "Chat not found"});
        };
        await checkChatMembership(chatId, req.user.id);
        res.status(200).json(chat);
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.patch('/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(404).json({"message": "Chat not found"});
        };
        await checkChatMembership(chatId, req.user.id, true);
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({"message": "Name is required"});
        }
        if (name.length < 3 || name.length > 32) {
            return res.status(400).json({"message": "Name length must be between 3 and 32 characters"});
        }
        chat.name = name;
        await chat.save();
        res.status(200).json({"message": "Chat updated successfully"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
}); 


router.delete('/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(404).json({"message": "Chat not found"});
        };
        await checkChatMembership(chatId, req.user.id, true);
        await chat.destroy();
        res.status(200).json({"message": "Chat deleted successfully"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

module.exports = router;
```

### routes/contact.js

```javascript
const express = require('express');
const router = express.Router();
const { Contact, User } = require('../models/index');
const authenticateJWT = require('../middleware/authenticateJWT');
const { Op } = require('sequelize');

router.patch('/received/:username', authenticateJWT, async (req, res, next) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        const contact = await Contact.findOne({where: {
            senderId: user.id,
            receiverId: req.user.id,
            isAccepted: false
        }});
        if (!contact) {
            return res.status(404).json({"message": "Contact not found"});
        }
        await contact.update({isAccepted: true});
        res.status(200).json({"message": "Contact accepted successfully"});
    } catch (error) {
        next(error);
    }
});

router.delete('/received/:username', authenticateJWT, async (req, res, next) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        const contact = await Contact.findOne({where: {
            senderId: user.id,
            receiverId: req.user.id,
            isAccepted: false
        }});
        if (!contact) {
            return res.status(404).json({"message": "Contact not found"});
        }
        await contact.destroy();
        res.status(200).json({"message": "Contact deleted successfully"});
    } catch (error) {
        next(error);
    }
});

router.get('/received', authenticateJWT, async (req, res, next) => {
    try {
        const contacts = await Contact.findAll({where: {
            receiverId: req.user.id,
            isAccepted: false
        }});
        const lst = [];
        for (let i = 0; i < contacts.length; i++) {
            const contactId = contacts[i].dataValues.senderId === req.user.id ? contacts[i].dataValues.receiverId : contacts[i].dataValues.senderId;
            const contactUsername = await User.findOne({where: {id: contactId}, attributes: ['username']});
            lst.push({username: contactUsername.dataValues.username});
        }
        res.status(200).json(lst);
    } catch (error) {
        next(error);
    }
});

router.delete('/sent/:username', authenticateJWT, async (req, res, next) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        const contact = await Contact.findOne({where: {
            senderId: req.user.id,
            receiverId: user.id,
            isAccepted: false
        }});
        if (!contact) {
            return res.status(404).json({"message": "Contact not found"});
        }
        await contact.destroy();
        res.status(200).json({"message": "Contact deleted successfully"});
    } catch (error) {
        next(error);
    }
});

router.get('/sent', authenticateJWT, async (req, res, next) => {
    try {
        const contacts = await Contact.findAll({where: {
            senderId: req.user.id,
            isAccepted: false
        }});
        const lst = [];
        for (let i = 0; i < contacts.length; i++) {
            const contactId = contacts[i].dataValues.senderId === req.user.id ? contacts[i].dataValues.receiverId : contacts[i].dataValues.senderId;
            const contactUsername = await User.findOne({where: {id: contactId}, attributes: ['username']});
            lst.push({username: contactUsername.dataValues.username});
        }
        res.status(200).json(lst);
    } catch (error) {
        next(error);
    }
});

router.get('/', authenticateJWT, async (req, res, next) => {
    try {
        const contacts = await Contact.findAll({where: {
            [Op.or]: [
                {senderId: req.user.id},
                {receiverId: req.user.id}
            ],
            isAccepted: true
        }});
        const lst = [];
        for (let i = 0; i < contacts.length; i++) {
            const contactId = contacts[i].dataValues.senderId === req.user.id ? contacts[i].dataValues.receiverId : contacts[i].dataValues.senderId;
            const contactUsername = await User.findOne({where: {id: contactId}, attributes: ['username']});
            lst.push({username: contactUsername.dataValues.username});
        }
        res.status(200).json(lst);
    } catch (error) {
        next(error);
    }
});


router.post('/:username', authenticateJWT, async (req, res, next) => {
    try {
        const {username} = req.params;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        if (user.id === req.user.id) {
            return res.status(400).json({"message": "You cannot send a contact request to yourself"});
        }
        const existingContact = await Contact.findOne({where: {
            [Op.or]: [
                {senderId: req.user.id, receiverId: user.id},
                {senderId: user.id, receiverId: req.user.id}
            ]
        }});
        if (existingContact) {
            return res.status(400).json({"message": "Contact request already sent or accepted"});
        }
        const contact = await Contact.create({senderId: req.user.id, receiverId: user.id, isAccepted: false});
        if (!contact) {
            return res.status(500).json({"message": "Failed to create contact request"});
        }
        res.status(201).json({"message": "Contact request sent successfully"});
    } catch (error) {
        next(error);
    }
});

router.delete('/:username', authenticateJWT, async (req, res, next) => {
    try {
        const username = req.params.username;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        const contact = await Contact.findOne({where: {
            [Op.or]: [
                {senderId: req.user.id, receiverId: user.id},
                {senderId: user.id, receiverId: req.user.id}
            ]
        }});
        if (!contact) {
            return res.status(404).json({"message": "Contact not found"});
        }
        await contact.destroy();
        res.status(200).json({"message": "Contact deleted successfully"});
    } catch (error) {
        next(error);
    }
});
 
module.exports = router;
```

### routes/post.js

```javascript
const express = require('express');
const router = express.Router();
const { Post, User } = require('../models/index');
const authenticateJWT = require('../middleware/authenticateJWT');


router.post('/', authenticateJWT, async (req, res) => {
    try {
        const {title, content} = req.body;
        const creatorAccount = await User.findOne({where: {id: req.user.id}});
        if (!creatorAccount) {
            return res.status(400).json({"message": "Creator account not found"});
        }
        if (!title || title.length < 3 || title.length > 64) {
            return res.status(400).json({"message": "At least title is required"});
        }
        if (content && content.length > 500) {
            return res.status(400).json({"message": "Content length must be less than 500 characters"});
        }
        const post = await Post.create({title, content, creator: creatorAccount.username, userId: creatorAccount.id});
        res.status(201).json({"message": "Post created successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});

router.get('/list', async (req, res) => {
    const {offSet, limit, username} = req.query;
    try {
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        const posts = await Post.findAll({
            attributes: ['id', 'creator', 'title', 'content', 'createdAt'],
            where: { creator: username },
            offset: !offSet ? 0 : parseInt(offSet),
            limit: !limit ? 10 : parseInt(limit),
            order: [['createdAt', 'DESC']] // Order by createdAt in descending order
        });
        res.status(200).json(posts);
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});


router.patch('/:postId', authenticateJWT, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) {
            return res.status(400).json({"message": "Post not found"});
        }
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        if (post.creator !== user.username) {
            return res.status(400).json({"message": "You can only update your own posts"});
        }
        const {title, content} = req.body;
        if (title && (title.length < 3 || title.length > 64)) {
            return res.status(400).json({"message": "Title must be between 3 and 64 characters long"});
        }
        if (content && content.length > 500) {
            return res.status(400).json({"message": "Content length must be less than 500 characters"});
        }
        if (title) {
            post.title = title;
        }
        if (content) {
            post.content = content;
        }
        await post.save();
        res.status(200).json({"message": "Post updated successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});

router.get('/:postId', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) {
            return res.status(400).json({"message": "Post not found"});
        }
        res.status(200).json({id: post.id, creator: post.creator, title: post.title, content: post.content});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});

router.delete('/:postId', authenticateJWT, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) {
            return res.status(400).json({"message": "Post not found"});
        }
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        if (post.creator !== user.username && user.role !== 'admin') {
            return res.status(400).json({"message": "You can only delete your own posts"});
        }
        await post.destroy();
        res.status(200).json({"message": "Post deleted successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});


module.exports = router;
```

### routes/uploads.js

```javascript
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerMiddleware');
const authenticateJWT = require('../middleware/authenticateJWT');
const {User, Post} = require('../models');
const path = require('path');
const fs = require('fs');


router.post(
    '/account/photo',
    authenticateJWT,
    (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err) {
                return next(err);
            }
            next();
        });
    },
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const user = await User.findByPk(req.user.id);
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
            try {
                if (user.avatarImage) {
                    const photoPath = path.join(__dirname, '..', 'uploads', user.avatarImage);
                    await fs.promises.unlink(photoPath);
                }
            } catch (error) {
                console.error("Error deleting photo:", error);
            }
            user.avatarImage = req.file.filename;
            await user.save();

            res.status(200).json({ message: 'Photo uploaded successfully' });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/account/photo/:username', async (req, res) => {
    const user = await User.findOne({ where: { username: req.params.username } });
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    if (!user.avatarImage) {
        return res.status(400).json({ message: 'Photo not found' });
    }
    const photoPath = path.join(__dirname, '..', 'uploads', user.avatarImage);
    res.sendFile(photoPath);
});

router.post('/post/:postId/image', 
    authenticateJWT, 
    async (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err) {
                return next(err);
            }
            next();
        });
    }, 
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }
            if (!req.params.postId) {
                return res.status(400).json({ message: 'Post id param is required' });
            }
            const post = await Post.findByPk(req.params.postId);
            if (!post) {
                return res.status(400).json({ message: 'Post not found' });
            }
            const user = await User.findByPk(req.user.id);
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
            if (post.creator !== user.username) {
                return res.status(400).json({ message: 'You can only update your own posts' });
            }
            try {
                if (post.image) {
                    const imagePath = path.join(__dirname, '..', 'uploads', post.image);
                    await fs.promises.unlink(imagePath);
                }
            } catch (error) {
                console.error("Error deleting image:", error);
            }
            post.image = req.file.filename;
            await post.save();
            res.status(200).json({ message: 'Image uploaded successfully' });
        } catch (error) {
            next(error);
        }
});

router.get('/post/:postId/image', async (req, res) => {
    try {
        if (!req.params.postId) {
            return res.status(400).json({ message: 'Post id param is required' });
        }
        const post = await Post.findByPk(req.params.postId);
        if (!post) {
            return res.status(400).json({ message: 'Post not found' });
        }
        if (!post.image) {
            return res.status(400).json({ message: 'Image not found' });
        }
        const imagePath = path.join(__dirname, '..', 'uploads', post.image);
        res.sendFile(imagePath);
    } catch (error) {
        next(error);
    }
});


module.exports = router;

```

### server.js

```javascript
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(cors());
app.use(express.json());


app.use('/api/v1/auth/', require('./routes/auth'));
app.use('/api/v1/account/', require('./routes/account'));
app.use('/api/v1/post/', require('./routes/post'));
app.use('/api/v1/contact/', require('./routes/contact'));
app.use('/api/v1/chat/', require('./routes/chat'));
app.use('/api/v1/', require('./routes/uploads'));


io.use(require('./websocket/JWTMiddleware'));


require('./websocket/hello')(io);


app.use((err, req, res, next) => {
    console.log(err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    }
    
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: err.errors[0].message });
    }
    
    res.status(500).json({ 
        message: err.message 
    });
});


const PORT = 3000;
sequelize.sync({force: false}).then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    });
});
```

### setAdmin.js

```javascript
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
```

### websocket/JWTMiddleware.js

```javascript
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

module.exports = (socket, next) => {
    try {
        const token = socket.handshake.headers.authorization.split(' ')[1];
        if (!token) {
            return next(new Error('Authentication error'));
        }
        const decoded = jwt.verify(token, process.env.JWT_ACCESS);
        socket.user = decoded;
        next();
    } catch (error) {
        console.log(error);
        next(new Error('Authentication error'));
    }
}
```

### websocket/hello.js

```javascript
const { User, Message, Chat } = require('../models/index');

async function getChatIds(userId) {
  let chats = await User.findByPk(userId, {
      attributes: [],
      include: [
          {
              model: Chat,
              attributes: ['id'],
              through: { attributes: [] }
          }
      ],
  });

  if (!chats) {
    throw new Error('User not found or has no chats');
  }

  chats = chats.Chats.map((chat) => chat.dataValues.id);
  return chats;
}

module.exports = (io) => {
    io.on('connection', async (socket) => {
        console.log('New client connected:', socket.id);

        try {
            const chats = await getChatIds(socket.user.id);

            chats.forEach(chatId => socket.join(chatId));
        } catch (error) {
            console.error("Error during chat fetching:", error);
            return socket.emit('error', { message: 'Internal server error while fetching chats' });
        }

        socket.on('message', async (payload) => {
            try {
                const chats = await getChatIds(socket.user.id);

                if (!payload.chatId || !payload.message) {
                    return socket.emit('error', { message: 'chatId or message are missing' });
                }
                if (!chats.includes(payload.chatId)) {
                    return socket.emit('error', { message: 'You are not a user of this chat' });
                }
                console.log(payload.chatId);
                console.log(payload.message);
                console.log(socket.user.id);
                await Message.create({
                    chatId: payload.chatId,
                    userId: socket.user.id,
                    text: payload.message
                });

                socket.to(payload.chatId).emit('chatMessage', payload.message);

            } catch (error) {
                console.error("Error handling message:", error);
                socket.emit('error', { message: 'Internal server error while sending message' });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};

```
