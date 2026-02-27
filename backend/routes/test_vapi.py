from fastapi import APIRouter, HTTPException
import asyncio
from services.critical_alert_service import critical_alert_service

router = APIRouter(prefix="/api/test", tags=["test"])

@router.post("/trigger-call")
async def trigger_vapi_call_manually():
    """
    Simulate a CRITICAL incident to explicitly force the API to dial out via Vapi.
    This bypasses normal camera threshold wait times but still runs through the locking mechanism.
    If the system is in cooldown, it will NOT dial unless you restart the backend to reset memory state.
    """
    mock_prediction = {
        "site_id": "TEST-SITE",
        "status": "pollutant",
        "turbidity": 99.9, # Guarantees threshold trigger
        "confidence": 99.0,
        "ph": 3.0
    }
    
    # Run in background to instantly return 200 OK while httpx handles outbound connectivity
    asyncio.create_task(critical_alert_service.check_and_trigger(mock_prediction))
    
    return {
        "message": "Manual trigger event sent to Critical Alert System.",
        "incident_lock_status": "Vapi sequence spinning up if not in cooldown."
    }
