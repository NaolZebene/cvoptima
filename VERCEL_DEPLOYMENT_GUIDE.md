# VERCEL DEPLOYMENT GUIDE - CVOptima

## **Account Information:**
- **Email:** znaol60@gmail.com
- **Password:** @Nevapark60

## **Deployment Strategy:**
- **Frontend:** Vercel (free tier)
- **Backend:** Render.com (free tier)
- **Database:** Render PostgreSQL (free tier)

## **Step 1: Deploy Backend to Render.com**

### **1.1 Create MongoDB Atlas Database (FREE)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a new cluster:
   - **Provider:** AWS
   - **Region:** Frankfurt (eu-central-1) or closest to you
   - **Cluster Tier:** M0 Sandbox (FREE)
   - **Cluster Name:** `cvoptima-cluster`
4. Create database user:
   - **Username:** `cvoptima_admin`
   - **Password:** `StrongPassword123!`
   - **Database User Privileges:** `Read and write to any database`
5. Add IP whitelist: `0.0.0.0/0` (allow all IPs for now)
6. Click "Connect" → "Connect your application"
7. Copy connection string:
   ```
   mongodb+srv://cvoptima_admin:StrongPassword123!@cvoptima-cluster.mongodb.net/cvoptima?retryWrites=true&w=majority
   ```

### **1.2 Create Render Account**
1. Go to https://render.com
2. Sign up with GitHub (recommended) or email
3. Verify email

### **1.3 Create Web Service for Backend**
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository: `NaolZebene/cvoptima`
4. Configure:
   - **Name:** `cvoptima-backend`
   - **Environment:** Node
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Plan:** Free
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://cvoptima_admin:StrongPassword123!@cvoptima-cluster.mongodb.net/cvoptima?retryWrites=true&w=majority
   JWT_SECRET=your-production-jwt-secret-key-here
   STRIPE_SECRET_KEY=sk_live_... (get from Stripe dashboard)
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   CORS_ORIGIN=https://cvoptima.vercel.app
   ```
6. Click "Create Web Service"

## **Step 2: Deploy Frontend to Vercel**

### **2.1 Install Vercel CLI**
```bash
npm install -g vercel
```

### **2.2 Login to Vercel**
```bash
vercel login
```
Use: znaol60@gmail.com / @Nevapark60

### **2.3 Deploy from Frontend Directory**
```bash
cd cvoptima/frontend
vercel
```

Follow the prompts:
- Set up and deploy: `Y`
- Which scope: `znaol60 (znaol60@gmail.com)`
- Link to existing project: `N`
- Project name: `cvoptima`
- Directory: `.`
- Override settings: `N`

### **2.4 Configure Environment Variables in Vercel**
After deployment, go to Vercel dashboard:
1. Select your project
2. Go to Settings → Environment Variables
3. Add:
   ```
   REACT_APP_API_URL=https://cvoptima-backend.onrender.com/api/v1
   REACT_APP_ENVIRONMENT=production
   REACT_APP_VERSION=1.0.0
   ```

### **2.5 Update Backend CORS**
Go back to Render backend settings:
1. Update `CORS_ORIGIN` to your Vercel URL
2. Redeploy backend

## **Step 3: Configure Stripe (Optional)**

### **3.1 Get Stripe Keys**
1. Go to https://dashboard.stripe.com
2. Switch to Live mode
3. Get:
   - `sk_live_...` (Secret Key)
   - `pk_live_...` (Publishable Key)
4. Add to both Render (backend) and Vercel (frontend)

### **3.2 Configure Webhooks**
1. In Stripe dashboard: Developers → Webhooks
2. Add endpoint: `https://cvoptima-backend.onrender.com/api/v1/stripe/webhook`
3. Select events to listen for
4. Copy webhook secret to Render env vars

## **Step 4: Test Deployment**

### **4.1 Test Frontend**
Open: `https://cvoptima.vercel.app`

### **4.2 Test Backend API**
```bash
curl https://cvoptima-backend.onrender.com/health
```

### **4.3 Test Database Connection**
Check Render logs for database connection success.

## **Step 5: Post-Deployment Setup**

### **5.1 Create Admin User**
```bash
# SSH into Render instance or use one-off command
cd backend
node create-admin.js
```

### **5.2 Configure Domain (Optional)**
1. In Vercel: Settings → Domains
2. Add custom domain
3. Update CORS in backend

## **Troubleshooting:**

### **Backend Won't Start:**
- Check Render logs
- Verify environment variables
- Check database connection

### **Frontend Can't Connect to Backend:**
- Check CORS settings
- Verify backend URL in frontend env vars
- Check if backend is running

### **Database Issues:**
- Verify PostgreSQL connection string
- Check if database is provisioned
- Check migration scripts

## **Cost Management (Free Tier):**

### **Vercel Limits:**
- 100GB bandwidth/month
- Unlimited serverless functions
- Automatic HTTPS

### **Render Limits:**
- 750 free hours/month
- PostgreSQL: 1GB storage
- Automatic sleep after inactivity

### **To Avoid Charges:**
- Use free plans only
- Monitor usage in dashboards
- Set up usage alerts

## **Maintenance:**

### **Update Deployment:**
```bash
# Frontend
cd frontend
vercel --prod

# Backend (auto-deploys from GitHub)
git push origin main
```

### **View Logs:**
```bash
# Vercel logs
vercel logs

# Render logs
# Dashboard → Service → Logs
```

## **Backup Strategy:**

### **Database Backup:**
1. Render PostgreSQL has automatic backups
2. Download backups monthly
3. Store in cloud storage

### **Code Backup:**
1. GitHub is primary backup
2. Regular commits
3. Tag releases

## **Support:**
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Stripe Docs: https://stripe.com/docs

## **Your Deployment URLs:**
- **Frontend:** https://cvoptima.vercel.app
- **Backend:** https://cvoptima-backend.onrender.com
- **API:** https://cvoptima-backend.onrender.com/api/v1
- **Health Check:** https://cvoptima-backend.onrender.com/health

## **Next Steps After Deployment:**
1. Test all features
2. Create admin account
3. Configure Stripe payments
4. Set up monitoring
5. Share with users

**🎉 Your CVOptima SaaS is now live!**