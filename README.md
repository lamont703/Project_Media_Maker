# Google Veo2 Image Animator

A full-stack web application that transforms static images into animated videos using Google's Veo2 API. Built with Node.js, Express, and vanilla JavaScript.

## Features

- 🎨 Beautiful, modern web interface
- 📸 Drag & drop image upload
- ✨ Real-time generation status
- 🎬 Multiple aspect ratios and durations
- 📥 Download generated videos
- 🚀 Fast and responsive

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure API credentials (optional):**

   Create a `.env` file (optional - defaults are already set):

   ```env
   API_KEY=your_api_key_here
   PROJECT_ID=your_project_id_here
   LOCATION=us-central1
   PORT=3000
   ```

3. **Start the server:**

   ```bash
   npm start
   ```

   Or for development with auto-reload:

   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. **Upload an image**: Click the upload area or drag and drop an image file (JPG, PNG, or WEBP)
2. **Enter a prompt**: Describe how you want to animate the image
3. **Configure settings**: Choose aspect ratio and duration
4. **Generate**: Click "Animate Image" and wait for the video to be generated
5. **Download**: Once complete, preview and download your animated video

## Example Prompts

- "A gentle breeze moves through the scene, leaves rustling softly"
- "Waves crash on the shore with seagulls flying overhead"
- "Clouds drift slowly across the sky"
- "The sun rises, casting warm golden light across the landscape"
- "Raindrops fall gently on the window"

## Project Structure

```
.
├── server.js              # Express server
├── veo2-animator.js       # Veo2 API client
├── package.json           # Dependencies
├── public/
│   ├── index.html        # Frontend HTML
│   ├── styles.css        # Styling
│   └── script.js         # Frontend JavaScript
├── uploads/              # Temporary image storage (auto-created)
└── outputs/              # Generated videos (auto-created)
```

## API Endpoints

- `GET /` - Serve the web interface
- `POST /api/animate` - Start video generation
- `GET /api/status/:jobId` - Check generation status
- `GET /api/video/:jobId` - Download generated video

## Notes

- Video generation may take several minutes
- Supported image formats: JPG, JPEG, PNG, WEBP
- Maximum file size: 10MB
- Generated videos are stored in the `outputs/` directory
- Uploaded images are automatically cleaned up after processing

## Troubleshooting

- **Port already in use**: Change the PORT in `.env` or modify `server.js`
- **API errors**: Verify your API key and project ID are correct
- **File upload fails**: Check file size and format restrictions
