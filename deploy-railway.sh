#!/bin/bash

# SecureMeet Railway Deployment Script
# This script automates the Railway deployment process

set -e

echo "🚄 SecureMeet Backend - Railway Deployment Script"
echo "=================================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
echo "🔐 Checking Railway authentication..."
railway whoami &> /dev/null || {
    echo "❌ Not logged in to Railway. Running login..."
    railway login
}

echo "✅ Railway CLI ready"
echo ""

# Initialize project if not already done
if [ ! -f "railway.toml" ]; then
    echo "❌ railway.toml not found!"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo ""
read -p "Have you set all environment variables in Railway dashboard? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚠️  Please set these environment variables in Railway dashboard:"
    echo "   - NODE_ENV=production"
    echo "   - HOST=0.0.0.0"
    echo "   - GOOGLE_CLIENT_ID=..."
    echo "   - GOOGLE_CLIENT_SECRET=..."
    echo "   - MONGODB_URI=..."
    echo "   - SESSION_SECRET=..."
    echo ""
    echo "Visit: https://railway.app/dashboard"
    exit 1
fi

echo ""
read -p "Have you pushed your latest code to GitHub? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚠️  Please commit and push your changes first:"
    echo "   git add ."
    echo "   git commit -m 'Prepare for Railway deployment'"
    echo "   git push origin main"
    echo ""
    exit 1
fi

echo ""
echo "🚀 Starting deployment to Railway..."
echo ""

# Deploy to Railway
railway up

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📊 Check deployment status:"
echo "   railway status"
echo ""
echo "📝 View logs:"
echo "   railway logs"
echo ""
echo "🌐 Get your Railway URL:"
echo "   railway domain"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo ""
echo "1. Get your Railway URL: railway domain"
echo "2. Update GOOGLE_REDIRECT_URI in Railway:"
echo "   railway variables set GOOGLE_REDIRECT_URI=https://YOUR-APP.railway.app/api/auth/google/callback"
echo ""
echo "3. Add Railway URL to Google Cloud Console:"
echo "   https://console.cloud.google.com/apis/credentials"
echo "   Add: https://YOUR-APP.railway.app/api/auth/google/callback"
echo ""
echo "4. Update vercel.json with Railway URL and redeploy frontend"
echo ""
echo "5. Test health endpoint:"
echo "   curl https://YOUR-APP.railway.app/api/health"
echo ""
echo "📖 Full guide: RAILWAY_DEPLOYMENT_GUIDE.md"
echo ""
echo "✨ Deployment script completed!"
