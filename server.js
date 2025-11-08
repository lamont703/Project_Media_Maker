import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { Veo2Animator } from './veo2-animator.js';

// Set API key as environment variable for SDK to pick up
const API_KEY = process.env.API_KEY || //use your gemini api key here as a string;
process.env.GOOGLE_API_KEY = API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Veo2Animator with your API key (Gemini API uses API keys directly!)
const animator = new Veo2Animator(
  API_KEY,
  process.env.PROJECT_ID || //use your google projectid here as a string, // Not used by Gemini API but kept for compatibility
  process.env.LOCATION || 'us-central1' // Not used by Gemini API but kept for compatibility
);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Animate image endpoint
app.post('/api/animate', upload.single('image'), async (req, res) => {
  try {
    console.log('\n📥 New animation request received');
    
    if (!req.file) {
      console.log('❌ Error: No image file provided');
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { prompt, aspectRatio = '16:9', duration = '8' } = req.body;

    console.log(`📝 Prompt: "${prompt}"`);
    console.log(`🎬 Settings: ${aspectRatio} aspect ratio, ${duration}s duration`);
    console.log(`📸 Image: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    if (!prompt) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      console.log('❌ Error: Prompt is required');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const imagePath = req.file.path;
    const outputDir = 'outputs';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(
      outputDir,
      `animated-${Date.now()}-${path.basename(imagePath, path.extname(imagePath))}.mp4`
    );

    const jobId = path.basename(outputPath, '.mp4');
    console.log(`🆔 Job ID: ${jobId}`);
    console.log(`💾 Output path: ${outputPath}`);
    console.log('🚀 Starting video generation...\n');

    // Start animation (this is async and may take time)
    res.json({
      status: 'processing',
      message: 'Video generation started. This may take several minutes.',
      jobId: jobId
    });

    // Process animation in background
    animator.animateImage(
      prompt,
      imagePath,
      outputPath,
      aspectRatio,
      duration
    )
      .then((resultPath) => {
        // Clean up uploaded image after processing
        fs.unlinkSync(imagePath);
        console.log(`\n✅ Video generated successfully!`);
        console.log(`📹 File: ${resultPath}`);
        console.log(`📊 Size: ${(fs.statSync(resultPath).size / 1024 / 1024).toFixed(2)} MB\n`);
      })
      .catch((error) => {
        console.error('\n❌ Animation error:', error.message);
        console.error('Stack:', error.stack);
        // Clean up on error
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });

  } catch (error) {
    console.error('Error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Poll for video status
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const outputPath = path.join('outputs', `${jobId}.mp4`);

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`✅ Status check: Job ${jobId} completed`);
    res.json({
      status: 'completed',
      videoUrl: `/api/video/${jobId}`,
      fileSize: stats.size,
      createdAt: stats.birthtime
    });
  } else {
    res.json({ status: 'processing' });
  }
});

// Serve generated videos
app.get('/api/video/:jobId', (req, res) => {
  const { jobId } = req.params;
  const videoPath = path.join('outputs', `${jobId}.mp4`);

  if (fs.existsSync(videoPath)) {
    res.sendFile(path.resolve(videoPath));
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📸 Upload images and animate them with Google Veo2!`);
});

