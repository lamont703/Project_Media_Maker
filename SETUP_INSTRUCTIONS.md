# Setup Instructions for Google Veo2 Authentication

## Option 1: Application Default Credentials (Recommended)

### Step 1: Install Google Cloud SDK

**Option A: Using Homebrew (if it works):**

```bash
brew install google-cloud-sdk
```

**Option B: Manual Installation:**

1. Download the installer from: https://cloud.google.com/sdk/docs/install
2. Run the installer
3. Follow the prompts

**Option C: Use Standalone gcloud (no Python dependency):**

```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 2: Authenticate

Once gcloud is installed, run:

```bash
gcloud auth application-default login
```

This will:

- Open a browser window
- Ask you to sign in with your Google account
- Grant permissions for Application Default Credentials

### Step 3: Set Your Project

```bash
gcloud config set project gen-lang-client-0225653171
```

### Step 4: Restart Your Server

```bash
npm start
```

## Option 2: Service Account (Alternative)

If you can't install gcloud, you can use a service account:

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Navigate to: IAM & Admin > Service Accounts
3. Create a new service account or use an existing one
4. Create a JSON key for the service account
5. Download the JSON file
6. Update `server.js` to pass the path to the JSON file instead of the API key

## Verify Authentication

After setup, try uploading an image again. The terminal should show:

- ✅ Authentication successful
- ✅ API request successful
- No more 401 errors

## Troubleshooting

**If you see "command not found: gcloud":**

- Make sure gcloud is in your PATH
- Try: `export PATH="/usr/local/share/google-cloud-sdk/bin:$PATH"`
- Or restart your terminal

**If authentication still fails:**

- Check that you're using the correct Google account
- Verify the project ID is correct
- Make sure Vertex AI API is enabled in your project
