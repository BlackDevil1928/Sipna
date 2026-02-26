from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from database import get_session
from models.prediction_model import Prediction
from services.simulator import simulate_prediction

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/latest", response_model=Optional[Prediction])
def get_latest(site_id: str = "SITE-01", session: Session = Depends(get_session)):
    statement = (
        select(Prediction)
        .where(Prediction.site_id == site_id)
        .order_by(Prediction.id.desc())  # type: ignore
        .limit(1)
    )
    result = session.exec(statement).first()
    if result is None:
        # DB is empty (fresh start) — return a synthetic reading instead of 500
        from datetime import datetime
        sim_data = simulate_prediction(site_id)
        sim_data["timestamp"] = datetime.fromisoformat(sim_data["timestamp"])
        return Prediction(**sim_data)
    return result


@router.get("/history", response_model=List[Prediction])
def get_history(
    site_id: str = "SITE-01",
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
):
    statement = (
        select(Prediction)
        .where(Prediction.site_id == site_id)
        .order_by(Prediction.id.desc())  # type: ignore
        .limit(limit)
    )
    results = session.exec(statement).all()
    return list(reversed(results))


@router.get("/simulate")
def simulate_now(site_id: str = "SITE-01"):
    """On-demand single prediction (useful for testing)."""
    return simulate_prediction(site_id)


@router.get("/sites/summary")
def sites_summary(session: Session = Depends(get_session)):
    """Return latest prediction for each site."""
    sites = ["SITE-01", "SITE-02", "SITE-03", "SITE-04"]
    result = []
    for site in sites:
        statement = (
            select(Prediction)
            .where(Prediction.site_id == site)
            .order_by(Prediction.id.desc())  # type: ignore
            .limit(1)
        )
        pred = session.exec(statement).first()
        if pred:
            result.append(pred)
        else:
            # Return a synthetic entry so UI always has data
            from datetime import datetime
            from services.simulator import simulate_prediction as sp
            sim_data = sp(site)
            sim_data["timestamp"] = datetime.fromisoformat(sim_data["timestamp"])
            result.append(Prediction(**sim_data))
    return result
