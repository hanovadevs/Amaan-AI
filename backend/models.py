"""
ZAVIA Pydantic Models â€” Data contracts for the entire agent pipeline.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


# â”€â”€â”€ Enums â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class SignalSource(str, Enum):
    SOCIAL_MEDIA = "social_media"
    WEATHER_API = "weather_api"
    MAPS_API = "maps_api"
    MANUAL = "manual"

class Language(str, Enum):
    EN = "en"
    UR = "ur"
    ROMAN_UR = "roman_ur"

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CrisisType(str, Enum):
    URBAN_FLOODING = "urban_flooding"
    HEATWAVE = "heatwave"
    ROAD_BLOCKAGE = "road_blockage"
    ACCIDENT = "accident"
    INFRASTRUCTURE_FAILURE = "infrastructure_failure"
    FIRE = "fire"

class CrisisStatus(str, Enum):
    EMERGING = "emerging"
    ACTIVE = "active"
    ESCALATING = "escalating"
    RESOLVING = "resolving"

class ConfidenceLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

class ActionType(str, Enum):
    TRAFFIC_REROUTING = "traffic_rerouting"
    EMERGENCY_DISPATCH = "emergency_dispatch"
    CITIZEN_ALERT = "citizen_alert"
    INFRASTRUCTURE_RESPONSE = "infrastructure_response"
    EVACUATION = "evacuation"
    MEDICAL_RESPONSE = "medical_response"

class ResolutionStatus(str, Enum):
    SIGNIFICANTLY_MITIGATED = "significantly_mitigated"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    PARTIALLY_MITIGATED = "partially_mitigated"


# â”€â”€â”€ Agent 1: Signal Ingestion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class SignalObject(BaseModel):
    signal_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: SignalSource
    raw_text: str
    language_detected: Language = Language.EN
    extracted_location: str = ""
    event_keywords: List[str] = []
    severity_hint: SeverityLevel = SeverityLevel.MEDIUM
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class SignalInput(BaseModel):
    """Raw input from the mobile app or API"""
    text: Optional[str] = None
    source: SignalSource = SignalSource.MANUAL
    weather_data: Optional[Dict[str, Any]] = None
    traffic_data: Optional[Dict[str, Any]] = None


# â”€â”€â”€ Agent 2: Crisis Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class GeoCoordinates(BaseModel):
    lat: float
    lng: float

class CrisisReport(BaseModel):
    crisis_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    crisis_type: CrisisType
    location: str
    geo_coordinates: GeoCoordinates
    confidence: ConfidenceLevel
    confidence_score: float
    active_signals: List[str] = []
    affected_radius_km: float = 2.5
    estimated_affected_people: int = 0
    severity: SeverityLevel
    status: CrisisStatus = CrisisStatus.ACTIVE
    reasoning: str
    timestamp_detected: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# â”€â”€â”€ Agent 3: Situation Analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class SituationAssessment(BaseModel):
    crisis_id: str
    primary_impact: str
    secondary_impacts: List[str] = []
    risk_escalation_probability: float = 0.0
    time_to_critical: str = ""
    recommended_urgency: str = "IMMEDIATE"
    situation_summary: str = ""


# â”€â”€â”€ Agent 4: Action Planning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ResponseAction(BaseModel):
    action_id: str = Field(default_factory=lambda: f"act_{uuid.uuid4().hex[:6]}")
    action_type: ActionType
    description: str
    target_routes: List[str] = []
    resources: List[str] = []
    eta_minutes: int = 0
    estimated_impact: str = ""
    assigned_to: str = ""
    priority: int = 1
    message: str = ""
    channels: List[str] = []

class ResponsePlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    crisis_id: str
    priority: str = "CRITICAL"
    actions: List[ResponseAction] = []
    estimated_total_resolution_time: str = ""
    plan_reasoning: str = ""


# â”€â”€â”€ Agent 5: Simulation Execution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class SimulationResult(BaseModel):
    simulation_type: str
    before: Dict[str, Any] = {}
    execution_steps: List[str] = []
    after: Dict[str, Any] = {}

class SimulationLog(BaseModel):
    crisis_id: str
    simulations: List[SimulationResult] = []
    total_simulation_duration_ms: int = 0


# â”€â”€â”€ Agent 6: Outcome Visualization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class AgentTraceEntry(BaseModel):
    agent: str
    status: str = "completed"
    duration_ms: int = 0
    summary: str = ""

class OutcomeReport(BaseModel):
    outcome_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    crisis_id: str
    resolution_status: ResolutionStatus
    before_state: Dict[str, Any] = {}
    after_state: Dict[str, Any] = {}
    impact_summary: str = ""
    agent_trace: List[AgentTraceEntry] = []
    total_pipeline_duration_ms: int = 0


# â”€â”€â”€ Full Pipeline Response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class PipelineResponse(BaseModel):
    """The complete response from the ZAVIA agent pipeline."""
    signals: List[SignalObject] = []
    crisis_report: Optional[CrisisReport] = None
    situation_assessment: Optional[SituationAssessment] = None
    response_plan: Optional[ResponsePlan] = None
    simulation_log: Optional[SimulationLog] = None
    outcome_report: Optional[OutcomeReport] = None
    agent_trace_log: List[str] = []
    pipeline_success: bool = True
    error: Optional[str] = None
    tool_status: Dict[str, Any] = {}


# â”€â”€â”€ API Request Models â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CrisisSignalRequest(BaseModel):
    """What the mobile app sends to trigger the pipeline."""
    signals: List[SignalInput]
    city: str = "islamabad"
    force_demo: bool = False  # If true, use the example scenario from the instructions
    scenario: Optional[str] = None  # Demo scenario: flooding, fire, accident, heatwave, power_outage
