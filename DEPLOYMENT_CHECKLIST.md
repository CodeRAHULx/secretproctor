# 🚀 SecureMeet Production Deployment Checklist

## Pre-Deployment Setup

### 1. MongoDB Atlas Configuration
- [ ] MongoDB Atlas account created
- [ ] Database user credentials set
- [ ] Network access configured (allow `0.0.0.0/0` for Railway)
- [ ] Connection string tested and working
- [ ] Database name: `securemeet`

### 2. Google OAuth Setup
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Client ID and Secret saved securely
- [ ] Authorized redirect URIs ready to update (will add Railway URL after deployment)

### 3. Optional Services
- [ ] Gemini API key obtained (for AI translation/memo features)
- [ ] Razorpay account setup (for payment features)
- [ ] Production TURN server credentials (xirsys, Twilio, or custom)

---

## Backend Deployment (Railway)

### 4. Railway Setup
- [ ] Railway account created at railway.app
- [ ] Railway CLI installed: `npm install -g @railway/cli`
- [ ] Logged in: `railway login`
- [ ] Project initialized: `railway init`

### 5. Environment Variables Set in Railway
- [ ] `NODE_ENV=production`
- [ ] `HOST=0.0.0.0`
- [ ] `GOOGLE_CLIENT_ID=...`
- [ ] `GOOGLE_CLIENT_SECRET=...`
- [ ] `MONGODB_URI=mongodb+srv://...`
- [ ] `SESSION_SECRET=<random-64-char-string>`
- [ ] `GOOGLE_REDIRECT_URI=https://YOUR-APP.railway.app/api/auth/google/callback` (update after getting URL)
- [ ] `GEMINI_API_KEY=...` (optional)
- [ ] `RAZORPAY_KEY_ID=...` (optional)
- [ ] `RAZORPAY_KEY_SECRET=...` (optional)

### 6. Deploy Backend
- [ ] Code pushed to GitHub
- [ ] Railway deployment triggered: `railway up`
- [ ] Deployment successful (check logs)
- [ ] Railway domain generated
- [ ] Health check working: `https://YOUR-APP.railway.app/api/health`

### 7. Update OAuth Callback
- [ ] Railway URL obtained (e.g., `https://securemeet-backend-production.railway.app`)
- [ ] Updated `GOOGLE_REDIRECT_URI` in Railway variables
- [ ] Added Railway callback URL to Google Cloud Console:
  - `https://YOUR-RAILWAY-APP.railway.app/api/auth/google/callback`
- [ ] Added Vercel frontend URL to Google Cloud Console:
  - `https://securemeet-privatedoc.vercel.app/api/auth/google/callback`
- [ ] Saved changes in Google Cloud Console

---

## Frontend Deployment (Vercel)

### 8. Update Frontend Configuration
- [ ] Created/updated `vercel.json` with Railway backend URL:
  ```json
  {
    "rewrites": [
      {
        "source": "/api/:path*",
        "destination": "https://YOUR-RAILWAY-APP.railway.app/api/:path*"
      }
    ]
  }
  ```
- [ ] Committed and pushed to GitHub
- [ ] Redeployed on Vercel: `vercel --prod` or via dashboard

### 9. Vercel Environment Variables (if needed)
- [ ] `VITE_API_URL=https://YOUR-RAILWAY-APP.railway.app` (if using env vars for API URL)
- [ ] Any other frontend-specific variables

---

## Testing & Verification

### 10. Backend Health Checks
- [ ] Health endpoint responds: `curl https://YOUR-APP.railway.app/api/health`
- [ ] Returns `{"status": "ok", ...}`
- [ ] MongoDB connection successful (check logs)
- [ ] No errors in Railway logs

### 11. Frontend Connectivity
- [ ] Visit https://securemeet-privatedoc.vercel.app
- [ ] Landing page loads correctly
- [ ] No console errors in browser DevTools
- [ ] API calls reaching Railway backend (check Network tab)

### 12. Authentication Flow
- [ ] Click "Sign in with Google"
- [ ] Redirects to Google OAuth consent screen
- [ ] After authorization, redirects back to app
- [ ] User logged in successfully
- [ ] Session persists across page reloads
- [ ] User profile displays correctly
- [ ] Logout works and clears session

### 13. Meeting Functionality
- [ ] Create new meeting
- [ ] Meeting room loads
- [ ] Camera/microphone permissions requested
- [ ] Video preview shows
- [ ] Share meeting link generated

### 14. Join Meeting
- [ ] Copy meeting link
- [ ] Open in incognito/different browser
- [ ] Sign in with different Google account
- [ ] Join meeting as guest
- [ ] Host admission flow works
- [ ] Guest admitted successfully

### 15. WebRTC Features
- [ ] Video streams connect (both participants see each other)
- [ ] Audio works (can hear each other)
- [ ] Mute/unmute video works
- [ ] Mute/unmute audio works
- [ ] Screen sharing starts
- [ ] Screen sharing displays correctly for remote participant
- [ ] Screen sharing stops cleanly

### 16. Chat & Collaboration
- [ ] Send chat message
- [ ] Message received by other participant
- [ ] Chat history persists during meeting
- [ ] Timestamps show correctly

### 17. AI Features (if enabled)
- [ ] Translation works (if GEMINI_API_KEY set)
- [ ] Meeting memo generation works
- [ ] AI responses are reasonable

### 18. Meeting Controls
- [ ] Participant list shows correctly
- [ ] Host can transfer host role
- [ ] Host can end meeting
- [ ] Participants can leave meeting
- [ ] Meeting ends for all when host ends

---

## Security & Performance

### 19. Security Checks
- [ ] HTTPS enabled on all endpoints
- [ ] CORS restricted to frontend domain
- [ ] Session cookies secure and httpOnly
- [ ] No sensitive data in frontend code
- [ ] Environment variables not exposed
- [ ] No `.env` files in git history
- [ ] Strong `SESSION_SECRET` in production

### 20. Performance Checks
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms for most endpoints
- [ ] WebRTC connection established < 5 seconds
- [ ] No memory leaks (check Railway metrics)
- [ ] Database queries optimized

### 21. Monitoring Setup
- [ ] Railway logs accessible
- [ ] Error tracking configured (Sentry, LogRocket, etc.)
- [ ] Uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Database monitoring (MongoDB Atlas metrics)

---

## Production Considerations

### 22. Known Limitations
- [ ] **Documented**: C++ proctoring detector disabled on Railway (Linux)
- [ ] **Documented**: Using free TURN server (consider upgrading for production)
- [ ] **Documented**: No Redis for session storage (in-memory only)
- [ ] **Documented**: No SFU for multi-party calls (mesh topology)

### 23. Scaling Preparations
- [ ] Documented cost estimates
- [ ] Identified bottlenecks
- [ ] Plan for database scaling (MongoDB Atlas upgrade path)
- [ ] Plan for TURN server (if needed for large deployments)
- [ ] Plan for SFU migration (if needed for 5+ participants)

### 24. Backup & Recovery
- [ ] MongoDB Atlas automatic backups enabled
- [ ] Code backed up on GitHub
- [ ] Environment variables documented securely
- [ ] Rollback plan documented

---

## Post-Deployment

### 25. Documentation Updates
- [ ] Update `DEPLOYMENT_INFO.md` with Railway URL
- [ ] Update `README.md` with production URLs
- [ ] Document any production-specific configurations
- [ ] Create runbook for common issues

### 26. User Communication
- [ ] Announce production deployment
- [ ] Share production URL with users
- [ ] Provide support contact information
- [ ] Set expectations for features/limitations

### 27. Monitoring First 24 Hours
- [ ] Check logs every few hours
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Watch for performance issues
- [ ] Monitor database usage
- [ ] Watch Railway usage/costs

---

## Troubleshooting Reference

### Common Issues & Solutions

#### ❌ 502 Bad Gateway
**Cause**: Server crashed or not binding to correct port/host
**Solution**: 
- Check Railway logs: `railway logs`
- Verify `HOST=0.0.0.0` is set
- Ensure `PORT` is not hardcoded

#### ❌ OAuth redirect_uri_mismatch
**Cause**: Google OAuth redirect URI doesn't match
**Solution**:
- Verify Railway URL is correct
- Check Google Cloud Console has exact URL
- No trailing slashes in URLs
- HTTPS (not HTTP) for production

#### ❌ MongoDB connection failed
**Cause**: Network restrictions or wrong credentials
**Solution**:
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify connection string is correct
- Test connection locally first
- Check username/password

#### ❌ CORS errors in browser console
**Cause**: Backend not allowing frontend origin
**Solution**:
- Check `backend/routes/apiRoutes.js` CORS settings
- Verify Vercel URL is in allowed origins
- Check Railway logs for CORS rejections

#### ❌ WebRTC connection fails
**Cause**: TURN server not working or NAT traversal issues
**Solution**:
- Check browser console for ICE failures
- Verify TURN credentials are correct
- Test with both participants on same network first
- Consider upgrading to paid TURN server

---

## Success Criteria

✅ Deployment is successful when:
- [ ] All authentication flows work end-to-end
- [ ] Two participants can join a meeting and see/hear each other
- [ ] Screen sharing works
- [ ] Chat works
- [ ] No critical errors in logs for 1 hour
- [ ] Response times are acceptable
- [ ] All test scenarios pass

---

## Rollback Plan

If deployment fails:

1. **Immediate rollback**:
   ```bash
   # Railway: Rollback to previous deployment
   railway rollback
   
   # Vercel: Rollback to previous deployment
   vercel rollback
   ```

2. **Revert code changes**:
   ```bash
   git revert HEAD
   git push
   ```

3. **Restore environment variables** from backup

4. **Communicate status** to users

5. **Debug in staging environment** before retrying

---

## Contact & Support

- **Railway Support**: https://railway.app/help
- **Vercel Support**: https://vercel.com/support
- **MongoDB Support**: https://www.mongodb.com/cloud/atlas/support
- **Google Cloud Console**: https://console.cloud.google.com

---

*Checklist created: 2026-08-18*
*Use this checklist for every production deployment*

**✨ Good luck with your deployment! ✨**
