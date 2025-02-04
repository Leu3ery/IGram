## Структура проєкту

- database.sqlite
- middleware
  - authenticateJWT.js
  - multerMiddleware.js
- models
  - index.js
  - post.js
  - user.js
- routes
  - account.js
  - auth.js
  - post.js
  - uploads.js
- server.js
- setAdmin.js
- swagger
  - IGram-swagger-v1.1.yaml
  - IGram-swagger-v1.2.yaml
  - IGram-swagger-v1.3.yaml
  - IGram-swagger-v1.4.yaml
  - IGram-swagger-v1.5.yaml
- test.py

## Код файлів

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
        jwt.verify(token, process.env.JWT_ACCESS, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
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

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.resolve(__dirname, '../uploads/');
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

### models/index.js

```javascript
const {Sequelize, DataTypes} = require('sequelize');
const sequelize = new Sequelize({
    'dialect': 'sqlite',
    'storage': './database.sqlite'
});

const User = require('./user')(sequelize, DataTypes);
const Post = require('./post')(sequelize, DataTypes);

User.hasMany(Post, {
    foreignKey: 'creator', // Specify the foreign key name
    sourceKey: 'username', // Specify the primary key in the User table
    onDelete: 'CASCADE'
});

Post.belongsTo(User, {
    foreignKey: 'creator', // Specify the foreign key name
    targetKey: 'username' // Specify the primary key in the User table
});

module.exports = {
    sequelize,
    User,
    Post
}
```

### models/post.js

```javascript
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
```

### models/user.js

```javascript
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        username: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            len: [3, 32],
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
            len: [3, 32],
            validate: {
                len: {
                    args: [3, 32],
                    msg: 'Name must be between 3 and 32 characters long'
                }
            }
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
            len: [0, 512],
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
        const post = await Post.create({title, content, creator: creatorAccount.username});
        res.status(201).json({"message": "Post created successfully", "postId": post.id});
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
                    fs.unlinkSync(photoPath);
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
        return res.status(404).json({ message: 'Photo not found' });
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
                    fs.unlinkSync(imagePath);
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
            return res.status(404).json({ message: 'Image not found' });
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
const cors = require('cors');
const multer = require('multer');
const { sequelize } = require('./models');


const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/v1/auth/', require('./routes/auth'));
app.use('/api/v1/account/', require('./routes/account'));
app.use('/api/v1/post/', require('./routes/post'));
app.use('/api/v1/', require('./routes/uploads'));


app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    }

    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});


const PORT = 3000;
sequelize.sync().then(() => {
    app.listen(PORT, () => {
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

### swagger/IGram-swagger-v1.1.yaml

```
openapi: 3.0.0

info:
  title: IGram
  description: IGram pet project
  version: 0.0.1

servers:
  - url: http://localhost:3000/api/v1
    description: Dev local server

paths:
  /account/register:
    post:
      summary: Register new user
      requestBody: 
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties: 
                username:
                  type: string 
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '201': 
          description: User created successfully 
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

  /account/login:
    post:
      summary: Login to account
      description: Access and refresh tokens will be returned
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '200': 
          description: User found
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: 
                    type: string
                  refreshToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
          description: User not found
        '500':
          description: Server Error

  /account/refresh/:
    post:
      summary: Send refreshToken to get a new accessToken
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Got new accessToken
          content:
            application/json:
              schema:
                type: object
                properties: 
                  accessToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '403':
          description: Forbidden (token expired or invalid)
        '500':
          description: Server Error

  /account/photo/{username}:
    get:
      summary: Get avatar photo
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Avatar photo
          content:
            image/png: 
              schema:
                type: string
                format: binary
            image/jpeg:
              schema:
                type: string
                format: binary
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
            description: Photo not found
        '500':
          description: Server Error

  /account/photo/:
    post:
      summary: Send new photo for account
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: New avatar for account (png or jpeg, max 5MB)
      responses:
        '200':
          description: New photo uploaded successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error

  /account/{username}:
    get:
      summary: Get information about user
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Information about user
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

  /account/:
    patch:
      summary: Send new information about user
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  minLength: 3
                  maxLength: 32
                description:
                  type: string
                  maxLength: 300
      responses:
        '200':
          description: Data updated successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT # Removed the semicolon and added a proper comment

```

### swagger/IGram-swagger-v1.2.yaml

```
openapi: 3.0.0

info:
  title: IGram
  description: IGram pet project
  version: 0.0.2

servers:
  - url: http://localhost:3000/api/v1
    description: Dev local server

paths:
  /account/register:
    post:
      summary: Register new user
      requestBody: 
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties: 
                username:
                  type: string 
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '201': 
          description: User created successfully 
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

  /account/login:
    post:
      summary: Login to account
      description: Access and refresh tokens will be returned
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '200': 
          description: User found
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: 
                    type: string
                  refreshToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
          description: User not found
        '500':
          description: Server Error

  /account/refresh/:
    post:
      summary: Send refreshToken to get a new accessToken
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Got new accessToken
          content:
            application/json:
              schema:
                type: object
                properties: 
                  accessToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '403':
          description: Forbidden (token expired or invalid)
        '500':
          description: Server Error

  /account/photo/{username}:
    get:
      summary: Get avatar photo
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Avatar photo
          content:
            image/png: 
              schema:
                type: string
                format: binary
            image/jpeg:
              schema:
                type: string
                format: binary
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
            description: Photo not found
        '500':
          description: Server Error

  /account/photo/:
    post:
      summary: Send new photo for account
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: New avatar for account (png or jpeg, max 5MB)
      responses:
        '200':
          description: New photo uploaded successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error

  /account/{username}:
    get:
      summary: Get information about user
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Information about user
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

  /account/:
    get:
      summary: Get info about yourself
      security:
          - bearerAuth: []
      responses: 
        '200':
            description: username name description
            content:
                application/json:
                    schema:
                        type: object
                        properties:
                            username:
                                type: string
                            name: 
                                type: string
                            description:
                                type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
        

                        
    patch:
      summary: Send new information about user
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  minLength: 3
                  maxLength: 32
                description:
                  type: string
                  maxLength: 300
      responses:
        '200':
          description: Data updated successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT # Removed the semicolon and added a proper comment

```

### swagger/IGram-swagger-v1.3.yaml

```
openapi: 3.0.0

info:
  title: IGram
  description: IGram pet project
  version: 0.0.3

servers:
  - url: http://localhost:3000/api/v1
    description: Dev local server

paths:
  /auth/register:
    post:
      summary: Register new user
      requestBody: 
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties: 
                username:
                  type: string 
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '201': 
          description: User created successfully 
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

  /auth/login:
    post:
      summary: Login to account
      description: Access and refresh tokens will be returned
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '200': 
          description: User found
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: 
                    type: string
                  refreshToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
          description: User not found
        '500':
          description: Server Error

  /auth/refresh/:
    post:
      summary: Send refreshToken to get a new accessToken
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Got new accessToken
          content:
            application/json:
              schema:
                type: object
                properties: 
                  accessToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '403':
          description: Forbidden (token expired or invalid)
        '500':
          description: Server Error

  /account/photo/{username}:
    get:
      summary: Get avatar photo
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Avatar photo
          content:
            image/png: 
              schema:
                type: string
                format: binary
            image/jpeg:
              schema:
                type: string
                format: binary
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
            description: Photo not found
        '500':
          description: Server Error

  /account/photo/:
    post:
      summary: Send new photo for account
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: New avatar for account (png or jpeg, max 5MB)
      responses:
        '200':
          description: New photo uploaded successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error

  /account/{username}:
    get:
      summary: Get information about user
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Information about user
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

  /account/:
    get:
      summary: Get info about yourself
      security:
          - bearerAuth: []
      responses: 
        '200':
            description: username name description
            content:
                application/json:
                    schema:
                        type: object
                        properties:
                            username:
                                type: string
                            name: 
                                type: string
                            description:
                                type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
        

                        
    patch:
      summary: Send new information about user
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  minLength: 3
                  maxLength: 32
                description:
                  type: string
                  maxLength: 300
      responses:
        '200':
          description: Data updated successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
  /account/list/:
    get:
      summary: Get list of users
      parameters: 
        - in: query
          name: offSet
          schema:
            type: integer
            default: 0
          description: The number of items to skip before starting to collect the result set
        - in: query
          name: limit
          schema:
            type: integer
            default: 10
          description: The numbers of items to return
        - in: query
          name: startsWith
          schema:
            type: string
            default: ""
          description: Start of the word
      responses:
        '200':
          content:
            application/json: 
              schema:
                type:
                  array
                items:
                    type: object
                    properties: 
                      username: 
                        type: string
                      name:
                        type: string
                      description:
                        type: string
                example: 
                  [
                    {
                      "username": "leuzery",
                      "name": "bla bla",
                      "description": "bla bla bla"
                    }
                  ]
          description: Returns list with usernames
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

        

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT # Removed the semicolon and added a proper comment

```

### swagger/IGram-swagger-v1.4.yaml

```
openapi: 3.0.0

info:
  title: IGram
  description: IGram pet project
  version: 0.0.4

servers:
  - url: http://localhost:3000/api/v1
    description: Dev local server

paths:
  /auth/register:
    post:
      summary: Register new user
      requestBody: 
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties: 
                username:
                  type: string 
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '201': 
          description: User created successfully 
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

  /auth/login:
    post:
      summary: Login to account
      description: Access and refresh tokens will be returned
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '200': 
          description: User found
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: 
                    type: string
                  refreshToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
          description: User not found
        '500':
          description: Server Error

  /auth/refresh/:
    post:
      summary: Send refreshToken to get a new accessToken
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Got new accessToken
          content:
            application/json:
              schema:
                type: object
                properties: 
                  accessToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '403':
          description: Forbidden (token expired or invalid)
        '500':
          description: Server Error

  /account/photo/{username}:
    get:
      summary: Get avatar photo
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Avatar photo
          content:
            image/png: 
              schema:
                type: string
                format: binary
            image/jpeg:
              schema:
                type: string
                format: binary
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
            description: Photo not found
        '500':
          description: Server Error

  /account/photo/:
    post:
      summary: Send new photo for account
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: New avatar for account (png or jpeg, max 5MB)
      responses:
        '200':
          description: New photo uploaded successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error

  /account/{username}:
    get:
      summary: Get information about user
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Information about user
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error
    delete:
      summary: Delete user account if you are admin
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User was delited
        '400':
          description: Bad request (incorrectly filled in fields) or role is not admin
        '500':
          description: Server Error

  /account/:
    get:
      summary: Get info about yourself
      security:
          - bearerAuth: []
      responses: 
        '200':
            description: username name description
            content:
                application/json:
                    schema:
                        type: object
                        properties:
                            username:
                                type: string
                            name: 
                                type: string
                            description:
                                type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
    delete:
      summary: Delete own account
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Account was delited
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
    patch:
      summary: Send new information about user
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  minLength: 3
                  maxLength: 32
                description:
                  type: string
                  maxLength: 300
      responses:
        '200':
          description: Data updated successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
  /account/list/:
    get:
      summary: Get list of users
      parameters: 
        - in: query
          name: offSet
          schema:
            type: integer
            default: 0
          description: The number of items to skip before starting to collect the result set
        - in: query
          name: limit
          schema:
            type: integer
            default: 10
          description: The numbers of items to return
        - in: query
          name: startsWith
          schema:
            type: string
            default: ""
          description: Start of the word
      responses:
        '200':
          content:
            application/json: 
              schema:
                type:
                  array
                items:
                    type: object
                    properties: 
                      username: 
                        type: string
                      name:
                        type: string
                      description:
                        type: string
                example: 
                  [
                    {
                      "username": "leuzery",
                      "name": "bla bla",
                      "description": "bla bla bla"
                    }
                  ]
          description: Returns list with usernames
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error


        

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT # Removed the semicolon and added a proper comment

```

### swagger/IGram-swagger-v1.5.yaml

```
openapi: 3.0.0

info:
  title: IGram
  description: IGram pet project
  version: 0.0.5

servers:
  - url: http://localhost:3000/api/v1
    description: Dev local server

paths:
  /auth/register:
    post:
      summary: Register new user
      requestBody: 
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties: 
                username:
                  type: string 
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '201': 
          description: User created successfully 
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error

  /auth/login:
    post:
      summary: Login to account
      description: Access and refresh tokens will be returned
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  maxLength: 32
                  minLength: 3
                password:
                  type: string
                  minLength: 8
                  maxLength: 32
      responses:
        '200': 
          description: User found
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: 
                    type: string
                  refreshToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
          description: User not found
        '500':
          description: Server Error

  /auth/refresh/:
    post:
      summary: Send refreshToken to get a new accessToken
      requestBody:
        required: true
        content:
          application/json: 
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Got new accessToken
          content:
            application/json:
              schema:
                type: object
                properties: 
                  accessToken:
                    type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '403':
          description: Forbidden (token expired or invalid)
        '500':
          description: Server Error

  /account/photo/{username}:
    get:
      summary: Get avatar photo
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Avatar photo
          content:
            image/png: 
              schema:
                type: string
                format: binary
            image/jpeg:
              schema:
                type: string
                format: binary
        '400':
          description: Bad request (incorrectly filled in fields)
        '404':
            description: Photo not found
        '500':
          description: Server Error

  /account/photo/:
    post:
      summary: Send new photo for account
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: New avatar for account (png or jpeg, max 5MB)
      responses:
        '200':
          description: New photo uploaded successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error

  /account/{username}:
    get:
      summary: Get information about user
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Information about user
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error
    delete:
      summary: Delete user account if you are admin
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User was delited
        '400':
          description: Bad request (incorrectly filled in fields) or role is not admin
        '500':
          description: Server Error

  /account/:
    get:
      summary: Get info about yourself
      security:
          - bearerAuth: []
      responses: 
        '200':
            description: username name description
            content:
                application/json:
                    schema:
                        type: object
                        properties:
                            username:
                                type: string
                            name: 
                                type: string
                            description:
                                type: string
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
    delete:
      summary: Delete own account
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Account was delited
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
    patch:
      summary: Send new information about user
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content: 
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  minLength: 3
                  maxLength: 32
                description:
                  type: string
                  maxLength: 300
      responses:
        '200':
          description: Data updated successfully
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
  /account/list/:
    get:
      summary: Get list of users
      parameters: 
        - in: query
          name: offSet
          schema:
            type: integer
            default: 0
          description: The number of items to skip before starting to collect the result set
        - in: query
          name: limit
          schema:
            type: integer
            default: 10
          description: The numbers of items to return
        - in: query
          name: startsWith
          schema:
            type: string
            default: ""
          description: Start of the word
      responses:
        '200':
          content:
            application/json: 
              schema:
                type:
                  array
                items:
                    type: object
                    properties: 
                      username: 
                        type: string
                      name:
                        type: string
                      description:
                        type: string
                example: 
                  [
                    {
                      "username": "leuzery",
                      "name": "bla bla",
                      "description": "bla bla bla"
                    }
                  ]
          description: Returns list with usernames
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error
  /post/:
    post:
      summary: Create a post
      security:
        - bearerAuth: []
      requestBody: 
        required: true
        content:
          application/json: 
            schema: 
              type: object
              required:
                - title
              properties: 
                title:
                  type: string
                  minLength: 3
                  maxLength: 64
                content:
                  type: string
                  maxLength: 500
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  description: Post Image (png or jpeg, max 5MB)
      responses:
        '201':
          description: Post successfully created
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
  /post/{postId}/image:
    post:
      summary: Post image to existing post by postId
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: postId
          required: true
          schema:
            type: string
      requestBody: 
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: 
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: Post Image (png or jpeg, max 5MB)
      responses:
        '201':
          description: Image was successfully posted
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
    get:
      summary: Get image by postId
      parameters:
        - in: path
          name: postId
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Get image for post
          content:
            image/png: 
              schema:
                type: string
                format: binary
            image/jpeg:
              schema:
                type: string
                format: binary
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
  /post/{postId}:
    get:
      summary: Get post by id
      parameters:
        - in: path
          name: postId
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Info about note
          content:
            application/json: 
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  creator: 
                    type: string
                  title:
                    type: string
                  content:
                    type: string
    patch:
      summary: Update post
      security: 
        - bearerAuth: []
      parameters:
        - in: path
          name: postId
          required: true
          schema:
            type: string
      requestBody: 
        required: true
        content:
          application/json: 
            schema: 
              type: object
              properties: 
                title:
                  type: string
                  minLength: 3
                  maxLength: 64
                content:
                  type: string
                  maxLength: 500
      responses:
        '200':
          description: Post was updated
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error
    delete:
      summary: Delete post by id
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: postId
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Post was delited
        '400':
          description: Bad request (incorrectly filled in fields)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '500':
          description: Server Error

                
                  
  /post/list/:
    get:
      summary: Get list of posts
      parameters: 
        - in: query
          name: offSet
          schema:
            type: integer
            default: 0
          description: The number of posts to skip before starting to collect the result set
        - in: query
          name: limit
          schema:
            type: integer
            default: 10
          description: The numbers of posts to return
        - in: query
          name: username
          required: true
          schema:
            type: string
      responses:
        '200':
          content:
            application/json: 
              schema:
                type:
                  array
                items:
                    type: object
                    properties: 
                      id: 
                        type: integer
                      creator:
                        type: string
                      title:
                        type: string
                      content:
                        type: string
                example: 
                  [
                    {
                      "id": 1,
                      "creator": "admin",
                      "title": "rules",
                      "content": "more about rules",
                      "createdAt": "2025-01-29T11:11:20.822Z",
                    }
                  ]
          description: Returns list with usernames
        '400':
          description: Bad request (incorrectly filled in fields)
        '500':
          description: Server Error
      
      


        

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT # Removed the semicolon and added a proper comment

```

### test.py

```python
import os

def get_language_by_extension(file_path: str) -> str:
    _, ext = os.path.splitext(file_path.lower())
    ext_to_lang = {
        '.py': 'python',
        '.java': 'java',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.html': 'html',
        '.css': 'css',
        '.c': 'c',
        '.cpp': 'cpp',
        '.h': 'c',
        '.hpp': 'cpp',
        '.json': 'json',
        '.md': 'markdown',
        '.sh': 'bash'
    }
    return ext_to_lang.get(ext, '')

def build_structure(base_path: str, ignore_list: list[str]) -> dict:
    tree = {}
    if not os.path.isdir(base_path):
        return tree
    
    for entry in sorted(os.listdir(base_path)):
        if entry in ignore_list:
            continue

        full_path = os.path.join(base_path, entry)
        if os.path.isdir(full_path):
            if entry in ignore_list:
                continue
            tree[entry] = build_structure(full_path, ignore_list)
        else:
            if entry not in ignore_list:
                tree[entry] = None
    return tree

def structure_to_markdown(tree: dict, indent: int = 0) -> str:
    md_lines = []
    for key, value in tree.items():
        line = "  " * indent + f"- {key}"
        md_lines.append(line)
        if isinstance(value, dict):
            md_lines.append(structure_to_markdown(value, indent + 1))
    return "\n".join(md_lines)

def gather_files(tree: dict, base_path: str, current_path: str = "") -> list[str]:
    file_list = []
    for entry, value in tree.items():
        new_path = os.path.join(current_path, entry)
        if isinstance(value, dict):
            file_list.extend(gather_files(value, base_path, new_path))
        else:
            file_list.append(new_path)
    return file_list

def read_file_content(file_path: str) -> str:
    """
    Зчитує текстовий вміст файлу. Якщо файл двійковий або має інше кодування, повертає повідомлення.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        return f"Файл {file_path} не вдалося прочитати: невідоме кодування або це не текстовий файл."


def save_to_md_file(content: str, output_path: str) -> None:
    """
    Зберігає текстовий контент у файл формату .md.
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Файл збережено як: {output_path}")


def generate_markdown(base_path: str, ignore_list: list[str]) -> str:
    tree = build_structure(base_path, ignore_list)
    md_structure = "## Структура проєкту\n\n" + structure_to_markdown(tree)
    files = gather_files(tree, base_path)
    md_code_parts = ["\n\n## Код файлів\n"]
    for rel_path in files:
        full_path = os.path.join(base_path, rel_path)
        lang = get_language_by_extension(full_path)
        code = read_file_content(full_path)

        md_code_parts.append(f"### {rel_path}\n")
        if lang:
            md_code_parts.append(f"```{lang}\n{code}\n```\n")
        else:
            md_code_parts.append(f"```\n{code}\n```\n")
    return md_structure + "\n".join(md_code_parts)

if __name__ == "__main__":
    base_path = "."
    ignore_list = ["test.html", "project.md", ".git", ".DS_Store", "node_modules", "uploads", ".env", "databese.sqlite3", "generator.py", "package.json", "package-lock.json", "SequelizeSummery.md", "StartSummery.md", "Summery2.0.md", "output.md", "MulterSummery.md", "login.html", "profile.html", "register.html", "test.html"]
    output_md_file = "project.md"
    
    # Генеруємо Markdown
    markdown_content = generate_markdown(base_path, ignore_list)
    
    # Зберігаємо у файл .md
    save_to_md_file(markdown_content, output_md_file)

```
