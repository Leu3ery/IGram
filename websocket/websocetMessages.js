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
                const message = await Message.create({
                    chatId: payload.chatId,
                    userId: socket.user.id,
                    text: payload.message
                });

                const username = await User.findByPk(socket.user.id, { attributes: ['username'] });

                socket.to(payload.chatId).emit('chatMessage', {username: username.username, message: payload.message, createdAt: message.createdAt, chatId: payload.chatId});

            } catch (error) {
                console.error("Error handling message:", error);
                socket.emit('error', { message: 'Internal server error while sending message' });
            }
        });

        socket.on('editMessage', async (payload) => {
            try {
                console.log(payload);
                const {message, chatId, messageId} = payload;
                if (!message || !chatId || !messageId) {
                    return socket.emit('error', { message: 'message, chatId, or messageId are missing' });
                }
                const chats = await getChatIds(socket.user.id);
                if (!chats.includes(chatId)) {
                    return socket.emit('error', { message: 'You are not a user of this chat' });
                }
                const messageToEdit = await Message.findOne({where: {id: messageId, chatId, userId: socket.user.id}});
                if (!messageToEdit) {
                    return socket.emit('error', { message: 'Message not found' });
                }
                messageToEdit.text = message;
                await messageToEdit.save();
                const username = await User.findByPk(socket.user.id, { attributes: ['username'] });
                socket.to(chatId).emit('chatMessageEdited', {username: username.username, message: message, messageId: messageId, chatId: chatId});
            } catch (error) {
                console.error("Error editing message:", error);
                socket.emit('error', { message: 'Internal server error while editing message' });
            }
        });

        socket.on('deleteMessage', async (payload) => {
            try {
                const {chatId, messageId} = payload;
                if (!chatId || !messageId) {
                    return socket.emit('error', { message: 'chatId or messageId are missing' });
                }
                const chats = await getChatIds(socket.user.id);
                if (!chats.includes(chatId)) {
                    return socket.emit('error', { message: 'You are not a user of this chat' });
                }
                const messageToDelete = await Message.findOne({where: {id: messageId, chatId, userId: socket.user.id}});
                if (!messageToDelete) {
                    return socket.emit('error', { message: 'Message not found' });
                }
                await messageToDelete.destroy();
                socket.to(chatId).emit('chatMessageDeleted', {messageId: messageId, chatId: chatId});
            } catch (error) {
                console.error("Error deleting message:", error);
                socket.emit('error', { message: 'Internal server error while deleting message' });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};
