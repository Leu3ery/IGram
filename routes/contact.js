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
            const contactUsername = await User.findOne({where: {id: contactId}, attributes: ['username', 'avatarImage', 'name']});
            lst.push({username: contactUsername.dataValues.username, avatarImage: contactUsername.dataValues.avatarImage, name: contactUsername.dataValues.name});
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
            const contactUsername = await User.findOne({where: {id: contactId}, attributes: ['username', 'avatarImage', 'name']});
            lst.push({username: contactUsername.dataValues.username, avatarImage: contactUsername.dataValues.avatarImage, name: contactUsername.dataValues.name});
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
            const contactUsername = await User.findOne({where: {id: contactId}, attributes: ['username', 'avatarImage', 'name']});
            lst.push({username: contactUsername.dataValues.username, avatarImage: contactUsername.dataValues.avatarImage, name: contactUsername.dataValues.name});
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