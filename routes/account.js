const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authenticateJWT');
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

module.exports = router;