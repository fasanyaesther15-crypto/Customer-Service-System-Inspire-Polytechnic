require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const { Server } = require('socket.io');
const { getPool } = require('./config/database');
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const studentRoutes = require('./routes/student');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = Number.parseInt(process.env.PORT, 10) || 3000;
const publicDirectory = path.join(__dirname, 'public');
const viewsDirectory = path.join(__dirname, 'views');
const PgSession = connectPgSimple(session);

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required for session authentication.');
}

app.set('view engine', 'ejs');
app.set('views', viewsDirectory);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(publicDirectory));
app.use(session({
  store: new PgSession({
    pool: getPool(),
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use((request, response, next) => {
  response.locals.currentUser = request.session.user || null;
  response.locals.currentPath = request.path;
  next();
});
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});

app.use('/', authRoutes);
app.use('/', publicRoutes);
app.use('/student', studentRoutes);

io.on('connection', (socket) => {
  socket.emit('foundation:ready', { status: 'ok' });
});

app.use((request, response) => {
  response.status(404).render('error', {
    statusCode: 404,
    message: 'Page not found.'
  });
});

app.use((error, request, response, next) => {
  console.error(error);

  if (response.headersSent) {
    return next(error);
  }

  response.status(500).render('error', {
    statusCode: 500,
    message: 'Something went wrong.'
  });
});

if (require.main === module) {
  server.listen(port, () => {
    console.log(`Customer service system listening on port ${port}`);
  });
}

module.exports = { app, io, server };
