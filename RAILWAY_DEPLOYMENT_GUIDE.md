# 🚄 Railway Deployment Guide for SecureMeet Backend

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code pushed to GitHub
3. **MongoDB Atlas**: Already configured at `mongodb+srv://...cluster0.jgu9ust.mongodb.net/securemeet`
4. **Google OAuth Credentials**: Already have Client ID and Secret

---

## Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

Or use without installation:
```bash
npx @railway/cli
```

---

## Step 2: Login to Railway

```bash
railway login
```

This opens your browser for authentication.

---

## Step 3: Deploy to Railway

### Option A: From CLI (Recommended)

```bash
# Navigate to project root
cd D:/learning/SecureMeet

# Initialize Railway project
railway init

# Follow prompts:
# - Project name: securemeet-backend
# - Deploy now? Yes

# Deploy
railway up
```

### Option B: From Railway Dashboard

1. Go to [railway.app/new](https://railway.app/new)
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `CodeRAHULx/secretproctor`
4. Select **main** branch
5. Click **Deploy Now**

---

## Step 4: Configure Environment Variables

### Via Railway CLI:

```bash
# Set production environment
railway variables set NODE_ENV=production

# Set server configuration
railway variables set HOST=0.0.0.0

# Set Google OAuth (REPLACE with your values)
railway variables set GOOGLE_CLIENT_ID=176918613650-qiikg1v93s8u9bk02vp9nrfcmibi5k56.apps.googleusercontent.com
railway variables set GOOGLE_CLIENT_SECRET=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

# IMPORTANT: You need to set this AFTER getting your Railway URL (see Step 5)
# railway variables set GOOGLE_REDIRECT_URI=https://YOUR-APP.railway.app/api/auth/google/callback

# Set MongoDB (REPLACE with your actual password)
railway variables set MONGODB_URI="mongodb+srv://RayandNova:YOUR_PASSWORD@cluster0.jgu9ust.mongodb.net/securemeet"

# Set session secret (generate a random 64-char string)
railway variables set SESSION_SECRET="$(openssl rand -base64 48)"

# Optional: Set Gemini API key for AI features
# railway variables set GEMINI_API_KEY=your-gemini-api-key
```

### Via Railway Dashboard:

1. Go to your project dashboard
2. Click **Variables** tab
3. Add each environment variable:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ |
| `HOST` | `0.0.0.0` | ✅ |
| `GOOGLE_CLIENT_ID` | Your OAuth Client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Your OAuth Client Secret | ✅ |
| `GOOGLE_REDIRECT_URI` | `https://your-app.railway.app/api/auth/google/callback` | ✅ |
| `MONGODB_URI` | Your MongoDB Atlas connection string | ✅ |
| `SESSION_SECRET` | Random 64-character string | ✅ |
| `GEMINI_API_KEY` | Your Gemini API key | ❌ Optional |

---

## Step 5: Get Your Railway URL

### Option A: Via CLI
```bash
railway domain
```

### Option B: Via Dashboard
1. Go to **Settings** tab
2. Scroll to **Networking**
3. Click **Generate Domain**
4. Copy the URL (e.g., `https://securemeet-backend-production-xxxx.railway.app`)

---

## Step 6: Update Google OAuth Redirect URI

### In Google Cloud Console:

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Add **Authorized redirect URIs**:
   - `https://your-railway-app.railway.app/api/auth/google/callback`
   - `https://securemeet-privatedoc.vercel.app/api/auth/google/callback` (your Vercel frontend)
4. Click **Save**

### In Railway:

Update the `GOOGLE_REDIRECT_URI` variable with your actual Railway URL:

```bash
railway variables set GOOGLE_REDIRECT_URI=https://your-app.railway.app/api/auth/google/callback
```

---

## Step 7: Update Frontend to Point to Railway Backend

You need to update your Vercel frontend to connect to the Railway backend.

### Option A: Update vercel.json (Recommended)

Create or update `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-railway-app.railway.app/api/:path*"
    }
  ]
}
```

Then redeploy:
```bash
vercel --prod
```

### Option B: Update Frontend API Configuration

If you have a dedicated API config file in frontend, update it:

```javascript
// frontend/src/config/api.js
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-railway-app.railway.app'
  : 'http://localhost:3000';

export default API_BASE_URL;
```

---

## Step 8: Verify Deployment

### Check Health Endpoint
```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-08-18T...",
  "uptime": 123.456,
  "environment": "production"
}
```

### Check Logs
```bash
railway logs
```

Or view in dashboard: **Deployments** → **Logs**

---

## Step 9: Test Full Flow

1. Visit your Vercel frontend: https://securemeet-privatedoc.vercel.app
2. Click **Sign in with Google**
3. Authorize the app
4. Create a meeting
5. Join from another device/browser
6. Test video, audio, screen sharing

---

## Troubleshooting

### Build Failed

**Error**: `npm install` failed

**Solution**: Check `backend/package.json` exists and is valid
```bash
railway logs --build
```

### Connection Timeout

**Error**: Can't connect to backend

**Solution**: 
- Check Railway deployment status
- Verify environment variables are set
- Check CORS settings include Vercel domain

### OAuth Error

**Error**: `redirect_uri_mismatch`

**Solution**:
- Verify `GOOGLE_REDIRECT_URI` matches Google Cloud Console exactly
- Make sure you saved changes in Google Cloud Console
- Check Railway URL is correct (no trailing slash)

### MongoDB Connection Failed

**Error**: `MongoNetworkError` or `ENOTFOUND`

**Solution**:
- Verify MongoDB URI is correct
- Check MongoDB Atlas allows connections from anywhere (IP: `0.0.0.0/0`)
- Confirm username/password are correct
- Test connection string locally first

### 502 Bad Gateway

**Error**: Railway shows 502 error

**Solution**:
- Server may be crashing on startup
- Check logs: `railway logs`
- Verify `PORT` is not hardcoded (Railway sets it dynamically)
- Make sure `HOST=0.0.0.0` is set

---

## Important Notes

### ⚠️ Native Detector Disabled
The C++ Windows detector (`display_affinity_detector.exe`) **will not work** on Railway (Linux environment). The backend is configured to gracefully handle this:
- Proctoring features will be disabled
- Meeting functionality works normally
- No errors thrown

To enable proctoring in production, you would need:
- Linux-compatible detector (recompile C++ for Linux)
- Or Windows-based hosting (Azure Windows VMs, AWS Windows instances)

### 📊 Free Tier Limits
Railway free tier includes:
- $5/month usage credit
- 500 hours execution time
- Shared CPU/RAM
- Automatic sleep after inactivity

For production, upgrade to Hobby plan ($5/month + usage).

### 🔒 Security Checklist
- [x] HTTPS enabled (automatic on Railway)
- [ ] Strong `SESSION_SECRET` set
- [ ] MongoDB IP whitelist configured
- [ ] OAuth redirect URIs updated
- [ ] CORS restricted to Vercel domain
- [ ] Environment variables secured
- [ ] Logs monitored for errors

---

## Scaling Considerations

### If You Outgrow Railway:

**Serverless → Always-On Migrations:**
1. **DigitalOcean App Platform**: $5/month, full Node.js support
2. **Render**: Similar to Railway, $7/month
3. **AWS EC2 t3.micro**: $8-10/month, full control
4. **Google Cloud Run**: Pay-per-use, auto-scaling

**Database Scaling:**
- MongoDB Atlas M2 shared: $9/month (2GB storage)
- MongoDB Atlas M10 dedicated: $57/month (10GB storage, dedicated)

**TURN Server (for WebRTC):**
- Current: Free openrelay.metered.ca (rate-limited)
- Production: Twilio TURN ($2-5/month), xirsys.com ($20/month)

---

## Next Steps After Deployment

1. **Set up monitoring**: Use Railway dashboard or integrate with external services (Sentry, LogRocket)
2. **Configure custom domain**: Purchase domain and point to Railway
3. **Set up CI/CD**: Railway auto-deploys on git push
4. **Add production TURN server**: Replace free relay with paid service
5. **Enable database backups**: Configure MongoDB Atlas backups
6. **Set up alerts**: Monitor uptime and errors

---

## Useful Railway Commands

```bash
# View logs
railway logs

# Open project dashboard
railway open

# Check deployment status
railway status

# Redeploy
railway up

# List environment variables
railway variables

# Connect to MongoDB (if using Railway database)
railway run mongo

# SSH into container (for debugging)
railway run bash
```

---

## Cost Estimation

### Minimal Setup (Good for 100-500 users):
- Railway (Hobby): $5/month
- MongoDB Atlas (Free): $0
- Vercel (Hobby): $0
- Total: **$5/month**

### Production Setup (1000+ users):
- Railway (Pro): $20/month
- MongoDB Atlas (M2): $9/month
- Vercel (Pro): $20/month
- TURN Server: $20/month
- Total: **$69/month**

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- MongoDB Atlas Support: https://www.mongodb.com/cloud/atlas/support

---

*Guide created: 2026-08-18*
*Last updated: 2026-08-18*
