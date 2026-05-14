const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();

const db = require('./db/index');
const { authenticateToken } = require('./middleware/auth');

const exhibitRoutes = require('./routes/exhibits');
const eventRoutes   = require('./routes/events');
const adminRoutes   = require('./routes/admin');
const authRoutes    = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// Allow cross-origin audio file loading from mobile app
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded audio files — before routes so audio loads correctly
app.use('/uploads', express.static(
  process.env.UPLOAD_DIR || './uploads'
));

// Public routes — no login required
app.use('/api/exhibits', exhibitRoutes);
app.use('/api/events',   eventRoutes);
app.use('/api/auth',     authRoutes);

// Protected routes — JWT required for ALL admin endpoints
app.use('/api/admin', authenticateToken, adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'PMNH Audio Guide API' });
});

app.listen(PORT, () => {
  console.log(`PMNH API running on http://localhost:${PORT}`);
});