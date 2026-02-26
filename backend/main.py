import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from routes import prediction, alerts
from routes import camera_prediction
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


import json
from routes.camera_prediction import process_ws_frame

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
                if msg.get("type") == "camera_frame":
                    await process_ws_frame(msg)
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
def health():
    return {"status": "ok", "service": "AquaGuardian AI"}
