const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();

const db = require('./db/index');

// Route imports  ← NEW
const exhibitRoutes = require('./routes/exhibits');
const eventRoutes   = require('./routes/events');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes  ← NEW
app.use('/api/exhibits', exhibitRoutes);
app.use('/api/events',   eventRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'PMNH Audio Guide API' });
});

app.listen(PORT, () => {
  console.log(`PMNH API running on http://localhost:${PORT}`);
});