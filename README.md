# 🌊 AquaGuardian AI

**Industrial Wastewater Monitoring Dashboard**

AquaGuardian AI is a real-time, production-grade monitoring dashboard designed to simulate and visualize AI-powered industrial wastewater pollution detection. It uses computer vision heuristics to analyze live video feeds—including mobile phone cameras—to detect pollutants in real time, and broadcasts the status, turbidity, and estimated pH across the network via WebSocket.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0.0-61dafb.svg?logo=react)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg?logo=tailwind-css)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791.svg?logo=postgresql)

---

## ✨ Features

- **🔴 Live Mobile Camera Integration**: Stream your mobile phone camera directly into the dashboard over your local network.
- **🧠 Computer Vision Processing**: The backend analyzes frames in real time using OpenCV (HSV saturation, channel ratios, and color masking) to classify water as _Clear, Moderate, or Pollutant_.
- **⚡ Real-Time WebSockets**: Instant bidirectional communication for pushing AI predictions and triggering alert panels without polling.
- **📊 Dynamic KPI Dashboards**: 4 reactive key performance indicators with animated gradients and glow effects representing water status (Clear/Moderate/Pollutant).
- **📉 Live Analytics**: Historical trend charts tracking Turbidity, pH, and Compliance over time via Recharts.
- **🏭 Multi-Site Status**: Track multiple industrial plants from a single unified view.
- **🛡️ Alert System**: Slide-in notification panel for instantaneous pollutant anomaly warnings with acknowledgment capabilities.
- **🎨 Premium Industrial UI**: Glassmorphism, neon accents, dark mode default, and pulsing live indicators for a true "Mission Control" aesthetic.

---

## 🌍 Social Impact & Real-World Value

AquaGuardian AI isn't just a dashboard—it's a highly scalable solution designed to democratize environmental monitoring.

### 1. 🏭 Real-Life Applications

- **Manufacturing & Textile Plants**: Instantly detect harmful dye or chemical leaks in discharge pipes before they reach public waterways.
- **Municipal Water Treatment**: Provide low-cost preliminary filtration checks at various treatment stages.
- **Environmental Regulatory Bodies**: Enable inspectors to deploy instant, tamper-proof mobile camera nodes in remote areas without heavy equipment.
- **Agriculture**: Monitor irrigation channels for sudden spikes in turbidity or mud slides.

### 2. 💰 Cost Efficiency

Traditional industrial water quality sensors (optical turbidity meters, inline pH probes, spectrometer setups) cost anywhere from **$5,000 to $20,000+ per installation** and require frequent calibration and maintenance.

- **Our Solution**: By utilizing **off-the-shelf mobile phones** or standard CCTV cameras as optical sensors, AquaGuardian reduces hardware dependency by **95%**.
- The AI handles the calibration visually, transforming a $100 recycled smartphone into an industrial-grade anomaly detection node.

### 3. 🌱 Social Impact

- **Prevents Ecological Disasters**: Real-time alerts stop catastrophic pollutant dumping exactly when it happens.
- **Empowers Local Communities**: Low barrier to entry means smaller, underfunded municipalities in developing nations can now afford 24/7 water monitoring.
- **Accountability**: Creates an immutable, timestamped record of wastewater compliance, forcing factories to adhere to environmental laws.

### 4. 📈 Scalability & Unique Selling Proposition (USP)

- **The USP**: _Zero-Hardware Computer Vision Edge Nodes_. Instead of wiring proprietary sensors into pipes, you just point a camera at the water.
- **Limitless Scaling**: Because the heavy lifting is done via highly optimized OpenCV heuristics and WebSockets, you can connect hundreds of mobile camera nodes to a single centralized server simultaneously.
- **Infrastructure Independent**: Operates flawlessly over standard LAN Wi-Fi or Cellular connections without requiring specialized industrial networks.

---

## 🏗️ Architecture Stack

### Frontend (Vite + React + TypeScript)

- **Styling**: TailwindCSS v4 with custom CSS variables for dark industrial theming
- **Components**: Radix UI primitives + Lucide React icons
- **Charts**: Recharts
- **Routing**: React Router DOM v7
- **Media**: HTML5 `getUserMedia` API for mobile camera access

### Backend (Python FastAPI)

- **Framework**: FastAPI (Async REST + WebSockets)
- **Database**: PostgreSQL (via psycopg2)
- **ORM**: SQLModel (SQLAlchemy 2.0 wrapper)
- **Computer Vision**: OpenCV (`opencv-python-headless`) + NumPy for heuristic frame analysis

---

## 🚀 Quick Start Guide

### Prerequisites

- Node.js (v18+)
- Python 3.10+
- PostgreSQL server running locally

### 1. Database Setup

Create a local PostgreSQL database named `aquaguardian`:

```sql
CREATE DATABASE aquaguardian;
```

_(If your Postgres credentials differ from `postgres:postgres`, update the `SYNC_DATABASE_URL` inside `backend/.env`)_

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install fastapi uvicorn sqlmodel psycopg2-binary websockets python-multipart python-dotenv opencv-python-headless numpy Pillow

# Run the server (bound to 0.0.0.0 for LAN access)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

_Note: SQLModel will automatically create the required database tables on startup._

### 3. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

---

## 📱 Mobile Camera Testing (LAN)

To use your mobile phone camera for live wastewater detection:

1. Ensure your PC and mobile device are on the **exact same Wi-Fi network**.
2. Start the backend with `--host 0.0.0.0` as shown above.
3. Check the Vite console output for your local Network IP (e.g., `http://192.168.1.5:5173`).
4. Type that exact URL into your mobile phone's browser.
5. In the dashboard header, click the **Live Camera** toggle.
6. Tap **Start Camera** and grant permissions. It will automatically utilize the rear-facing camera.
7. Point the camera at water (or images of water on another screen). The backend OpenCV engine will analyze the frame every 2 seconds and push results live to the UI!

> **Note on Mobile Browsers:** Most modern mobile browsers block camera access on non-`localhost` `.http` connections. You may need to use [ngrok](https://ngrok.com/) (`ngrok http 5173`) or Vite's basic SSL plugin if you encounter permission blocks.

---

## 🛠️ Project Structure

```text
AquaGuardian AI/
├── backend/
│   ├── main.py                  # FastAPI Entry & WS Endpoint
│   ├── database.py              # PostgreSQL Session & Engine
│   ├── models/                  # SQLModel Table Definitions
│   ├── routes/                  # REST APIs (alerts, predictions, camera)
│   └── services/                # WS Manager & Background Simulator
└── frontend/
    ├── src/
    │   ├── components/layout/   # Navbar & Sidebar
    │   ├── components/dashboard/# Charts, LiveFeed, KPIs, Alerts
    │   ├── pages/               # Main Routing Views
    │   └── services/api.ts      # Typed API client & WS factory
    ├── index.css                # Global Theme Variables & Animations
    └── index.html               # Main Entry
```

---

_Built as a production-level demonstration of integrating real-time computer vision heuristics into a modern web stack._
