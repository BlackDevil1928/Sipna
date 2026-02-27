import os
import httpx
import logging
import uuid
from typing import Optional

logger = logging.getLogger("VapiCallService")

VAPI_API_KEY = os.getenv("VAPI_API_KEY", "your_vapi_api_key_here")
VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID", "your_assistant_id_here")
TWILIO_PHONE_NUMBER_ID = os.getenv("TWILIO_PHONE_NUMBER_ID", "your_twilio_number_id_here")
VAPI_URL = "https://api.vapi.ai/call"


async def trigger_vapi_call(phone_number: str, score: float) -> bool:
    """
    Trigger an outbound call using Vapi's REST API.
    Returns True if the call was successfully dispatched, False otherwise.
    """
    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "assistantId": VAPI_ASSISTANT_ID,
        "phoneNumberId": TWILIO_PHONE_NUMBER_ID,
        "customer": {
            "number": phone_number
        },
    }
    
    if TWILIO_PHONE_NUMBER_ID.startswith("PN") or TWILIO_PHONE_NUMBER_ID.startswith("AC"):
        logger.error(f"CRITICAL CONFIG ERROR: You passed '{TWILIO_PHONE_NUMBER_ID}'. This is a Twilio ID, not a Vapi UUID! You must grab the Vapi Phone Number ID from your Vapi Dashboard.")
    
    # Retry logic implementation
    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    VAPI_URL, 
                    headers=headers, 
                    json=payload, 
                    timeout=10.0
                )
                
                if response.status_code in (200, 201):
                    logger.info(f"Successfully triggered Vapi call to {phone_number}. Contamination score: {score}")
                    return True
                else:
                    logger.error(
                        f"Failed to trigger Vapi call to {phone_number}. "
                        f"Attempt {attempt + 1}/{max_retries + 1}. "
                        f"Status: {response.status_code}, Body: {response.text}"
                    )
        except Exception as e:
            logger.error(f"Error making Vapi API request to {phone_number} on attempt {attempt + 1}: {e}")
            
        if attempt < max_retries:
            import asyncio
            await asyncio.sleep(2)  # brief wait before retry
            
    return False
