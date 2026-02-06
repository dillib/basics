# Deploying BasicsTutor to Render

This guide will help you deploy BasicsTutor to Render with optimal performance and reliability.

## 📋 Prerequisites

Before deploying, ensure you have:

1. ✅ Render account (sign up at [render.com](https://render.com))
2. ✅ GitHub repository with your code
3. ✅ Google OAuth credentials
4. ✅ Stripe account
5. ✅ Gemini API key

## 🚀 Quick Deploy (Recommended)

### Option 1: Using Blueprint (render.yaml)

This is the **fastest and most reliable** method:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Create New Blueprint in Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **"New" → "Blueprint"**
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`
   - Click **"Apply"**

3. **Set Environment Variables**

   In the Render dashboard, go to your web service and set these variables:

   ```bash
   # Admin Access
   ADMIN_EMAILS=your-email@example.com

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Stripe
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret
   STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # AI Integration
   GOOGLE_API_KEY=your_gemini_api_key

   # Optional: Custom Pricing (defaults to $1.99 and $99)
   TOPIC_PRICE_CENTS=199
   PRO_ANNUAL_PRICE_CENTS=9900
   ```

4. **Deploy!**
   - Render will automatically build and deploy
   - Database migrations run automatically on startup
   - Your app will be live at: `https://basicstutor.onrender.com`

---

### Option 2: Manual Setup

If you prefer manual configuration:

1. **Create PostgreSQL Database**
   - Dashboard → **New** → **PostgreSQL**
   - Name: `basicstutor-db`
   - Region: Choose closest to your users
   - Plan: Starter (free) or Standard
   - Click **Create Database**
   - Copy the **Internal Database URL**

2. **Create Web Service**
   - Dashboard → **New** → **Web Service**
   - Connect your GitHub repository
   - Configure:
     - **Name**: `basicstutor`
     - **Runtime**: Node
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
     - **Plan**: Starter or Standard

3. **Set Environment Variables**

   Add all the environment variables listed in Option 1, plus:
   ```bash
   DATABASE_URL=<paste_internal_database_url>
   NODE_ENV=production
   ```

4. **Deploy**
   - Click **"Create Web Service"**
   - Render will build and deploy automatically

---

## 🔧 Configuration Details

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add Authorized Redirect URI:
   ```
   https://your-app-name.onrender.com/api/auth/google/callback
   ```
4. Copy Client ID and Client Secret to Render environment variables

### Stripe Webhook Setup

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set endpoint URL:
   ```
   https://your-app-name.onrender.com/api/stripe/webhook
   ```
4. Select event: `checkout.session.completed`
5. Copy the **Signing secret** to `STRIPE_WEBHOOK_SECRET`

### Database Migrations

Migrations run automatically on every deployment via the start command:
```bash
npm start
# This runs: NODE_ENV=production tsx server/migrate.ts && node dist/index.cjs
```

No manual migration steps needed! ✨

---

## ⚡ Performance Optimization

### 1. Enable Persistent Disks (Recommended)

For faster builds and better performance:

1. Go to your web service settings
2. Scroll to **"Disk"**
3. Add disk:
   - **Mount Path**: `/opt/render/.cache`
   - **Size**: 1 GB
4. This caches `node_modules` between builds

### 2. Choose the Right Plan

| Plan | Best For | Performance |
|------|----------|-------------|
| **Starter** | Development, Testing | Spins down after 15 min inactivity |
| **Standard** | Production | Always on, faster response |
| **Pro** | High Traffic | Multiple instances, auto-scaling |

**For production, use Standard or higher** to avoid cold starts.

### 3. Set Up Auto-Deploy

1. Go to web service → **Settings**
2. Enable **"Auto-Deploy"**
3. Select branch: `main`
4. Every push to main will auto-deploy

### 4. Enable Health Checks

Health checks are already configured in `render.yaml`:
```yaml
healthCheckPath: /api/topics
```

This ensures Render knows your app is running correctly.

---

## 🔍 Monitoring & Debugging

### View Logs

```bash
# In Render Dashboard
Go to your service → Logs tab
```

Look for:
- ✅ Configuration Summary on startup
- ✅ "serving on port 10000" (Render uses port 10000)
- ❌ Any error messages

### Common Startup Messages

**Success:**
```
📋 Configuration Summary:
   Environment: production
   Port: 10000
   Topic Price: $1.99
   ...
✓ Database migrations complete
serving on port 10000
```

**Configuration Error:**
```
❌ Configuration Error:
  - GOOGLE_CLIENT_ID is required
Please check your .env file or environment configuration.
```
→ Add missing environment variable in Render dashboard

### Test Your Deployment

1. **Health Check**: Visit `https://your-app.onrender.com/api/topics`
   - Should return JSON with topics

2. **Homepage**: Visit `https://your-app.onrender.com`
   - Should load the homepage

3. **Login**: Test Google OAuth login
   - Click login button
   - Verify redirect works

4. **Topic Generation**: Generate a test topic
   - Verifies AI integration works

---

## 🐛 Troubleshooting

### Issue: "Service Unavailable" or 503 Error

**Cause**: Service is starting up or crashed

**Solution**:
1. Check logs for error messages
2. Verify all environment variables are set
3. Check database connection string is correct

### Issue: OAuth Redirect Fails

**Cause**: Redirect URI mismatch

**Solution**:
1. Verify Google OAuth redirect URI matches:
   ```
   https://your-exact-app-name.onrender.com/api/auth/google/callback
   ```
2. No trailing slash!
3. Update in Google Cloud Console if needed

### Issue: Stripe Webhook Fails

**Cause**: Webhook secret mismatch or endpoint not configured

**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Test webhook in Stripe dashboard:
   - Dashboard → Webhooks → Click your endpoint → "Send test webhook"

### Issue: Slow Initial Load (Cold Start)

**Cause**: Free tier spins down after 15 minutes

**Solutions**:
1. Upgrade to **Standard plan** ($7/month) - keeps service always on
2. Use a service like [UptimeRobot](https://uptimerobot.com) to ping your app every 5 minutes (free tier workaround)
3. Enable **persistent disk** for faster restarts

### Issue: Database Connection Error

**Cause**: Wrong DATABASE_URL or database not created

**Solution**:
1. Verify database was created in Render
2. Check DATABASE_URL environment variable is set
3. Use the **Internal Database URL** (not external)
4. Format: `postgresql://user:password@hostname:port/database`

---

## 🔒 Security Checklist

Before going live:

- [ ] `NODE_ENV=production` is set
- [ ] `SESSION_SECRET` is a strong random value (auto-generated by Render)
- [ ] Using **HTTPS** (automatic with Render)
- [ ] Stripe keys are **live keys** (`sk_live_*`, `pk_live_*`), not test keys
- [ ] Google OAuth redirect URI uses **HTTPS**
- [ ] Admin emails are set correctly
- [ ] Database has strong password (auto-generated by Render)
- [ ] No sensitive data in logs

---

## 📊 Post-Deployment Checklist

After deployment:

1. **Test All Features**
   - [ ] User registration/login
   - [ ] Topic generation
   - [ ] Quiz functionality
   - [ ] Payment flow (use Stripe test mode first)
   - [ ] Admin dashboard access

2. **Configure Custom Domain** (Optional)
   - Go to service settings → Custom Domains
   - Add your domain
   - Update DNS records as shown

3. **Set Up Monitoring**
   - [ ] Enable email alerts in Render
   - [ ] Monitor error logs daily
   - [ ] Set up uptime monitoring (UptimeRobot, Pingdom)

4. **Update OAuth Redirect URIs**
   - [ ] Google OAuth: Update with custom domain if added
   - [ ] Stripe webhooks: Update with custom domain if added

5. **Performance Testing**
   - [ ] Test topic generation speed
   - [ ] Test quiz loading
   - [ ] Check page load times
   - [ ] Verify no errors in browser console

---

## 🚀 Deployment Commands

### Manual Redeploy

```bash
# In Render Dashboard
Go to your service → Manual Deploy → Deploy latest commit
```

### View Current Deployment

```bash
# In Render Dashboard
Go to your service → Events tab
```

### Rollback to Previous Version

```bash
# In Render Dashboard
Go to your service → Events tab → Click on previous deployment → Rollback
```

---

## 💡 Best Practices

1. **Always test in development first**
   ```bash
   npm run dev
   ```

2. **Run tests before deploying**
   ```bash
   npm run test:run
   ```

3. **Check TypeScript errors**
   ```bash
   npm run check
   ```

4. **Use environment-specific configs**
   - Development: `.env.local`
   - Production: Render dashboard environment variables

5. **Monitor logs regularly**
   - Check for errors
   - Monitor performance
   - Track usage patterns

6. **Keep dependencies updated**
   ```bash
   npm outdated
   npm update
   ```

---

## 📞 Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Render Community**: [community.render.com](https://community.render.com)
- **Application Issues**: Check `README.md` troubleshooting section

---

## 🎉 You're Live!

Once deployed, your app will be available at:
```
https://your-app-name.onrender.com
```

Share this URL with users and start helping them learn! 🎓✨

---

**Need help?** Check the logs first, then refer to the troubleshooting section above.
