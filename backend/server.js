// backend/server.js
require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const helmet       = require('helmet');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csurf        = require('csurf');
const path         = require('path');
const http         = require('http');
const { Server }   = require('socket.io');
const visitorTracker = require('./middleware/visitors');

const authRouter          = require('./routes/auth');
const analysisRouter      = require('./routes/analysis');
const chatRouter          = require('./routes/chat');
const announcementsRouter = require('./routes/announcements');
const visitorsRouter      = require('./routes/visitors');
const galleryRouter       = require('./routes/gallery');
const sitemapRouter       = require('./routes/sitemap');
const usersRouter         = require('./routes/users');
const jobsRouter          = require('./routes/jobs');
const { auth, isAdmin }   = require('./middleware/auth');
const csrfProtection      = require('./middleware/csrf');

const app = express();
const server = http.createServer(app);

// Socket.IO kurulumu
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Online kullanıcıları takip etmek için Set kullanıyoruz
let onlineUsers = new Set();

io.on('connection', (socket) => {
  console.log('✨ Bir kullanıcı bağlandı');

  // Kullanıcı bağlandığında (örneğin giriş yaptıktan sonra kimlik bilgisi gönderdiğinde) online listesine ekleyebiliriz
  // Şimdilik sadece socket ID'sini ekleyelim veya daha sonra kullanıcı ID'si ile değiştirelim
  onlineUsers.add(socket.id);
  console.log('Toplam online kullanıcı:', onlineUsers.size);

  // Tüm bağlı kullanıcılara online sayısını gönder
  io.emit('onlineUsers', onlineUsers.size);

  socket.on('disconnect', () => {
    console.log('💔 Bir kullanıcı ayrıldı');
    // Kullanıcı ayrıldığında listeden çıkar
    onlineUsers.delete(socket.id);
    console.log('Toplam online kullanıcı:', onlineUsers.size);
    // Tüm bağlı kullanıcılara online sayısını gönder
    io.emit('onlineUsers', onlineUsers.size);
  });

  // İsteğe bağlı: Kullanıcı kimlik doğrulaması yapıldıktan sonra kullanıcı ID'sini alıp takip edebiliriz
  // socket.on('authenticate', (userId) => {
  //   onlineUsers.delete(socket.id); // Geçici ID'yi kaldır
  //   onlineUsers.add(userId); // Kullanıcı ID'sini ekle
  //   io.emit('onlineUsers', onlineUsers.size);
  // });
});

// 1) MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser:true,
  useUnifiedTopology:true
})
.then(() => console.log('✅ MongoDB bağlı'))
.catch(e => console.error('❌ DB hata:', e));

console.log('TRACE: After MongoDB connection'); // TRACE 1

// 2) Güvenlik & Parsers
app.use(helmet());
console.log('TRACE: After Helmet'); // TRACE 2
app.use(express.json({ limit:'10mb' }));
console.log('TRACE: After express.json'); // TRACE 3
app.use(express.urlencoded({ extended:true, limit:'10mb' }));
console.log('TRACE: After express.urlencoded'); // TRACE 4
app.use(cookieParser());
console.log('TRACE: After cookieParser'); // TRACE 5

// CORS ayarları
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-New-Token'],
  exposedHeaders: ['X-CSRF-Token', 'X-New-Token']
};
app.use(cors(corsOptions));
console.log('TRACE: After CORS'); // TRACE 6

// Middleware
// Use visitor tracker middleware for every request
app.use(visitorTracker);
console.log('TRACE: After visitorTracker'); // TRACE 7

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 1000, // 15 dakikada 1000 istek
  message: 'Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin.'
});

// Auth rotaları için daha katı rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 500, // 15 dakikada 500 istek (Artırıldı)
  message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
});

// Rate limiter'ı sadece production'da aktif et
// if (process.env.NODE_ENV === 'production') {
//   app.use(limiter);
// }

// 3) CSRF middleware and Auth routes setup

// Apply authLimiter to all /api/auth routes
app.use('/api/auth', authLimiter);
console.log('TRACE: After authLimiter (/api/auth)'); // TRACE 8 Updated

// CSRF token endpoint - Apply csrfProtection directly to this GET route
// This needs csrfProtection to be applied to generate the token
app.get('/api/auth/csrf-token', csrfProtection, (req, res) => {
    console.log('TRACE: Hit /api/auth/csrf-token endpoint'); // TRACE 9 Updated
    res.json({ csrfToken: req.csrfToken() });
});

// Main /api/auth router block
// Apply auth middleware conditionally to protected routes within authRouter
// Login and register are handled by authRouter without auth middleware here
app.use('/api/auth', authRouter); // Mount authRouter last in this chain
console.log('TRACE: After mounting /api/auth block'); // TRACE 11 Updated

// 7) Diğer korunmuş rotalar (auth ve/veya isAdmin middleware'leri ile birlikte)
// Bu rotalar için auth/isAdmin ve CSRF koruması (yukarıdaki genel uygulama ile) geçerlidir.
// Apply general CSRF protection to all other routes that need it (e.g., protected POST/PUT/DELETE)
// This assumes other protected routes also need CSRF in addition to auth/isAdmin
// app.use(csrfProtection); // Apply to all routes after auth block if needed

// Example of applying CSRF to specific protected routes if needed
// app.use('/api/analysis', csrfProtection, auth, analysisRouter);
// app.use('/api/chat', csrfProtection, auth, chatRouter);
// ... apply similarly to other protected routes that modify data

// Reverting to simpler auth middleware application for other routes as it was before
app.use('/api/analysis', auth, analysisRouter);
app.use('/api/chat', auth, chatRouter);
app.use('/api/announcements', auth, announcementsRouter);
app.use('/api/visitors', auth, visitorsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/users', auth, isAdmin, usersRouter);
app.use('/api/jobs', jobsRouter);
console.log('TRACE: After mounting other protected routes'); // TRACE 12 Updated

// Sitemap rotası
app.use('/', sitemapRouter);
console.log('TRACE: After mounting sitemap route'); // TRACE 13 Updated

// 8) Static uploads
app.use('/uploads', express.static(path.join(__dirname,'uploads')));
console.log('TRACE: After static uploads'); // TRACE 14 Updated

// 9) 404 & Error Handler
app.use((req, res) => {
  console.log(`TRACE: Hit 404 handler for path: ${req.path}`); // TRACE 15 Updated
  res.status(404).json({ error:'Sayfa bulunamadı' });
});

app.use((err, _req, res, _next) => {
  console.error('TRACE: Hit Error Handler', err.stack); // TRACE 16 Updated
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ 
      success: false,
      error: 'Geçersiz CSRF',
      message: 'Güvenlik doğrulaması başarısız. Lütfen sayfayı yenileyip tekrar deneyin.'
    });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      success: false,
      error: 'Geçersiz token',
      message: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.'
    });
  }
  res.status(err.status || 500).json({ 
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Sunucu hatası' : err.message,
    message: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
  });
});

// 10) Başlat
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: ${process.env.BACKEND_URL || 'http://localhost'}:${PORT}`);
});
