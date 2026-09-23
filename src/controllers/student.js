const {
  addTicketMessageForStudent,
  countTicketsByStudent,
  createTicketWithMessage,
  findTicketByStudent,
  findTicketMessagesByStudent,
  findTicketsByStudent
} = require('../models/ticket');
  const { createChatSession, findOpenChatForStudent, findChatSessionsByStudent } = require('../models/chat');

const priorities = ['low', 'medium', 'high', 'urgent'];

function ticketValues(body = {}) {
  return {
    subject: String(body.subject || '').trim(),
    category: String(body.category || '').trim(),
    priority: String(body.priority || 'medium').trim(),
    message: String(body.message || '').trim()
  };
}

function validateTicket(values) {
  const errors = [];

  if (!values.subject) errors.push('Subject is required.');
  if (!values.category) errors.push('Category is required.');
  if (!values.message) errors.push('Description is required.');
  if (!priorities.includes(values.priority)) errors.push('Select a valid priority.');
  if (values.subject.length > 200) errors.push('Subject must be 200 characters or fewer.');
  if (values.category.length > 100) errors.push('Category must be 100 characters or fewer.');
  if (values.message.length > 10000) errors.push('Description must be 10,000 characters or fewer.');

  return errors;
}

function renderNewTicket(response, values, errors = []) {
  return response.status(errors.length ? 400 : 200).render('student/new-ticket', {
    pageTitle: 'New ticket',
    values,
    errors,
    priorities
  });
}

async function showDashboard(request, response, next) {
  try {
    const [ticketCount, recentTickets] = await Promise.all([
      countTicketsByStudent(request.session.user.id),
      findTicketsByStudent(request.session.user.id)
    ]);

    return response.render('student/dashboard', {
      pageTitle: 'Student portal',
      ticketCount,
      recentTickets: recentTickets.slice(0, 5)
    });
  } catch (error) {
    return next(error);
  }
}

async function showTickets(request, response, next) {
  try {
    const tickets = await findTicketsByStudent(request.session.user.id);

    return response.render('student/tickets', {
      pageTitle: 'My tickets',
      tickets
    });
  } catch (error) {
    return next(error);
  }
}

function showNewTicket(request, response) {
  return renderNewTicket(response, ticketValues());
}

async function createTicket(request, response, next) {
  const values = ticketValues(request.body);
  const errors = validateTicket(values);

  if (errors.length) {
    return renderNewTicket(response, values, errors);
  }

  try {
    const ticket = await createTicketWithMessage({
      studentId: request.session.user.id,
      category: values.category,
      subject: values.subject,
      priority: values.priority,
      message: values.message
    });

    return response.redirect(`/student/tickets/${ticket.id}`);
  } catch (error) {
    return next(error);
  }
}

async function showTicket(request, response, next) {
  try {
    const ticket = await findTicketByStudent(request.params.id, request.session.user.id);

    if (!ticket) {
      return response.status(404).render('error', {
        statusCode: 404,
        message: 'Ticket not found.'
      });
    }

    const messages = await findTicketMessagesByStudent(ticket.id, request.session.user.id);

    return response.render('student/ticket-detail', {
      pageTitle: ticket.subject,
      ticket,
      messages,
      errors: []
    });
  } catch (error) {
    return next(error);
  }
}

async function addTicketMessage(request, response, next) {

  async function showChat(request, response, next) {
    try {
      const sessions = await findChatSessionsByStudent(request.session.user.id);
      return response.render('student/chat', { pageTitle: 'Live support chat', sessions, activeSession: sessions[0] || null });
    } catch (error) { return next(error); }
  }

  async function startChat(request, response, next) {
    try {
      const session = await findOpenChatForStudent(request.session.user.id) || await createChatSession(request.session.user.id);
      return response.redirect(`/student/chat?session=${session.id}`);
    } catch (error) { return next(error); }
  }
  const message = String(request.body.message || '').trim();
  const errors = [];

  if (!message) errors.push('Message is required.');
  if (message.length > 10000) errors.push('Message must be 10,000 characters or fewer.');

  if (errors.length) {
    const ticket = await findTicketByStudent(request.params.id, request.session.user.id);

    if (!ticket) {
      return response.status(404).render('error', {
        statusCode: 404,
        message: 'Ticket not found.'
      });
    }

    const messages = await findTicketMessagesByStudent(ticket.id, request.session.user.id);
    return response.status(400).render('student/ticket-detail', {
      pageTitle: ticket.subject,
      ticket,
      messages,
      errors
    });
  }

  try {
    const savedMessage = await addTicketMessageForStudent(
      request.params.id,
      request.session.user.id,
      message
    );

    if (!savedMessage) {
      return response.status(404).render('error', {
        statusCode: 404,
        message: 'Ticket not found.'
      });
    }

    return response.redirect(`/student/tickets/${request.params.id}`);
  } catch (error) {
    return next(error);
  }
}

async function showChat(request, response, next) {
  try {
    const sessions = await findChatSessionsByStudent(request.session.user.id);
    return response.render('student/chat', {
      pageTitle: 'Live support chat',
      sessions,
      activeSession: sessions[0] || null
    });
  } catch (error) {
    return next(error);
  }
}

async function startChat(request, response, next) {
  try {
    const session = await findOpenChatForStudent(request.session.user.id)
      || await createChatSession(request.session.user.id);
    return response.redirect(`/student/chat?session=${session.id}`);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addTicketMessage,
  createTicket,
  showDashboard,
  showNewTicket,
  showTicket,
  showTickets,
  showChat,
  startChat,
  ticketValues,
  validateTicket
};