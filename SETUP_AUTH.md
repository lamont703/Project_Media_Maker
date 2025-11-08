# Authentication Setup for Google Veo2

The terminal shows your UI **IS working** - it's receiving requests! However, you're getting a 401 authentication error because Google Vertex AI requires OAuth 2.0 authentication, not just an API key.

## What the Terminal Shows:

✅ **UI is working** - Request received with your prompt  
✅ **Image uploaded** - 2.44 MB image processed  
❌ **Authentication failed** - Need OAuth 2.0 token

## Setup Options:

### Option 1: Application Default Credentials (Easiest)

1. Install Google Cloud SDK if you haven't:

   ```bash
   # macOS
   brew install google-cloud-sdk
   ```

2. Authenticate:

   ```bash
   gcloud auth application-default login
   ```

3. Set your project:
   ```bash
   gcloud config set project gen-lang-client-0225653171
   ```

### Option 2: Service Account JSON Key

1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Set the path in your `.env` file or update `server.js` to use the JSON path

## After Setup:

Restart your server:

```bash
npm start
```

The code now:

- ✅ Uses OAuth 2.0 authentication
- ✅ Tries Veo 2.5 first, falls back to 2.0 if not available
- ✅ Shows detailed logging in terminal
