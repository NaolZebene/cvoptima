# 🚀 QUICK DEPLOYMENT - CVOptima to Vercel

## **Your Account:**
- **Email:** znaol60@gmail.com
- **Password:** @Nevapark60

## **3-Step Deployment:**

### **Step 1: Deploy Backend (Render.com)**
1. **Create MongoDB Atlas** (free):
   - Go to: https://www.mongodb.com/cloud/atlas
   - Create free cluster (M0 Sandbox)
   - Get connection string

2. **Deploy to Render** (free):
   - Go to: https://render.com
   - Connect GitHub repo: `NaolZebene/cvoptima`
   - Create Web Service:
     - **Name:** `cvoptima-backend`
     - **Build Command:** `cd backend && npm install`
     - **Start Command:** `cd backend && npm start`
   - Add environment variables (see below)

### **Step 2: Deploy Frontend (Vercel)**
```bash
# Install Vercel CLI
npm install -g vercel

# Login (use your credentials)
vercel login

# Deploy
cd cvoptima/frontend
vercel
```

### **Step 3: Configure**
1. **Update backend CORS** in Render:
   - Add: `CORS_ORIGIN=https://cvoptima.vercel.app`
2. **Update frontend API URL** in Vercel:
   - Add: `REACT_APP_API_URL=https://cvoptima-backend.onrender.com/api/v1`

## **Environment Variables:**

### **Backend (Render):**
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvoptima?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://cvoptima.vercel.app
```

### **Frontend (Vercel):**
```
REACT_APP_API_URL=https://cvoptima-backend.onrender.com/api/v1
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
```

## **Deployment URLs:**
- **Frontend:** https://cvoptima.vercel.app
- **Backend:** https://cvoptima-backend.onrender.com
- **API:** https://cvoptima-backend.onrender.com/api/v1

## **Quick Test:**
```bash
# Test backend
curl https://cvoptima-backend.onrender.com/health

# Open frontend
open https://cvoptima.vercel.app
```

## **Need Help?**
- Full guide: `VERCEL_DEPLOYMENT_GUIDE.md`
- Run: `./deploy-to-vercel.sh`

## **Estimated Time:** 15-30 minutes
## **Cost:** $0 (free tier)

**🎉 Your CVOptima SaaS will be live!**