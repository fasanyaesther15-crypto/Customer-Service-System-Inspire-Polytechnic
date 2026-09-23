const {
  addChatMessage,
  closeChatSession,
  findChatMessages,
  findChatSessionForUser
} = require('../models/chat');

const MAX_MESSAGE_LENGTH = 10000;

function isStaff(user) {
  return ['support_agent', 'administrator'].includes(user.role);
}

function registerChatHandlers(io) {
  io.on('connection', (socket) => {
    const user = socket.request.session.user;

    socket.on('chat:join', async ({ sessionId } = {}, callback = () => {}) => {
      try {
        const chat = await findChatSessionForUser(sessionId, user);
        if (!chat) return callback({ error: 'Chat session not found.' });
        socket.join(`chat:${sessionId}`);
        callback({ ok: true, sessionId });
      } catch (error) {
        callback({ error: 'Unable to join chat.' });
      }
    });

    socket.on('chat:history', async ({ sessionId } = {}, callback = () => {}) => {
      try {
        const chat = await findChatSessionForUser(sessionId, user);
        if (!chat) return callback({ error: 'Chat session not found.' });
        callback({ messages: await findChatMessages(sessionId, user) });
      } catch (error) {
        callback({ error: 'Unable to load chat history.' });
      }
    });

    socket.on('chat:message', async ({ sessionId, message } = {}, callback = () => {}) => {
      const text = String(message || '').trim();
      if (!sessionId || !text || text.length > MAX_MESSAGE_LENGTH) {
        return callback({ error: 'Enter a valid message.' });
      }

      try {
        const chat = await findChatSessionForUser(sessionId, user);
        if (!chat || (!isStaff(user) && chat.student_id !== user.id)) {
          return callback({ error: 'Chat session not found.' });
        }
        const saved = await addChatMessage(sessionId, user.id, text);
        if (!saved) return callback({ error: 'Chat is closed.' });
        io.to(`chat:${sessionId}`).emit('chat:message', saved);
        callback({ ok: true, message: saved });
      } catch (error) {
        callback({ error: 'Unable to send chat message.' });
      }
    });

    socket.on('chat:typing', async ({ sessionId, active } = {}, callback = () => {}) => {
      try {
        const chat = await findChatSessionForUser(sessionId, user);
        if (!chat) return callback({ error: 'Chat session not found.' });
        socket.to(`chat:${sessionId}`).emit('chat:typing', { active: Boolean(active) });
        return callback({ ok: true });
      } catch (error) {
        return callback({ error: 'Unable to update typing status.' });
      }
    });

    socket.on('chat:close', async ({ sessionId } = {}, callback = () => {}) => {
      try {
        const closed = await closeChatSession(sessionId, user);
        if (!closed) return callback({ error: 'Chat session not found.' });
        io.to(`chat:${sessionId}`).emit('chat:closed', { sessionId });
        callback({ ok: true });
      } catch (error) {
        callback({ error: 'Unable to close chat.' });
      }
    });
  });
}

module.exports = { MAX_MESSAGE_LENGTH, registerChatHandlers };
