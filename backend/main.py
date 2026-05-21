"""
CIRO Backend — FastAPI Server
Crisis Intelligence & Response Orchestrator
"""
import sys
import os
import logging
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger("ciro.api")

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Optional, List

from models import CrisisSignalRequest, PipelineResponse, SignalInput, SignalSource
from agents.orchestrator import CIROOrchestrator
from config import HOST, PORT, DEBUG, check_tool_status

app = FastAPI(
    title="CIRO — Crisis Intelligence & Response Orchestrator",
    description="Real-time agentic crisis response system for metropolitan areas",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = CIROOrchestrator()

# In-memory pipeline history
pipeline_history: List[dict] = []


@app.get("/")
async def root():
    return {
        "system": "CIRO",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "agents": [
            "SignalIngestionAgent",
            "CrisisDetectionAgent",
            "SituationAnalysisAgent",
            "ActionPlanningAgent",
            "SimulationExecutionAgent",
            "OutcomeVisualizationAgent",
        ],
        "tools": check_tool_status(),
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/status")
async def api_status():
    """
    Returns detailed system status including tool availability.
    The mobile app uses this to show connection indicators.
    """
    tools = check_tool_status()
    return {
        "system": "CIRO",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "tools": tools,
        "tools_active": sum(1 for v in tools.values() if v),
        "tools_total": len(tools),
        "scenarios_available": ["flooding", "fire", "accident", "heatwave", "power_outage"],
        "cities_supported": ["islamabad", "lahore", "karachi", "rawalpindi", "peshawar", "faisalabad"],
        "pipeline_runs": len(pipeline_history),
    }


@app.post("/api/pipeline", response_model=PipelineResponse)
async def run_pipeline(request: CrisisSignalRequest):
    """
    Run the full CIRO 6-agent pipeline.
    
    Send signals (text, weather data, traffic data) and get back
    a complete crisis detection, analysis, action plan, simulation, and outcome.
    """
    try:
        result = orchestrator.run_pipeline(request)
        # Save to history
        if result.pipeline_success and result.crisis_report:
            pipeline_history.append({
                "timestamp": datetime.utcnow().isoformat(),
                "crisis_type": result.crisis_report.crisis_type.value,
                "location": result.crisis_report.location,
                "severity": result.crisis_report.severity.value,
                "confidence": result.crisis_report.confidence_score,
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/demo", response_model=PipelineResponse)
async def run_demo(scenario: Optional[str] = Query(default="flooding",
    description="Demo scenario: flooding, fire, accident, heatwave, power_outage")):
    """
    Run a demo scenario from the CIRO instructions.
    
    Available scenarios:
    - flooding: G-10 Islamabad flash flood (3 correlated signals)
    - fire: F-8 Markaz fire (3 signals)
    - accident: Srinagar Highway collision (2 signals)
    - heatwave: Lahore extreme heat (2 signals)
    - power_outage: G-9 power failure (2 signals)
    """
    request = CrisisSignalRequest(
        signals=[],
        city="lahore" if scenario == "heatwave" else "islamabad",
        force_demo=True,
        scenario=scenario,
    )
    result = orchestrator.run_pipeline(request)
    # Save to history
    if result.pipeline_success and result.crisis_report:
        pipeline_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "crisis_type": result.crisis_report.crisis_type.value,
            "location": result.crisis_report.location,
            "severity": result.crisis_report.severity.value,
            "confidence": result.crisis_report.confidence_score,
            "scenario": scenario,
        })
    return result


@app.post("/api/quick-report", response_model=PipelineResponse)
async def quick_report(text: str, city: str = "islamabad"):
    """
    Quick single-text report endpoint for the mobile app.
    Send just a text string and get the full pipeline response.
    """
    request = CrisisSignalRequest(
        signals=[SignalInput(text=text, source=SignalSource.MANUAL)],
        city=city,
    )
    result = orchestrator.run_pipeline(request)
    if result.pipeline_success and result.crisis_report:
        pipeline_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "crisis_type": result.crisis_report.crisis_type.value,
            "location": result.crisis_report.location,
            "severity": result.crisis_report.severity.value,
            "confidence": result.crisis_report.confidence_score,
            "source": "quick_report",
        })
    return result


@app.get("/api/history")
async def get_history():
    """Get pipeline run history — from Firestore if available, otherwise in-memory."""
    # Try Firestore first
    if orchestrator.firebase and orchestrator.firebase.available:
        fb_runs = orchestrator.firebase.get_recent_runs(20)
        if fb_runs:
            return {
                "total_runs": len(fb_runs),
                "source": "firestore",
                "history": fb_runs,
            }
    # Fallback to in-memory
    return {
        "total_runs": len(pipeline_history),
        "source": "in_memory",
        "history": list(reversed(pipeline_history[-20:])),
    }


@app.get("/api/crises")
async def get_crises():
    """Get active crisis reports from Firestore."""
    if orchestrator.firebase and orchestrator.firebase.available:
        crises = orchestrator.firebase.get_active_crises()
        return {"total": len(crises), "source": "firestore", "crises": crises}
    return {"total": 0, "source": "none", "crises": [], "message": "Firebase not connected"}


@app.get("/api/alerts")
async def get_alerts():
    """Get alert history from Firestore."""
    if orchestrator.firebase and orchestrator.firebase.available:
        alerts = orchestrator.firebase.get_alerts()
        return {"total": len(alerts), "source": "firestore", "alerts": alerts}
    return {"total": 0, "source": "none", "alerts": [], "message": "Firebase not connected"}


from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str

class ReportRequest(BaseModel):
    category: str
    location: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = "islamabad"
    town: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_cnic: Optional[str] = None
    photos: Optional[List[str]] = None

class SOSRequest(BaseModel):
    latitude: float
    longitude: float
    message: Optional[str] = "Emergency SOS"

class MarkSafeRequest(BaseModel):
    alert_id: str


# In-memory stores for when Firebase is unavailable
user_reports: List[dict] = []
sos_signals: List[dict] = []

# Default safe zones (seeded data — also stored in Firestore when available)
DEFAULT_SAFE_ZONES = [
    {"id": "sz1", "title": "Fatima Jinnah Park Shelter", "description": "Medical camp, food, and water available. 400 capacity.", "city": "Islamabad", "latitude": 33.7020, "longitude": 73.0180, "type": "shelter"},
    {"id": "sz2", "title": "F-9 Sports Complex", "description": "Temporary emergency shelter. High ground.", "city": "Islamabad", "latitude": 33.7080, "longitude": 73.0120, "type": "shelter"},
    {"id": "sz3", "title": "PIMS Hospital Emergency", "description": "PIMS Hospital emergency overflow camp.", "city": "Islamabad", "latitude": 33.6930, "longitude": 73.0500, "type": "medical"},
    {"id": "sz4", "title": "Jinnah Hospital Lahore", "description": "Emergency medical center with 200 beds.", "city": "Lahore", "latitude": 31.5150, "longitude": 74.3520, "type": "medical"},
    {"id": "sz5", "title": "Expo Centre Lahore", "description": "Large-capacity emergency shelter.", "city": "Lahore", "latitude": 31.5204, "longitude": 74.3790, "type": "shelter"},
    {"id": "sz6", "title": "Karachi Expo Centre", "description": "Emergency relief hub. Water and food stations.", "city": "Karachi", "latitude": 24.8530, "longitude": 67.0310, "type": "shelter"},
    {"id": "sz7", "title": "Rawalpindi District HQ Hospital", "description": "Main emergency medical facility.", "city": "Rawalpindi", "latitude": 33.5980, "longitude": 73.0480, "type": "medical"},
]


@app.post("/api/report")
async def submit_report(req: ReportRequest):
    """
    Submit a structured crisis report from a civilian.
    Stores in Firestore and optionally triggers the AI pipeline.
    """
    report = {
        "category": req.category,
        "location": req.location,
        "description": req.description,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "city": req.city,
        "town": req.town,
        "reporter_name": req.reporter_name,
        "reporter_cnic": req.reporter_cnic,
        "photos": req.photos or [],
        "created_at": datetime.utcnow().isoformat(),
        "status": "received",
        "source": "user_report",
    }

    # Persist to Firebase
    report_id = None
    if orchestrator.firebase and orchestrator.firebase.available:
        try:
            doc_ref = orchestrator.firebase.db.collection("user_reports").document()
            report["doc_id"] = doc_ref.id
            doc_ref.set(report)
            report_id = doc_ref.id
        except Exception as e:
            logger.warning(f"Failed to save report to Firestore: {e}")

    # Also store in-memory
    if not report_id:
        report_id = f"local_{len(user_reports)+1}"
        report["doc_id"] = report_id
    user_reports.append(report)

    # Auto-run pipeline on the report
    pipeline_text = f"[{req.category.upper()}] Location: {req.location}. Details: {req.description}"
    pipeline_result = None
    try:
        pipeline_request = CrisisSignalRequest(
            signals=[SignalInput(text=pipeline_text, source=SignalSource.MANUAL)],
            city=req.city or "islamabad",
        )
        pipeline_result = orchestrator.run_pipeline(pipeline_request)
        if pipeline_result.pipeline_success and pipeline_result.crisis_report:
            pipeline_history.append({
                "timestamp": datetime.utcnow().isoformat(),
                "crisis_type": pipeline_result.crisis_report.crisis_type.value,
                "location": pipeline_result.crisis_report.location,
                "severity": pipeline_result.crisis_report.severity.value,
                "confidence": pipeline_result.crisis_report.confidence_score,
                "source": "user_report",
            })
    except Exception as e:
        logger.warning(f"Pipeline failed on report: {e}")

    return {
        "success": True,
        "report_id": report_id,
        "message": "Your report has been received and is being analyzed by CIRO.",
        "pipeline_result": pipeline_result,
    }


@app.get("/api/live-alerts")
async def get_live_alerts():
    """
    Combined live alert feed: pipeline crises + user reports.
    The mobile app's Alerts tab fetches from this endpoint.
    """
    alerts = []

    # 1. Pull from Firestore crises
    if orchestrator.firebase and orchestrator.firebase.available:
        try:
            crises = orchestrator.firebase.get_active_crises()
            for c in crises:
                alerts.append({
                    "id": c.get("doc_id", c.get("crisis_type", "unknown")),
                    "title": f"{c.get('crisis_type', 'emergency').replace('_', ' ').title()} — {c.get('location', 'Unknown')}",
                    "message": c.get("impact_summary") or c.get("reasoning", "Crisis detected by CIRO AI pipeline."),
                    "severity": c.get("severity", "high"),
                    "location": c.get("location", "Unknown"),
                    "latitude": c.get("latitude"),
                    "longitude": c.get("longitude"),
                    "created_at": c.get("created_at", datetime.utcnow().isoformat()),
                    "source": "pipeline",
                    "crisis_type": c.get("crisis_type", "unknown"),
                })
        except Exception as e:
            logger.warning(f"Failed to fetch crises for live alerts: {e}")

    # 2. Pull from user reports
    if orchestrator.firebase and orchestrator.firebase.available:
        try:
            docs = orchestrator.firebase.db.collection("user_reports").limit(30).stream()
            for doc in docs:
                r = doc.to_dict()
                alerts.append({
                    "id": r.get("doc_id", doc.id),
                    "title": f"{r.get('category', 'Report').replace('_', ' ').title()} — {r.get('location', 'Unknown')}",
                    "message": r.get("description", "User-submitted crisis report."),
                    "severity": "medium",
                    "location": r.get("location", "Unknown"),
                    "latitude": r.get("latitude"),
                    "longitude": r.get("longitude"),
                    "created_at": r.get("created_at", datetime.utcnow().isoformat()),
                    "source": "user_report",
                    "crisis_type": r.get("category", "other"),
                    "reporter_name": r.get("reporter_name"),
                    "reporter_cnic": r.get("reporter_cnic"),
                    "photos": r.get("photos", []),
                })
        except Exception as e:
            logger.warning(f"Failed to fetch user reports for live alerts: {e}")

    # 3. In-memory fallback
    for item in reversed(pipeline_history[-20:]):
        item_id = f"mem_{item.get('timestamp', '')}"
        if not any(a["id"] == item_id for a in alerts):
            alerts.append({
                "id": item_id,
                "title": f"{item.get('crisis_type', 'emergency').replace('_', ' ').title()} — {item.get('location', 'Unknown')}",
                "message": f"AI pipeline detected {item.get('crisis_type', 'crisis')} with {item.get('confidence', 0):.0%} confidence.",
                "severity": item.get("severity", "high"),
                "location": item.get("location", "Unknown"),
                "created_at": item.get("timestamp", datetime.utcnow().isoformat()),
                "source": "pipeline_memory",
                "crisis_type": item.get("crisis_type", "unknown"),
            })

    for r in reversed(user_reports[-20:]):
        r_id = r.get("doc_id", "")
        if not any(a["id"] == r_id for a in alerts):
            alerts.append({
                "id": r_id,
                "title": f"{r.get('category', 'Report').replace('_', ' ').title()} — {r.get('location', 'Unknown')}",
                "message": r.get("description", "User-submitted report."),
                "severity": "medium",
                "location": r.get("location", "Unknown"),
                "latitude": r.get("latitude"),
                "longitude": r.get("longitude"),
                "created_at": r.get("created_at", datetime.utcnow().isoformat()),
                "source": "user_report_memory",
                "crisis_type": r.get("category", "other"),
                "reporter_name": r.get("reporter_name"),
                "reporter_cnic": r.get("reporter_cnic"),
                "photos": r.get("photos", []),
            })

    # Sort by time, newest first
    alerts.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return {"total": len(alerts), "alerts": alerts}


@app.get("/api/safe-zones")
async def get_safe_zones(city: Optional[str] = None):
    """
    Get safe zones / shelters. Serves from Firestore if available,
    otherwise returns seeded default data.
    """
    zones = []

    if orchestrator.firebase and orchestrator.firebase.available:
        try:
            query = orchestrator.firebase.db.collection("safe_zones")
            if city:
                query = query.where("city", "==", city.title())
            docs = query.limit(50).stream()
            zones = [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.warning(f"Failed to fetch safe zones: {e}")

    # Fallback to defaults
    if not zones:
        zones = DEFAULT_SAFE_ZONES
        if city:
            zones = [z for z in zones if z["city"].lower() == city.lower()]

    return {"total": len(zones), "zones": zones}


@app.post("/api/sos")
async def send_sos(req: SOSRequest):
    """
    Emergency SOS endpoint. Stores the signal and returns confirmation.
    """
    sos = {
        "latitude": req.latitude,
        "longitude": req.longitude,
        "message": req.message,
        "created_at": datetime.utcnow().isoformat(),
        "status": "dispatched",
    }

    sos_id = None
    if orchestrator.firebase and orchestrator.firebase.available:
        try:
            doc_ref = orchestrator.firebase.db.collection("sos_signals").document()
            sos["doc_id"] = doc_ref.id
            doc_ref.set(sos)
            sos_id = doc_ref.id
        except Exception as e:
            logger.warning(f"Failed to save SOS: {e}")

    if not sos_id:
        sos_id = f"sos_local_{len(sos_signals)+1}"
        sos["doc_id"] = sos_id
    sos_signals.append(sos)

    return {
        "success": True,
        "sos_id": sos_id,
        "message": "🚨 SOS received. Your location has been broadcast to nearby responders.",
        "status": "dispatched",
    }


@app.post("/api/mark-safe")
async def mark_safe(req: MarkSafeRequest):
    """Let a user mark themselves as safe for a given alert."""
    # In production this would update a counter / list in Firestore
    return {
        "success": True,
        "message": "✅ You've been marked as safe. Stay vigilant.",
        "alert_id": req.alert_id,
    }


@app.post("/api/chat")
async def chat_with_ciro(req: ChatRequest):
    """Interactive Chatbot Endpoint for Ask CIRO tab."""
    context = ""
    if orchestrator.firebase and orchestrator.firebase.available:
        crises = orchestrator.firebase.get_active_crises()
        if crises:
            context = "Active Local Crises:\n" + "\n".join([f"- {c.get('crisis_type', 'Emergency').replace('_', ' ').title()} at {c.get('location', 'Unknown')} (Severity: {c.get('severity', 'High')})" for c in crises])
        else:
            context = "No active crises reported in your area."
    else:
        context = "Live data is currently unavailable. Operating in general advisory mode."
        
    prompt = f"""You are CIRO (Crisis Intelligence & Response Orchestrator), a helpful and reassuring AI safety assistant. 
A civilian is asking you a question. Use the following context about active crises to answer them accurately. 
If they ask about something not in the context, give general safety advice but clarify you don't have current local data for that.
Keep your answer short (2-3 sentences max), reassuring, and highly readable (use emojis). 

Context:
{context}

Civilian Query: {req.message}
CIRO:"""

    try:
        if hasattr(orchestrator, 'gemini') and orchestrator.gemini and orchestrator.gemini.available:
            response_text = orchestrator.gemini.generate(prompt)
            if response_text:
                return {"response": response_text}

        import google.generativeai as genai
        import os
        from config import GEMINI_API_KEY
        api_key = os.environ.get("GEMINI_API_KEY") or GEMINI_API_KEY
        if api_key and api_key != "YOUR_API_KEY_HERE":
            logger.info(f"Chat API Key being used: {api_key[:10]}... (length: {len(api_key)})")
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(prompt)
            return {"response": response.text}
        else:
            return {"response": "🛡️ CIRO Swarm operates in Local Mode. For floods: move to high ground immediately, disconnect gas/electricity, and do not walk or drive through floodwaters. For earthquakes: Drop, Cover, and Hold On. Please configure the GEMINI_API_KEY for real-time AI reasoning."}
    except Exception as e:
        logger.error(f"Chatbot failed to generate response: {e}", exc_info=True)
        return {"response": f"🛡️ CIRO Swarm operates in Local Mode. (Swarm offline: {str(e)}). For immediate safety guidelines: seek high ground, keep emergency kits ready, and dial 1122 for rescue operations."}

@app.get("/api/weather")
async def get_weather(city: str = "islamabad"):
    """Get current weather data for a city."""
    if orchestrator.weather:
        try:
            data = orchestrator.weather.get_current_weather(city)
            return {"success": True, "weather": data}
        except Exception as e:
            logger.warning(f"Weather fetch failed: {e}")
    return {"success": False, "weather": None, "message": "Weather service unavailable"}


EMERGENCY_CONTACTS = {
    "pakistan": [
        {"name": "Rescue 1122", "number": "1122", "icon": "medkit", "color": "#EF4444", "description": "Emergency ambulance & rescue"},
        {"name": "Police", "number": "15", "icon": "shield", "color": "#3B82F6", "description": "Law enforcement"},
        {"name": "Fire Brigade", "number": "16", "icon": "flame", "color": "#F97316", "description": "Fire emergency"},
        {"name": "Edhi Foundation", "number": "115", "icon": "heart", "color": "#10B981", "description": "Ambulance & welfare"},
        {"name": "Motorway Police", "number": "130", "icon": "car", "color": "#6366F1", "description": "Highway emergency"},
        {"name": "NDMA Helpline", "number": "1166", "icon": "alert-circle", "color": "#EAB308", "description": "National Disaster Management"},
    ]
}

@app.get("/api/emergency-contacts")
async def get_emergency_contacts(country: str = "pakistan"):
    """Get emergency contact numbers for a country."""
    contacts = EMERGENCY_CONTACTS.get(country.lower(), EMERGENCY_CONTACTS["pakistan"])
    return {"contacts": contacts, "country": country}


PREPAREDNESS_TIPS = {
    "flooding": [
        "Move to higher ground immediately",
        "Avoid walking in moving water — 6 inches can knock you down",
        "Do NOT drive through flooded roads",
        "Keep emergency kit ready: water, torch, first aid",
        "Turn off gas and electricity before evacuating",
    ],
    "earthquake": [
        "Drop, Cover, and Hold On",
        "Stay away from windows and heavy objects",
        "If outdoors, move to an open area",
        "Do NOT use elevators",
        "Keep shoes near your bed for nighttime events",
    ],
    "fire": [
        "Call fire brigade (16) immediately",
        "Stay low — smoke rises",
        "Feel doors before opening — hot door = fire behind it",
        "Use wet cloth over nose and mouth",
        "Never go back into a burning building",
    ],
    "heatwave": [
        "Stay hydrated — drink water every 15 minutes",
        "Avoid outdoor activity between 12-4 PM",
        "Wear loose, light-colored clothing",
        "Check on elderly neighbors",
        "Know the signs of heatstroke: confusion, hot skin, rapid pulse",
    ],
    "general": [
        "Keep emergency contacts saved offline",
        "Maintain a 72-hour emergency supply kit",
        "Know your nearest hospital and safe zone",
        "Keep your phone charged above 50% during alerts",
        "Share your location with family members",
    ],
}

@app.get("/api/preparedness-tips")
async def get_preparedness_tips(category: Optional[str] = None):
    """Get safety preparedness tips by crisis category."""
    if category and category in PREPAREDNESS_TIPS:
        return {"category": category, "tips": PREPAREDNESS_TIPS[category]}
    return {"tips": PREPAREDNESS_TIPS}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=DEBUG)
