"""
CIRO Backend — FastAPI Server
Crisis Intelligence & Response Orchestrator
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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
        import google.generativeai as genai
        import os
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        return {"response": "I'm having trouble connecting to the swarm right now. Please stay safe and try again shortly."}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=DEBUG)
