import os
import json
import time
import asyncio
import logging
from typing import Dict, Any, List

from sqlmodel import Session
from database import engine
from models.prediction_model import CallLog
from services.vapi_call_service import trigger_vapi_call

logger = logging.getLogger("CriticalAlertService")

# Simple state machine to prevent call-spam during an ongoing incident
class CriticalAlertService:
    def __init__(self):
        # Store state per site. site_id -> state details
        # For simplicity, we just keep the last call time and whether it's currently a critical incident
        self.site_incidents: Dict[str, Dict[str, Any]] = {}

        # Cooldown in seconds before calling again for the same site
        self.COOLDOWN_SECONDS = 600  # 10 minutes

        # Critical Threshold
        self.CRITICAL_SCORE_THRESHOLD = 0.85
        self.CRITICAL_NTU_THRESHOLD = 45.0

        # Load emergency contacts
        self.contacts = self._load_contacts()

    def _load_contacts(self) -> List[Dict[str, str]]:
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "emergency_contacts.json")
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load emergency contacts. Ensure config/emergency_contacts.json exists. Error: {e}")
            return []

    async def check_and_trigger(self, prediction_data: dict):
        """
        Ingests a dictionary of prediction logic. If critical, checks if an auto-call should be triggered.
        """
        site_id = prediction_data.get("site_id", "SITE-01")
        turbidity = prediction_data.get("turbidity", 0.0)
        status = prediction_data.get("status", "unknown")
        
        # Determine if this frame implies a CRITICAL emergency (high turbidity or directly marked as pollutant)
        is_critical = status == "pollutant" and turbidity > self.CRITICAL_NTU_THRESHOLD
        contamination_score = min(1.0, turbidity / 100.0) # crude normalized score for this example

        if site_id not in self.site_incidents:
            self.site_incidents[site_id] = {
                "in_critical_incident": False,
                "last_call_time": 0.0,
                "normal_frames": 0
            }
            
        state = self.site_incidents[site_id]
        now = time.time()

        if is_critical:
            state["normal_frames"] = 0
            
            cooldown_expired = (now - state["last_call_time"]) > self.COOLDOWN_SECONDS
            
            if not state["in_critical_incident"]:
                logger.warning(f"CRITICAL CONTAMINATION DETECTED at {site_id}. Locking incident state.")
                state["in_critical_incident"] = True

            if cooldown_expired:
                logger.warning(f"Initiating emergency call protocol for {site_id}...")
                state["last_call_time"] = now
                asyncio.create_task(self._execute_call_sequence(site_id, contamination_score))
                
        else:
            # If it's safe, increment counter. We require 10 consecutive safe frames to reset the lock
            if state["in_critical_incident"]:
                state["normal_frames"] += 1
                if state["normal_frames"] >= 10:
                    logger.info(f"{site_id} has stabilized. Lifting incident lock.")
                    state["in_critical_incident"] = False
                    state["normal_frames"] = 0


    async def _execute_call_sequence(self, site_id: str, score: float):
        """
        Sequentially tries to contact people in the emergency_contacts list.
        """
        if not self.contacts:
            logger.error("No emergency contacts configured for AI Outbound dialing.")
            return

        logger.info(f"Initiating AI Voice Call protocol for {len(self.contacts)} contacts...")

        for contact in self.contacts:
            phone_number = contact.get("phone")
            name = contact.get("name", "Unknown Operator")
            
            if not phone_number:
                continue
                
            logger.info(f"Dialing {name} ({phone_number}) via Vapi...")
            
            # Call the external API
            success = await trigger_vapi_call(phone_number, score)
            call_status = "completed" if success else "failed"

            # Log to Database
            self._log_call(phone_number, call_status, score, site_id)

            # In a real system, you might stop iterating if the first person picks up.
            # Vapi webhooks could provide that data back. We'll simply call them all concurrently
            # or sequentially depending on the requirement. 
            # Sequential with minimal delay for demonstration:
            await asyncio.sleep(1.0)


    def _log_call(self, phone: str, status: str, score: float, site_id: str):
        try:
            with Session(engine) as session:
                log_entry = CallLog(
                    phone_number=phone,
                    status=status,
                    contamination_score=score,
                    site_id=site_id
                )
                session.add(log_entry)
                session.commit()
                logger.info(f"DB: Logged Vapi call to {phone} as {status}.")
        except Exception as e:
            logger.error(f"Failed to log call to database: {e}")

# Global instance
critical_alert_service = CriticalAlertService()
