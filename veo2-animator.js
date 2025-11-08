import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

export class Veo2Animator {
  constructor(apiKey, projectId, location = 'us-central1') {
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.location = location;
    
    // Set API key as environment variable for SDK
    process.env.GOOGLE_API_KEY = apiKey;
    
    // Initialize Google GenAI with API key
    // Explicitly disable Vertex AI mode to force API key usage
    this.ai = new GoogleGenAI({ 
      apiKey: apiKey,
      vertexai: false  // Disable Vertex AI mode to use API key directly
    });
    console.log(`🔑 Using Gemini API with API key authentication`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  }

  /**
   * Encode image file to base64 string
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<{imageBytes: string, mimeType: string}>} Image data
   */
  async encodeImage(imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    // Get MIME type from file extension
    const imageExt = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    const mimeType = mimeTypes[imageExt] || 'image/jpeg';
    
    return {
      imageBytes: imageBase64,
      mimeType: mimeType
    };
  }

  /**
   * Poll operation until complete
   * @param {Object} operation - Operation object from API
   * @param {number} pollInterval - Seconds between polls (default: 10)
   * @returns {Promise<Object>} Completed operation
   */
  async pollOperation(operation, pollInterval = 10) {
    console.log('⏳ Waiting for video generation...');
    
    let pollCount = 0;
    while (!operation.done) {
      pollCount++;
      console.log(`⏳ Still processing... (poll #${pollCount}, checking again in ${pollInterval} seconds)`);
      await new Promise(resolve => setTimeout(resolve, pollInterval * 1000));
      
      // Refresh the operation object to get the latest status
      operation = await this.ai.operations.getVideosOperation({
        operation: operation,
      });
    }
    
    console.log(`✅ Operation completed after ${pollCount} polls`);
    return operation;
  }

  /**
   * Download video from API
   * @param {Object} videoFile - Video file object from API
   * @param {string} outputPath - Path to save the video
   */
  async downloadVideo(videoFile, outputPath) {
    console.log(`📥 Downloading video...`);
    
    try {
      await this.ai.files.download({
        file: videoFile,
        downloadPath: outputPath,
      });
      
      const stats = fs.statSync(outputPath);
      console.log(`✅ Video downloaded and saved to: ${outputPath}`);
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Main method to animate an image
   * @param {string} prompt - Text prompt describing the animation
   * @param {string} imagePath - Path to the image file
   * @param {string} outputPath - Path to save the output video
   * @param {string} aspectRatio - Video aspect ratio (default: "16:9")
   * @param {string} duration - Video duration in seconds (default: "8")
   * @returns {Promise<string>} Path to the generated video
   */
  async animateImage(prompt, imagePath, outputPath, aspectRatio = '16:9', duration = '8') {
    console.log(`📤 Encoding image: ${imagePath}`);
    const imageData = await this.encodeImage(imagePath);
    console.log(`✅ Image encoded (${(imageData.imageBytes.length / 1024).toFixed(2)} KB base64)`);

    // Convert duration string to number if needed
    let durationSeconds = typeof duration === 'string' ? parseInt(duration.replace('s', '')) : duration;
    
    // Ensure it's a valid number (4, 6, or 8 for Veo 3.1)
    if (isNaN(durationSeconds) || ![4, 6, 8].includes(durationSeconds)) {
      console.log(`⚠️  Invalid duration ${durationSeconds}, defaulting to 8 seconds`);
      durationSeconds = 8;
    }
    
    // Convert aspect ratio format if needed (e.g., "16:9" -> "16:9")
    const aspectRatioFormatted = aspectRatio.includes(':') ? aspectRatio : `${aspectRatio}:9`;

    console.log(`🌐 Sending request to Veo 3.1 API...`);
    console.log(`📝 Prompt: "${prompt}"`);
    console.log(`⚙️  Parameters: ${aspectRatioFormatted} aspect, ${durationSeconds}s duration`);

    try {
      // Verify API key is available
      const apiKeyFromClient = this.ai.apiClient?.getApiKey?.();
      if (!apiKeyFromClient) {
        console.log(`⚠️  Warning: API key not found in client, using stored key`);
        // Try to set it again
        this.ai = new GoogleGenAI({ 
          apiKey: this.apiKey,
          vertexai: false
        });
      } else {
        console.log(`✅ API key verified in client: ${apiKeyFromClient.substring(0, 10)}...`);
      }
      
      // Start video generation with image
      // IMPORTANT: durationSeconds must be a NUMBER, not a string!
      let operation = await this.ai.models.generateVideos({
        model: "veo-3.1-generate-preview",
        prompt: prompt,
        image: {
          imageBytes: imageData.imageBytes,
          mimeType: imageData.mimeType,
        },
        config: {
          aspectRatio: aspectRatioFormatted,
          durationSeconds: durationSeconds, // Pass as number, not string!
        },
      });

      console.log(`✅ Video generation started`);
      console.log(`🆔 Operation: ${operation.name || 'N/A'}`);

      // Poll until complete
      operation = await this.pollOperation(operation);

      // Check if operation was successful
      if (!operation.response || !operation.response.generatedVideos || operation.response.generatedVideos.length === 0) {
        throw new Error('No video generated in response');
      }

      const videoFile = operation.response.generatedVideos[0].video;
      console.log(`✅ Video data received from API`);

      // Download the video
      console.log(`💾 Saving video to: ${outputPath}`);
      await this.downloadVideo(videoFile, outputPath);

      return outputPath;
    } catch (error) {
      console.error(`❌ Error during video generation:`, error.message);
      
      // Provide helpful error messages
      if (error.message && error.message.includes('API Key not found')) {
        console.error(`\n🔍 Troubleshooting API Key Issues:`);
        console.error(`   1. Verify your API key is valid: ${this.apiKey.substring(0, 10)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
        console.error(`   2. Make sure the API key has access to the Veo API`);
        console.error(`   3. Check if the API key is enabled in Google Cloud Console`);
        console.error(`   4. Verify the API key hasn't been restricted or revoked\n`);
      }
      
      throw error;
    }
  }

  /**
   * Extend a previously generated Veo video
   * @param {string} prompt - Text prompt describing how to extend the video
   * @param {string} videoPath - Path to the existing Veo-generated video file
   * @param {string} outputPath - Path to save the extended video
   * @param {string} aspectRatio - Video aspect ratio (default: "16:9")
   * @param {string} resolution - Video resolution (default: "720p")
   * @returns {Promise<string>} Path to the extended video
   */
  async extendVideo(prompt, videoPath, outputPath, aspectRatio = '16:9', resolution = '720p') {
    console.log(`📤 Reading video file: ${videoPath}`);
    
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Read and encode the video file
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBase64 = videoBuffer.toString('base64');
    const videoStats = fs.statSync(videoPath);
    
    console.log(`✅ Video encoded (${(videoBase64.length / 1024 / 1024).toFixed(2)} MB base64)`);
    console.log(`📊 Original video size: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Convert aspect ratio format if needed
    const aspectRatioFormatted = aspectRatio.includes(':') ? aspectRatio : `${aspectRatio}:9`;

    console.log(`🌐 Sending video extension request to Veo 3.1 API...`);
    console.log(`📝 Extension prompt: "${prompt}"`);
    console.log(`⚙️  Parameters: ${aspectRatioFormatted} aspect, ${resolution} resolution`);

    try {
      // Verify API key is available
      const apiKeyFromClient = this.ai.apiClient?.getApiKey?.();
      if (!apiKeyFromClient) {
        console.log(`⚠️  Warning: API key not found in client, using stored key`);
        this.ai = new GoogleGenAI({ 
          apiKey: this.apiKey,
          vertexai: false
        });
      } else {
        console.log(`✅ API key verified in client: ${apiKeyFromClient.substring(0, 10)}...`);
      }
      
      // Start video extension
      // Note: Veo 3.1 extends videos by 7 seconds, up to 20 times
      let operation = await this.ai.models.generateVideos({
        model: "veo-3.1-generate-preview",
        prompt: prompt,
        video: {
          videoBytes: videoBase64,
          mimeType: "video/mp4",
        },
        config: {
          aspectRatio: aspectRatioFormatted,
          resolution: resolution,
          number_of_videos: 1,
        },
      });

      console.log(`✅ Video extension started`);
      console.log(`🆔 Operation: ${operation.name || 'N/A'}`);

      // Poll until complete
      operation = await this.pollOperation(operation);

      // Check if operation was successful
      if (!operation.response || !operation.response.generatedVideos || operation.response.generatedVideos.length === 0) {
        throw new Error('No extended video generated in response');
      }

      const videoFile = operation.response.generatedVideos[0].video;
      console.log(`✅ Extended video data received from API`);

      // Download the extended video
      console.log(`💾 Saving extended video to: ${outputPath}`);
      await this.downloadVideo(videoFile, outputPath);

      return outputPath;
    } catch (error) {
      console.error(`❌ Error during video extension:`, error.message);
      
      // Provide helpful error messages
      if (error.message && error.message.includes('API Key not found')) {
        console.error(`\n🔍 Troubleshooting API Key Issues:`);
        console.error(`   1. Verify your API key is valid: ${this.apiKey.substring(0, 10)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
        console.error(`   2. Make sure the API key has access to the Veo API`);
        console.error(`   3. Check if the API key is enabled in Google Cloud Console`);
        console.error(`   4. Verify the API key hasn't been restricted or revoked\n`);
      }
      
      throw error;
    }
  }
}
