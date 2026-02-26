# GitHub Pages Deployment - CVOptima

## **No SMS Verification Required!**

## **Deployment Strategy:**
- **Frontend:** GitHub Pages (free, no SMS)
- **Backend:** Render.com (free)
- **Database:** MongoDB Atlas (free)

## **Step 1: Enable GitHub Pages**

### **1.1 Go to Repository Settings**
1. Open: https://github.com/NaolZebene/cvoptima
2. Click "Settings" tab
3. Scroll to "Pages" section

### **1.2 Configure GitHub Pages**
- **Source:** Deploy from a branch
- **Branch:** `main` → `/frontend/build` (or `gh-pages`)
- **Folder:** `/ (root)`
- Click "Save"

## **Step 2: Create MongoDB Atlas Database**

### **2.1 Create Free MongoDB Cluster**
1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create cluster (M0 Sandbox, FREE)
4. Get connection string

### **2.2 Database Connection String**
```
mongodb+srv://username:password@cluster.mongodb.net/cvoptima?retryWrites=true&w=majority
```

## **Step 3: Deploy Backend to Render.com**

### **3.1 Create Render Account**
1. Go to: https://render.com
2. Sign up with GitHub
3. Verify email

### **3.2 Create Web Service**
1. Connect GitHub repo: `NaolZebene/cvoptima`
2. Configure:
   - **Name:** `cvoptima-backend`
   - **Environment:** Node
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Plan:** Free

### **3.3 Environment Variables**
```
NODE_ENV=production
PORT=10000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://naolzebene.github.io
```

## **Step 4: Configure Frontend**

### **4.1 Update Environment Variables**
In GitHub repository settings:
1. Go to Settings → Secrets and variables → Actions
2. Add repository secret:
   - **Name:** `REACT_APP_API_URL`
   - **Value:** `https://cvoptima-backend.onrender.com/api/v1`

### **4.2 Trigger Deployment**
Push to main branch or manually run workflow:
```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

## **Step 5: Test Deployment**

### **5.1 Frontend URL**
```
https://naolzebene.github.io/cvoptima
```

### **5.2 Backend URL**
```
https://cvoptima-backend.onrender.com
```

### **5.3 API Health Check**
```
https://cvoptima-backend.onrender.com/health
```

## **Environment Variables Summary:**

### **Backend (Render.com):**
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvoptima?retryWrites=true&w=majority
JWT_SECRET=your-jwt-secret-here
CORS_ORIGIN=https://naolzebene.github.io
```

### **Frontend (GitHub Actions Secret):**
```
REACT_APP_API_URL=https://cvoptima-backend.onrender.com/api/v1
```

## **Deployment URLs:**
- 🌐 **Frontend:** https://naolzebene.github.io/cvoptima
- ⚙️ **Backend:** https://cvoptima-backend.onrender.com
- 🔧 **API:** https://cvoptima-backend.onrender.com/api/v1

## **Cost:** $0 (completely free)

## **Advantages:**
1. No SMS verification required
2. Uses existing GitHub account
3. Automatic deployment on push
4. Free SSL certificates
5. Custom domain support

## **Troubleshooting:**

### **Frontend not loading:**
- Check GitHub Pages build status
- Verify CORS origin in backend
- Check browser console for errors

### **Backend not connecting:**
- Check Render.com logs
- Verify MongoDB connection
- Check environment variables

### **Database issues:**
- Verify MongoDB Atlas cluster is running
- Check IP whitelist (allow all IPs: 0.0.0.0/0)
- Test connection string

## **Next Steps After Deployment:**
1. Test all features
2. Create admin user
3. Configure custom domain (optional)
4. Set up monitoring

**🎉 Your CVOptima SaaS is now live on GitHub Pages!**