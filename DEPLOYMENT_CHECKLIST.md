# Render Deployment Checklist

## Required Environment Variables

### Essential (App won't start without these):
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random secret for sessions (generate with: `openssl rand -base64 32`)
- `GEMINI_API_KEY` - Google Gemini API key for AI content generation

### Google OAuth (Required for login):
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- **Important**: Add authorized redirect URI in Google Console:
  - `https://your-app-name.onrender.com/api/auth/google/callback`

### Stripe (Required for payments):
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### Optional:
- `ADMIN_EMAILS` - Comma-separated list of admin emails
- `NODE_ENV` - Set to `production` (usually auto-set by Render)

## Google OAuth Setup Steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs:
   - Add: `http://localhost:5000/api/auth/google/callback` (for local dev)
   - Add: `https://your-app.onrender.com/api/auth/google/callback` (for production)
7. Copy Client ID and Client Secret to Render environment variables

## Common Issues:

### 502 Error on Login
**Cause**: Google OAuth not configured or callback URL mismatch
**Fix**:
1. Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Render
2. Verify callback URL in Google Console matches your Render URL exactly
3. Redeploy after adding environment variables

### Session Store Errors
**Cause**: DATABASE_URL not set or database not provisioned
**Fix**: Ensure PostgreSQL database is attached and DATABASE_URL is set

### Topic Generation Fails
**Cause**: Missing GEMINI_API_KEY
**Fix**: Add Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
