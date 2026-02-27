from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel


class Prediction(SQLModel, table=True):
    __tablename__ = "predictions"

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str  # "clear" | "moderate" | "pollutant"
    confidence: float
    turbidity: float  # NTU
    ph: float
    compliance_score: float
    site_id: str = Field(default="SITE-01")


class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: str  # "info" | "warning" | "critical"
    message: str
    site_id: str = Field(default="SITE-01")
    acknowledged: bool = Field(default=False)

class CallLog(SQLModel, table=True):
    __tablename__ = "call_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    phone_number: str
    status: str  # "triggered", "failed", "completed"
    contamination_score: float
    site_id: str = Field(default="SITE-01")
