const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  addTicketMessage,
  createTicket,
  showDashboard,
  showNewTicket,
  showTicket,
  showTickets,
  showChat,
  startChat
} = require('../controllers/student');

const router = express.Router();
const requireStudent = [requireAuth, requireRole('student')];

router.get('/dashboard', requireStudent, showDashboard);
router.get('/tickets', requireStudent, showTickets);
router.get('/tickets/new', requireStudent, showNewTicket);
router.post('/tickets', requireStudent, createTicket);
router.get('/tickets/:id', requireStudent, showTicket);
router.post('/tickets/:id/messages', requireStudent, addTicketMessage);
router.get('/chat', requireStudent, showChat);
router.post('/chat', requireStudent, startChat);

module.exports = router;