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

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};
