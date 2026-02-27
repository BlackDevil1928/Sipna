import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from routes import prediction, alerts
from routes import camera_prediction, pairing, test_vapi, debug_inference
from services.websocket_manager import manager
from services.simulator import run_simulator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    create_db_and_tables()
    # Start background simulator
    task = asyncio.create_task(run_simulator())
    yield
    task.cancel()


app = FastAPI(
    title="AquaGuardian AI",
    description="Industrial Wastewater Monitoring API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction.router)
app.include_router(alerts.router)
app.include_router(camera_prediction.router)
app.include_router(pairing.router)
app.include_router(test_vapi.router)
app.include_router(debug_inference.router)


import json
from routes.camera_prediction import process_ws_frame
from services.pairing_manager import pairing_manager

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                continue
            try:
                msg = json.loads(data)
                
                # --- MOBILE JOINING A QR SESSION ---
                if msg.get("type") == "JOIN_SESSION":
                    session_id = msg.get("session_id")
                    if session_id and pairing_manager.validate_and_connect(session_id):
                        # Notify everyone (especially the waiting Dashboard) that this session is live
                        await manager.broadcast({
                            "type": "SESSION_CONNECTED",
                            "session_id": session_id
                        })
                
                # --- INCOMING CAMERA FRAME ---
                elif msg.get("type") == "camera_frame":
                    await process_ws_frame(msg)
                    
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
def health():
    return {"status": "ok", "service": "AquaGuardian AI"}
