# 🚀 Production Deployment Guide

Deploying AquaGuardian AI requires splitting the architecture. 
- The **Frontend (React/Vite)** is stateless and perfectly suited for Vercel's global CDN.
- The **Backend (FastAPI)** runs continuous WebSockets, OpenCV background processes, and asynchronous Vapi outbound loops. **Vercel Serverless Functions do NOT support long-lived WebSockets or background tasks.** Therefore, the backend must be deployed to a stateful container service like **Render**, **Railway**, or a standard VPS (DigitalOcean).

---

## Part 1: Backend Deployment (Render / Railway)

Because the system relies on active WebSocket streams (`/ws`) for camera frames, it needs a permanent server instance.

### Option A: Railway.app (Recommended for PostgreSQL ease)
1. Log into Railway and create a new Project.
2. Provision a **PostgreSQL** database from the Railway marketplace.
3. Link your GitHub repository and select the `backend/` folder as your root directory.
4. Railway will automatically detect Python.
5. **Environment Variables Required:**
   - `DATABASE_URL` (Provided by Railway Postgres, ensure it uses `postgresql+asyncpg://`)
   - `SYNC_DATABASE_URL` (Ensure it uses `postgresql+psycopg2://`)
   - `VAPI_API_KEY`
   - `VAPI_ASSISTANT_ID`
   - `TWILIO_PHONE_NUMBER_ID`
6. Deploy. Note your public backend URL (e.g., `https://aquaguardian-api.up.railway.app`).

---

## Part 2: Frontend Deployment (Vercel)

Vercel is the optimal host for the React dashboard.

### 1. Preparation
Ensure your frontend API calls dynamically use the production URL when deployed.
In `frontend/src/services/api.ts`, ensure your URLs resolve to your deployed backend instead of localhost. 

A standard pattern in `api.ts`:
```typescript
const isProd = import.meta.env.PROD;
const API_BASE = isProd ? "https://aquaguardian-api.up.railway.app" : "http://localhost:8000";

const wsProtocol = isProd ? 'wss:' : (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
const WS_DOMAIN = isProd ? "aquaguardian-api.up.railway.app" : window.location.host;
const WS_URL = `${wsProtocol}//${WS_DOMAIN}/ws`;
```

### 2. Vercel Configuration
By default, Vite projects work out-of-the-box on Vercel. However, since the frontend is in a subfolder (`/frontend`), we need to configure Vercel correctly.

1. Go to your Vercel Dashboard and click **Add New... -> Project**.
2. Select your `AquaGuardian` GitHub repository.
3. **CRITICAL STEP - Root Directory:** In the project setup, click "Edit" next to **Root Directory** and select `frontend`.
4. **Framework Preset:** Vercel will automatically detect **Vite**.
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`

### 3. Deploy
Click **Deploy**. Vercel will build the optimized React bundle and assign you a global `.vercel.app` URL.

---

## Part 3: Fixing Mobile QR Code Routing

If your Vercel URL is `https://aqua-dash.vercel.app`, you must ensure the QR Pairing Code generator utilizes this public URL so mobile phones scan and connect correctly.

In the Dashboard UI, when you click **Pair Phone**, you will see the **Public URL (Ngrok)** override box we created. 
- Leave it blank if the app automatically detects `https://aqua-dash.vercel.app` via `window.location.origin`.
- If testing locally but expecting public mobile connections, input your Vercel or Ngrok domain there.

---

## Summary Checklist
- [ ] Backend hosted on a persistent server (Render/Railway), NOT Vercel.
- [ ] PostgreSQL hooked up and `SQLModel` tables synced.
- [ ] Frontend API and WS pointing to the public backend domain.
- [ ] Vercel Root Directory set to `/frontend`.
- [ ] Phones can access Vercel domain and scan QR successfully.
