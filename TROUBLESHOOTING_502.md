# Troubleshooting 502 Bad Gateway on OAuth Callback

## 🔍 What's Happening

You're seeing a 502 error at:
```
https://basics-lcdq.onrender.com/api/auth/google/callback
```

This means:
- ✅ Google OAuth worked (you were redirected back)
- ❌ Your Render service is down/crashed/not responding

## 🚨 Quick Checks

### 1. Check if Service is Running

Go to: https://dashboard.render.com/web/[your-service-id]

Look for:
- **Status**: Should be "Live" (green)
- If it says "Deploy failed" or "Build failed" → Deployment error
- If it says "Service unhealthy" → Runtime crash

### 2. Check Deployment Logs

**Dashboard → Your Service → Logs**

Look for these common errors:

#### Missing Environment Variables
```
Error: GEMINI_API_KEY is required
Configuration Error: Missing required environment variables
```
**Fix**: Add missing env vars in Environment tab

#### Database Connection Failed
```
Error: connect ECONNREFUSED
PostgreSQL connection failed
```
**Fix**: Ensure DATABASE_URL is set and database is provisioned

#### Port Binding Failed
```
Error: listen EADDRINUSE :::5000
Port already in use
```
**Fix**: Render should auto-assign port, but check if PORT env var is set correctly

#### Out of Memory
```
JavaScript heap out of memory
```
**Fix**: Upgrade Render plan or optimize build

### 3. Required Environment Variables

Your service needs these to start:

```bash
# Essential - App won't start without these
DATABASE_URL=postgresql://...              # Auto-set by Render
SESSION_SECRET=<random_string>             # Generate: openssl rand -base64 32
GEMINI_API_KEY=<your_key>                  # From Google AI Studio

# OAuth - Needed for login (use YOUR credentials from Google Console)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here

# Optional but recommended
ADMIN_EMAILS=your@email.com
```

### 4. Manual Service Restart

If service is "Live" but not responding:

**Dashboard → Your Service → Settings → Restart Service**

Wait 2-3 minutes for restart to complete.

## 🔧 How to Fix

### Option A: Check Render Dashboard (Recommended)

1. Go to https://dashboard.render.com/
2. Select your service
3. Click **"Logs"** tab
4. Look for error messages (red text)
5. Copy error and search below for solution

### Option B: Use CLI to Check Status

```bash
# Install Render CLI
npm install -g @render-oss/cli

# Login
render login

# View logs
render logs --service-id srv-xxxxx --follow
```

## 🐛 Common Errors & Solutions

### Error: "Google OAuth not configured"
**Cause**: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set
**Fix**: Add both env vars in Render dashboard

### Error: "Failed to connect to database"
**Cause**: DATABASE_URL not set or database not provisioned
**Fix**:
1. Ensure PostgreSQL database is attached to service
2. DATABASE_URL should be auto-set
3. Check database is not suspended (free tier limitation)

### Error: "SESSION_SECRET is required"
**Cause**: Missing SESSION_SECRET
**Fix**:
```bash
# Generate random secret
openssl rand -base64 32

# Add to Render env vars
SESSION_SECRET=<generated_string>
```

### Error: "GEMINI_API_KEY is required"
**Cause**: Missing API key for AI content generation
**Fix**:
1. Get key from https://makersuite.google.com/app/apikey
2. Add to Render: `GEMINI_API_KEY=your_key_here`

### Service keeps crashing after deploy
**Check**:
1. Build succeeded? (Green checkmark)
2. All env vars set?
3. Database provisioned and running?
4. Enough memory? (Free tier has 512MB limit)

## ✅ Verification Steps

After fixing issues:

1. **Trigger Redeploy**:
   - Dashboard → Manual Deploy → "Deploy latest commit"

2. **Wait for deployment** (3-5 minutes)

3. **Check logs during startup**:
   ```
   Starting database migration...
   Migration completed successfully!
   Server listening on port 10000
   ```

4. **Test homepage**: https://basics-lcdq.onrender.com
   - Should load (not 502)

5. **Test login**: Click "Sign In"
   - Should redirect to Google
   - After auth, redirect back to homepage
   - No 502 error ✅

## 📞 Still Getting 502?

Share your Render deployment logs and I'll help debug specifically!

To get logs:
1. Dashboard → Your Service → Logs
2. Copy last 50-100 lines
3. Share with error messages (red text)
