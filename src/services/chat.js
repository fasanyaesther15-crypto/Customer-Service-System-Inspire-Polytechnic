const {
  addChatMessage,
  addGuestChatMessage,
  closeChatSession,
  closeGuestChatSession,
  findChatMessages,
  findChatMessagesForGuest,
  findChatSessionForGuest,
  findChatSessionForUser
} = require('../models/chat');

const MAX_MESSAGE_LENGTH = 10000;

function isStaff(user) {
  return Boolean(user && ['support_agent', 'administrator'].includes(user.role));
}

function registerChatHandlers(io) {
  io.on('connection', (socket) => {
    const user = socket.request.session.user || null;
    const guestSessionId = user ? null : socket.data.guestSessionId;

    if (isStaff(user)) {
      socket.join('support:agents');
      io.to('support:guest:active').emit('chat:support-presence', { available: true });
      socket.on('disconnect', async () => {
        try {
          const agents = await io.in('support:agents').fetchSockets();
          if (!agents.length) io.to('support:guest:active').emit('chat:support-presence', { available: false });
        } catch (error) {
          // Presence is advisory; chat ownership and messaging do not depend on it.
        }
      });
    }

    const findOwnedSession = (sessionId) => user
      ? findChatSessionForUser(sessionId, user)
      : guestSessionId
        ? findChatSessionForGuest(sessionId, guestSessionId)
        : null;

    socket.on('chat:join', async ({ sessionId } = {}, callback = () => {}) => {
      try {
        const chatSession = await findOwnedSession(sessionId);
        if (!chatSession) return callback({ error: 'Chat session not found.' });
        socket.join(`chat:${sessionId}`);
        const supportAgents = !user && chatSession.status !== 'closed'
          ? await io.in('support:agents').fetchSockets()
          : [];
        if (!user && chatSession.status !== 'closed') socket.join('support:guest:active');
        callback({
          ok: true,
          sessionId,
          status: chatSession.status,
          guest: !user,
          supportAvailable: user ? undefined : supportAgents.length > 0
        });
      } catch (error) {
        callback({ error: 'Unable to join chat.' });
      }
    });

    socket.on('chat:history', async ({ sessionId } = {}, callback = () => {}) => {
      try {
        const chatSession = await findOwnedSession(sessionId);
        if (!chatSession) return callback({ error: 'Chat session not found.' });
        const messages = user
          ? await findChatMessages(sessionId, user)
          : await findChatMessagesForGuest(sessionId, guestSessionId);
        callback({ messages });
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
        const chatSession = await findOwnedSession(sessionId);
        if (!chatSession) return callback({ error: 'Chat session not found.' });

        const saved = user
          ? await addChatMessage(sessionId, user.id, text)
          : await addGuestChatMessage(sessionId, guestSessionId, text);
        if (!saved) return callback({ error: 'Chat is closed.' });

        const messageWithSender = {
          ...saved,
          sender_name: user ? user.fullName : chatSession.guest_name,
          sender_kind: user ? user.role : 'guest'
        };
        io.to(`chat:${sessionId}`).emit('chat:message', messageWithSender);
        callback({ ok: true, message: messageWithSender });
      } catch (error) {
        callback({ error: 'Unable to send chat message.' });
      }
    });

    socket.on('chat:typing', async ({ sessionId, active } = {}, callback = () => {}) => {
      try {
        if (!await findOwnedSession(sessionId)) return callback({ error: 'Chat session not found.' });
        socket.to(`chat:${sessionId}`).emit('chat:typing', { active: Boolean(active) });
        return callback({ ok: true });
      } catch (error) {
        return callback({ error: 'Unable to update typing status.' });
      }
    });

    socket.on('chat:close', async ({ sessionId } = {}, callback = () => {}) => {
      try {
        const closed = user
          ? await closeChatSession(sessionId, user)
          : guestSessionId
            ? await closeGuestChatSession(sessionId, guestSessionId)
            : null;
        if (!closed) return callback({ error: 'Chat session not found.' });
        if (!user) socket.leave('support:guest:active');
        io.to(`chat:${sessionId}`).emit('chat:closed', { sessionId });
        callback({ ok: true });
      } catch (error) {
        callback({ error: 'Unable to close chat.' });
      }
    });
  });
}

module.exports = { MAX_MESSAGE_LENGTH, registerChatHandlers };