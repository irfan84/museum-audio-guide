const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Make sure the uploads folder exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure where and how files are stored
const storage = multer.diskStorage({

  // Save files into uploads/audio/ subfolder
  destination: (req, file, cb) => {
    const audioDir = path.join(uploadDir, 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    cb(null, audioDir);
  },

  // Create a unique filename: exhibitId_language_timestamp.mp3
  // Example: 1_ur_1716823445123.mp3
  filename: (req, file, cb) => {
    const exhibitId    = req.params.id || 'unknown';
    const languageCode = req.body.language_code || 'en';
    const timestamp    = Date.now();
    const ext          = path.extname(file.originalname).toLowerCase();
    cb(null, `${exhibitId}_${languageCode}_${timestamp}${ext}`);
  }
});

// Only allow audio file types
const fileFilter = (req, file, cb) => {
  const allowed = ['.mp3', '.wav', '.m4a', '.ogg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);   // Accept the file
  } else {
    cb(new Error('Only audio files are allowed: mp3, wav, m4a, ogg'), false);
  }
};

// 50MB max file size — enough for even long exhibit audio
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = upload;