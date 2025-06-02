const csrf = require('csurf');

// CSRF koruma middleware'i
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Middleware'i dışa aktarma
module.exports = csrfProtection; 