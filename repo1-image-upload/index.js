const express = require('express');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Create uploads and outputs directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir);

// Serve processed images statically
app.use('/outputs', express.static(outputsDir));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// The /upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const apiKey = process.env.BACKGROUND_API_KEY;
  if (!apiKey || apiKey === 'your_openai_key_here') {
    return res.status(500).json({ error: 'API key is not configured. Please set BACKGROUND_API_KEY in .env' });
  }

  const originalFilePath = req.file.path;
  const outputFileName = `${path.parse(req.file.filename).name}.png`;
  const outputFilePath = path.join(outputsDir, outputFileName);

  try {
    // **Step 1: Background Removal (Simulated API Call)**
    // In a real scenario, you would send the image to the API.
    // Here, we simulate a successful API call by reading the uploaded file.
    // const apiResponse = await axios.post('https://api.openai.com/v1/images/edits' /* or a real background removal API */, {
    //   // ... form-data with image and parameters
    // }, {
    //   headers: { 'Authorization': `Bearer ${apiKey}` }
    // });
    // const imageBuffer = Buffer.from(apiResponse.data, 'binary');

    // For this example, we'll just use the uploaded file directly.
    const imageBuffer = fs.readFileSync(originalFilePath);

    // **Step 2: Image Normalization (Resize and Convert)**
    await sharp(imageBuffer)
      .resize(512, 512, {
        fit: 'inside', // maintain aspect ratio
        withoutEnlargement: true,
      })
      .toFormat('png')
      .toFile(outputFilePath);

    // **Step 3: Clean up original upload**
    fs.unlinkSync(originalFilePath);

    // **Step 4: Return success response**
    const processedImageUrl = `${req.protocol}://${req.get('host')}/outputs/${outputFileName}`;
    res.status(200).json({
      message: 'Image processed successfully',
      originalFilename: req.file.originalname,
      processedImageUrl: processedImageUrl,
    });

  } catch (error) {
    console.error('Error processing image:', error);
    // Clean up original file on error
    if (fs.existsSync(originalFilePath)) {
        fs.unlinkSync(originalFilePath);
    }
    res.status(500).json({ error: 'Failed to process image.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
