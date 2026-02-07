# Google OAuth Setup for basics-lcdq.onrender.com

## ✅ Your Configuration

Get your credentials from the Google Cloud Console JSON file.

**Do NOT commit credentials to git!** Add them only to Render environment variables.

## 🔧 Step 1: Update Google Console Redirect URI

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find: `Web client 1` (Client ID: 761672172172...)
3. Click to edit
4. Under **"Authorized redirect URIs"**, add these **two** URIs:

   ```
   https://basics-lcdq.onrender.com/api/auth/google/callback
   http://localhost:5000/api/auth/google/callback
   ```

5. Remove the placeholder: `https://your-app.onrender.com/api/auth/google/callback`
6. Click **"Save"**

## 🔐 Step 2: Add to Render Environment Variables

### Method A: Via Render Dashboard (Recommended)

1. Go to: https://dashboard.render.com/
2. Select service: **basics-lcdq**
3. Click: **"Environment"** (left sidebar)
4. Add these variables (use YOUR credentials from Google Console):

   ```
   GOOGLE_CLIENT_ID = your_client_id_from_google_console.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET = GOCSPX-your_client_secret_here
   ```

5. Click **"Save Changes"**
6. Render will auto-redeploy

### Method B: Via Render CLI (Advanced)

```bash
# Install CLI
npm install -g @render-oss/cli

# Login
render login

# Set variables (replace with YOUR credentials)
render env set GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
render env set GOOGLE_CLIENT_SECRET="GOCSPX-your_secret_here"

# Trigger deploy
render deploy
```

## ✅ Step 3: Test Login

After deployment completes (~3-5 minutes):

1. Go to: https://basics-lcdq.onrender.com
2. Click **"Sign In"**
3. Should redirect to Google OAuth screen
4. After login, redirects back to your app
5. You should be logged in! ✅

## 🔍 Troubleshooting

### Login Still Returns 502?

Check logs:
```bash
# View Render logs
npm run deploy:check
```

Or manually at: https://dashboard.render.com/web/[your-service-id]/logs

### Common Issues:

1. **"redirect_uri_mismatch"**
   - Redirect URI in Google Console doesn't match exactly
   - Make sure: `https://basics-lcdq.onrender.com/api/auth/google/callback`

2. **"Invalid client"**
   - Client ID or Secret is incorrect
   - Double-check values in Render dashboard

3. **502 Bad Gateway**
   - Environment variables not set in Render
   - Service still deploying (wait 3-5 minutes)

## 🗑️ Security: Clean Up

After successful setup:

1. **Delete** the downloaded JSON file:
   ```
   C:\Users\dilli\Downloads\client_secret_761672172172...json
   ```

2. **Never commit** credentials to git (already protected by .gitignore)

3. Environment variables are encrypted in Render ✅

## 📊 Validate Configuration

Before deployment, validate locally:

```bash
# Check if all env vars are set
npm run validate:env

# Check deployment status
npm run deploy:check
```

---

**Your Production URL**: https://basics-lcdq.onrender.com
**Redirect URI**: https://basics-lcdq.onrender.com/api/auth/google/callback
