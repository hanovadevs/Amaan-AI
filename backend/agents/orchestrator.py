"""
ZAVIA Orchestrator â€” Chains all 6 agents into a single pipeline.
Now with Gemini AI reasoning, live weather/maps tool integration,
and [SIMULATED] data markers.
"""
import time
import logging
import threading
from typing import List
from datetime import datetime

from models import (
    SignalInput, PipelineResponse, CrisisSignalRequest, SignalSource
)
from .signal_ingestion import SignalIngestionAgent
from .crisis_detection import CrisisDetectionAgent
from .situation_analysis import SituationAnalysisAgent
from .action_planning import ActionPlanningAgent
from .simulation_execution import SimulationExecutionAgent
from .outcome_visualization import OutcomeVisualizationAgent

logger = logging.getLogger("zavia.orchestrator")


class ZAVIAOrchestrator:
    """
    The master orchestrator that coordinates all 6 ZAVIA agents
    in sequence, passing context and tool results between them.
    
    Integrates:
    - Gemini AI for enhanced agent reasoning (optional)
    - OpenWeatherMap for live weather corroboration (optional)
    - Google Maps for traffic data and alternate routes (optional)
    """

    def __init__(self):
        self.agent1 = SignalIngestionAgent()
        self.agent2 = CrisisDetectionAgent()
        self.agent3 = SituationAnalysisAgent()
        self.agent4 = ActionPlanningAgent()
        self.agent5 = SimulationExecutionAgent()
        self.agent6 = OutcomeVisualizationAgent()

        # Initialize tool clients (graceful if keys missing)
        self._init_tools()

    def _init_tools(self):
        """Initialize external tool clients. All are optional."""
        try:
            from tools.gemini_client import get_gemini_client
            self.gemini = get_gemini_client()
        except Exception:
            self.gemini = None

        try:
            from tools.weather_client import get_weather_client
            self.weather = get_weather_client()
        except Exception:
            self.weather = None

        try:
            from tools.maps_client import get_maps_client
            self.maps = get_maps_client()
        except Exception:
            self.maps = None

        try:
            from tools.firebase_client import get_firebase_client
            self.firebase = get_firebase_client()
        except Exception:
            self.firebase = None

    def _timestamp(self) -> str:
        return datetime.utcnow().strftime("%H:%M:%S")

    def _get_tool_status(self) -> dict:
        """Return status of all tool integrations."""
        return {
            "gemini_ai": getattr(self.gemini, 'available', False),
            "openweathermap": getattr(self.weather, 'available', False),
            "google_maps": getattr(self.maps, 'available', False),
            "firebase": getattr(self.firebase, 'available', False),
        }

    def _persist_pipeline_async(self, crisis_report, response_plan, outcome, city: str, trace_log: list) -> None:
        """Persist pipeline results without delaying the API response."""
        if not self.firebase or not self.firebase.available:
            return

        def _persist():
            try:
                self.firebase.save_pipeline_run({
                    "crisis_type": crisis_report.crisis_type.value,
                    "location": crisis_report.location,
                    "severity": crisis_report.severity.value,
                    "confidence": crisis_report.confidence_score,
                    "status": outcome.resolution_status.value,
                    "affected_people": crisis_report.estimated_affected_people,
                    "actions_count": len(response_plan.actions),
                    "pipeline_duration_ms": outcome.total_pipeline_duration_ms,
                    "city": city,
                })
                self.firebase.save_crisis_report({
                    "crisis_type": crisis_report.crisis_type.value,
                    "location": crisis_report.location,
                    "severity": crisis_report.severity.value,
                    "confidence": crisis_report.confidence_score,
                    "reasoning": crisis_report.reasoning,
                    "affected_radius_km": crisis_report.affected_radius_km,
                    "estimated_affected_people": crisis_report.estimated_affected_people,
                    "impact_summary": outcome.impact_summary,
                })
                logger.info("Pipeline data persisted to Firestore")
            except Exception as fb_err:
                logger.warning(f"Firebase persistence failed: {fb_err}")

        threading.Thread(target=_persist, daemon=True).start()
        trace_log.append(
            f"[{self._timestamp()}] Firebase               -> Pipeline persistence queued."
        )

    # â”€â”€â”€ Demo Scenarios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def get_demo_signals(self, scenario: str = "flooding") -> List[SignalInput]:
        """Built-in demo scenarios for hackathon presentation."""
        scenarios = {
            "flooding": [
                SignalInput(
                    text="G-10 mein pani bhar gaya hai, gaariyan phans gayi hain",
                    source=SignalSource.SOCIAL_MEDIA,
                ),
                SignalInput(
                    source=SignalSource.WEATHER_API,
                    weather_data={
                        "location": "Islamabad", "rainfall_mm": 87,
                        "alert": "heavy_rain_warning", "temperature_c": 28,
                    },
                ),
                SignalInput(
                    source=SignalSource.MAPS_API,
                    traffic_data={
                        "area": "G-10 Markaz", "congestion_percent": 340, "avg_speed": 4,
                    },
                ),
            ],
            "fire": [
                SignalInput(
                    text="F-8 mein aag lag gayi hai, dhuan bohat hai, log bhaag rahe hain",
                    source=SignalSource.SOCIAL_MEDIA,
                ),
                SignalInput(
                    text="Major fire reported at F-8 Markaz, multiple shops affected",
                    source=SignalSource.MANUAL,
                ),
                SignalInput(
                    source=SignalSource.MAPS_API,
                    traffic_data={
                        "area": "F-8 Markaz", "congestion_percent": 200, "avg_speed": 8,
                    },
                ),
            ],
            "accident": [
                SignalInput(
                    text="Srinagar Highway par bada hadsa ho gaya hai, ambulance chahiye",
                    source=SignalSource.SOCIAL_MEDIA,
                ),
                SignalInput(
                    text="Multi-vehicle collision on Srinagar Highway near G-10 exit. Road blocked.",
                    source=SignalSource.MANUAL,
                ),
            ],
            "heatwave": [
                SignalInput(
                    text="Lahore mein bohot garmi hai, loo chal rahi hai, 3 log behosh ho gaye",
                    source=SignalSource.SOCIAL_MEDIA,
                ),
                SignalInput(
                    source=SignalSource.WEATHER_API,
                    weather_data={
                        "location": "Lahore", "rainfall_mm": 0,
                        "alert": "extreme_heat_warning", "temperature_c": 46,
                    },
                ),
            ],
            "power_outage": [
                SignalInput(
                    text="G-9 mein bijli nahi hai, andhera ho gaya, pichle 3 ghante se light nahi aayi",
                    source=SignalSource.SOCIAL_MEDIA,
                ),
                SignalInput(
                    text="Power outage affecting G-8 to G-11 sectors. IESCO transformer fault reported.",
                    source=SignalSource.MANUAL,
                ),
            ],
        }
        return scenarios.get(scenario, scenarios["flooding"])

    # â”€â”€â”€ Auto-Enrichment via Tool Integration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def _enrich_with_weather(self, signals: List[SignalInput], city: str) -> List[SignalInput]:
        """Auto-fetch weather data and add as a signal if not already present."""
        has_weather = any(s.source == SignalSource.WEATHER_API for s in signals)
        if has_weather or not self.weather:
            return signals

        try:
            weather = self.weather.get_current_weather(city)
            source_tag = "[LIVE]" if weather.get("source") == "live_api" else "[SIMULATED]"
            weather_signal = SignalInput(
                source=SignalSource.WEATHER_API,
                weather_data={
                    "location": city.title(),
                    "rainfall_mm": weather.get("rainfall_mm", 0),
                    "alert": weather.get("alert", "none"),
                    "temperature_c": weather.get("temperature_c", 30),
                    "humidity": weather.get("humidity", 50),
                    "source_tag": source_tag,
                },
            )
            logger.info(f"Weather enrichment {source_tag}: {weather.get('description', 'N/A')}")
            return signals + [weather_signal]
        except Exception as e:
            logger.warning(f"Weather enrichment failed: {e}")
            return signals

    def _enrich_with_traffic(self, signals: List[SignalInput], location: str) -> List[SignalInput]:
        """Auto-fetch traffic data for the detected location."""
        has_traffic = any(s.source == SignalSource.MAPS_API for s in signals)
        if has_traffic or not self.maps:
            return signals

        try:
            traffic = self.maps.get_traffic(location)
            source_tag = "[LIVE]" if traffic.get("source") == "live_api" else "[SIMULATED]"
            traffic_signal = SignalInput(
                source=SignalSource.MAPS_API,
                traffic_data={
                    "area": location,
                    "congestion_percent": traffic.get("congestion_percent", 100),
                    "avg_speed": traffic.get("avg_speed_kmh", 20),
                    "source_tag": source_tag,
                },
            )
            logger.info(f"Traffic enrichment {source_tag}: {traffic.get('congestion_percent')}% congestion")
            return signals + [traffic_signal]
        except Exception as e:
            logger.warning(f"Traffic enrichment failed: {e}")
            return signals

    # â”€â”€â”€ Main Pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def run_pipeline(self, request: CrisisSignalRequest) -> PipelineResponse:
        """
        Execute the full 6-agent pipeline with tool integration.
        
        INGEST â†’ DETECT â†’ ANALYZE â†’ PLAN â†’ SIMULATE â†’ VISUALIZE
        
        Each agent receives optional tool results for enhanced reasoning.
        """
        trace_log = []
        agent_summaries = []
        tool_status = self._get_tool_status()
        pipeline_start = time.time()

        try:
            # Use demo signals if requested or no signals provided
            signals = request.signals
            if request.force_demo or not signals:
                scenario = getattr(request, 'scenario', 'flooding') or 'flooding'
                signals = self.get_demo_signals(scenario)

            city = request.city or "islamabad"

            # â”€â”€â”€ Auto-Enrich with Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            # Extract a rough location from text signals for traffic enrichment
            text_loc = None
            for sig in signals:
                if sig.text:
                    import re
                    m = re.search(r'[A-Za-z]-\d{1,2}', sig.text)
                    if m:
                        text_loc = m.group(0)
                        break

            signals = self._enrich_with_weather(signals, city)
            if text_loc:
                signals = self._enrich_with_traffic(signals, text_loc)

            # â”€â”€â”€ Agent 1: Signal Ingestion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            t0 = time.time()
            parsed_signals = self.agent1.run(signals)
            dt1 = int((time.time() - t0) * 1000)
            locs = set(s.extracted_location for s in parsed_signals)
            kws = []
            for s in parsed_signals:
                kws.extend(s.event_keywords[:3])
            trace_log.append(
                f"[{self._timestamp()}] SignalIngestionAgent     â†’ "
                f"{len(parsed_signals)} signals parsed. "
                f"Locations: {', '.join(locs)}. "
                f"Keywords: {', '.join(list(set(kws))[:6])}."
            )
            agent_summaries.append(
                f"{len(parsed_signals)} signals parsed from {len(set(s.source for s in parsed_signals))} sources"
            )

            # â”€â”€â”€ Agent 2: Crisis Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            t0 = time.time()
            crisis_report = self.agent2.run(parsed_signals, gemini=self.gemini)
            dt2 = int((time.time() - t0) * 1000)
            trace_log.append(
                f"[{self._timestamp()}] CrisisDetectionAgent     â†’ "
                f"CRISIS DETECTED: {crisis_report.crisis_type.value.replace('_',' ').title()}. "
                f"Confidence: {crisis_report.confidence.value.upper()} ({crisis_report.confidence_score})."
            )
            agent_summaries.append(
                f"CRISIS: {crisis_report.crisis_type.value} confidence={crisis_report.confidence_score}"
            )

            # â”€â”€â”€ Agent 3: Situation Analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            t0 = time.time()
            assessment = self.agent3.run(
                crisis_report, gemini=self.gemini, maps=self.maps, weather=self.weather
            )
            dt3 = int((time.time() - t0) * 1000)
            trace_log.append(
                f"[{self._timestamp()}] SituationAnalysisAgent   â†’ "
                f"Cascading impacts: {len(assessment.secondary_impacts)}. "
                f"Escalation risk: {assessment.risk_escalation_probability:.0%}. "
                f"Urgency: {assessment.recommended_urgency}."
            )
            agent_summaries.append(
                f"Escalation risk {assessment.risk_escalation_probability:.0%}, urgency {assessment.recommended_urgency}"
            )

            # â”€â”€â”€ Agent 4: Action Planning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            t0 = time.time()
            response_plan = self.agent4.run(
                crisis_report, assessment, gemini=self.gemini, maps=self.maps
            )
            dt4 = int((time.time() - t0) * 1000)
            trace_log.append(
                f"[{self._timestamp()}] ActionPlanningAgent      â†’ "
                f"{len(response_plan.actions)} actions planned. "
                f"Priority: {response_plan.priority}."
            )
            agent_summaries.append(
                f"{len(response_plan.actions)} actions, priority {response_plan.priority}"
            )

            # â”€â”€â”€ Agent 5: Simulation Execution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            t0 = time.time()
            sim_log = self.agent5.run(response_plan)
            dt5 = int((time.time() - t0) * 1000)
            sim_types = [s.simulation_type for s in sim_log.simulations]
            trace_log.append(
                f"[{self._timestamp()}] SimulationExecutionAgent â†’ "
                f"All {len(sim_log.simulations)} actions simulated. "
                f"Types: {', '.join(sim_types)}."
            )
            agent_summaries.append(f"Simulated {len(sim_log.simulations)} actions")

            # â”€â”€â”€ Agent 6: Outcome Visualization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            t0 = time.time()
            total_pipeline_ms = int((time.time() - pipeline_start) * 1000)
            outcome = self.agent6.run(
                crisis_report, sim_log, agent_summaries,
                gemini=self.gemini, total_pipeline_ms=total_pipeline_ms
            )
            dt6 = int((time.time() - t0) * 1000)
            trace_log.append(
                f"[{self._timestamp()}] OutcomeVisualizationAgent â†’ "
                f"Outcome report generated. "
                f"Status: {outcome.resolution_status.value.upper().replace('_',' ')}."
            )

            # â”€â”€â”€ Persist to Firebase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            if self.firebase and self.firebase.available:
                self._persist_pipeline_async(crisis_report, response_plan, outcome, city, trace_log)

            return PipelineResponse(
                signals=parsed_signals,
                crisis_report=crisis_report,
                situation_assessment=assessment,
                response_plan=response_plan,
                simulation_log=sim_log,
                outcome_report=outcome,
                agent_trace_log=trace_log,
                pipeline_success=True,
                tool_status=tool_status,
            )

        except Exception as e:
            trace_log.append(f"[{self._timestamp()}] PIPELINE ERROR: {str(e)}")
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            return PipelineResponse(
                agent_trace_log=trace_log,
                pipeline_success=False,
                error=str(e),
                tool_status=tool_status,
            )
