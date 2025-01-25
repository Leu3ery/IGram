## Структура проєкту

- middleware
  - authenticateJWT.js
- models
  - index.js
  - user.js
- routes
  - account.js
- server.js
- test.py

## Код файлів

### middleware/authenticateJWT.js

```javascript
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

### models/index.js

```javascript
const {Sequelize, DataTypes} = require('sequelize');
const sequelize = new Sequelize({
    'dialect': 'sqlite',
    'storage': './database.sqlite'
});

const User = require('./user')(sequelize, DataTypes);

module.exports = {
    User
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
                },
                isUnique: {
                    args: true,
                    msg: 'Username already exists'
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
    });
    return User;
};
```

### routes/account.js

```javascript
const express = require('express');
const router = express.Router();
const User = require('../models/user');
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
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH);
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

### server.js

```javascript
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


app.get('/', (req, res) => {
    res.status(404).send('Page not found');
})

app.use('/account', require('./routes/account'));


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
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
