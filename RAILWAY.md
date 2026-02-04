# BasicsTutor - Railway Deployment Guide

This project is ready for deployment on Railway.

## 1. Prerequisites

You need accounts on:
- [Railway](https://railway.app)
- [Google Cloud Console](https://console.cloud.google.com) (for OAuth & Gemini)
- [Stripe](https://dashboard.stripe.com)

## 2. Environment Variables

Set these variables in your Railway project settings:

### Database (Railway handles this automatically if you add a Postgres plugin)
- `DATABASE_URL`: (Railway will set this)

### Authentication (Google OAuth)
- `GOOGLE_CLIENT_ID`: From Google Cloud Console -> APIs & Services -> Credentials
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `SESSION_SECRET`: A long random string (e.g. `openssl rand -hex 32`)

### AI (Gemini)
- `AI_INTEGRATIONS_GEMINI_API_KEY`: Your Gemini API Key
- `AI_INTEGRATIONS_GEMINI_BASE_URL`: (Optional, usually blank for default Google API)

### Payments (Stripe)
- `STRIPE_SECRET_KEY`: `sk_live_...` (or `sk_test_...` for testing)
- `STRIPE_PUBLISHABLE_KEY`: `pk_live_...` (or `pk_test_...`)
- `STRIPE_WEBHOOK_SECRET`: `whsec_...` (From Stripe Dashboard -> Developers -> Webhooks)

### Application
- `NODE_ENV`: `production`
- `PORT`: `5000` (Railway usually detects this, but good to set)

## 3. Post-Deployment Steps

1.  **Google OAuth Callback**:
    In Google Cloud Console, add this Authorized Redirect URI:
    `https://<your-railway-app-url>/api/auth/google/callback`

2.  **Stripe Webhook**:
    In Stripe Dashboard, add a webhook endpoint:
    URL: `https://<your-railway-app-url>/api/stripe/webhook`
    Events to listen for: `checkout.session.completed`

3.  **Admin Access**:
    Log in with `dillib@gmail.com`. The system is hardcoded to make this email an Admin automatically on first login.

## 4. Verification

- **Check Admin Panel**: Go to `/admin` (or click Admin in the menu).
- **Test Purchase**: Try buying a topic (use a Stripe Test Card if using Test keys).
- **Test AI**: Generate a new topic and verify it creates the content + mind map.
