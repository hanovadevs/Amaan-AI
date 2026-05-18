"""
Agent 4 — ActionPlanningAgent
Generates coordinated, prioritized response actions.
Uses Maps API for alternate routes and Gemini for reasoning.
"""
from typing import Optional
from models import (
    CrisisReport, SituationAssessment, ResponsePlan, ResponseAction,
    ActionType, CrisisType
)

ACTION_TEMPLATES = {
    CrisisType.URBAN_FLOODING: [
        ResponseAction(action_type=ActionType.TRAFFIC_REROUTING, priority=1,
            description="Redirect traffic from {loc} Markaz via Srinagar Highway",
            target_routes=["{loc} to adjacent sector via Route 7B", "Blue Area bypass via IJP Road"],
            estimated_impact="Reduce congestion by 60% within 20 minutes",
            assigned_to="TrafficControlAgent"),
        ResponseAction(action_type=ActionType.EMERGENCY_DISPATCH, priority=2,
            description="Dispatch rescue squad and water pumps to {loc}",
            resources=["2x rescue vehicles", "1x water pump truck", "medical team"],
            eta_minutes=12, assigned_to="EmergencyDispatchAgent"),
        ResponseAction(action_type=ActionType.CITIZEN_ALERT, priority=3,
            description="Push emergency alert to all users within 5km radius",
            message="⚠️ Flash flood in {loc}. Avoid Markaz road. Use alternate routes.",
            channels=["push_notification", "sms_simulation", "in_app_banner"],
            assigned_to="AlertBroadcastAgent"),
        ResponseAction(action_type=ActionType.INFRASTRUCTURE_RESPONSE, priority=4,
            description="Notify WASA to activate emergency drainage protocol for {loc}",
            eta_minutes=5, assigned_to="InfrastructureAgent"),
    ],
    CrisisType.FIRE: [
        ResponseAction(action_type=ActionType.EMERGENCY_DISPATCH, priority=1,
            description="Dispatch fire brigade to {loc} — Code Red",
            resources=["3x fire engines", "1x ladder truck", "2x ambulances"],
            eta_minutes=8, assigned_to="EmergencyDispatchAgent"),
        ResponseAction(action_type=ActionType.EVACUATION, priority=2,
            description="Initiate evacuation of 500m radius around {loc}",
            resources=["Police units", "Civil defense volunteers"],
            eta_minutes=5, assigned_to="EvacuationAgent"),
        ResponseAction(action_type=ActionType.CITIZEN_ALERT, priority=3,
            description="Emergency fire alert — evacuate area",
            message="🔥 FIRE in {loc}. Evacuate immediately. Move upwind.",
            channels=["push_notification", "sms_simulation", "emergency_siren"],
            assigned_to="AlertBroadcastAgent"),
        ResponseAction(action_type=ActionType.TRAFFIC_REROUTING, priority=4,
            description="Clear routes for emergency vehicles to {loc}",
            target_routes=["Emergency corridor via main highway"],
            assigned_to="TrafficControlAgent"),
    ],
    CrisisType.ROAD_BLOCKAGE: [
        ResponseAction(action_type=ActionType.TRAFFIC_REROUTING, priority=1,
            description="Compute and deploy alternate routes around {loc}",
            target_routes=["Bypass via parallel roads", "Highway diversion"],
            estimated_impact="Reduce congestion by 50% within 15 minutes",
            assigned_to="TrafficControlAgent"),
        ResponseAction(action_type=ActionType.CITIZEN_ALERT, priority=2,
            description="Traffic advisory for {loc} area",
            message="🚗 Road blocked at {loc}. Use alternate routes. Check app for navigation.",
            channels=["push_notification", "in_app_banner"],
            assigned_to="AlertBroadcastAgent"),
        ResponseAction(action_type=ActionType.EMERGENCY_DISPATCH, priority=3,
            description="Deploy traffic police to {loc} for manual control",
            resources=["4x traffic police officers", "temporary signage"],
            eta_minutes=15, assigned_to="EmergencyDispatchAgent"),
    ],
    CrisisType.ACCIDENT: [
        ResponseAction(action_type=ActionType.EMERGENCY_DISPATCH, priority=1,
            description="Dispatch ambulance and rescue to {loc}",
            resources=["2x ambulances", "rescue unit", "traffic police"],
            eta_minutes=10, assigned_to="EmergencyDispatchAgent"),
        ResponseAction(action_type=ActionType.TRAFFIC_REROUTING, priority=2,
            description="Reroute traffic around accident site at {loc}",
            target_routes=["Bypass via service road"],
            estimated_impact="Clear emergency corridor within 5 minutes",
            assigned_to="TrafficControlAgent"),
        ResponseAction(action_type=ActionType.CITIZEN_ALERT, priority=3,
            description="Accident alert for {loc} area",
            message="🚨 Accident at {loc}. Avoid area. Emergency services en route.",
            channels=["push_notification", "in_app_banner"],
            assigned_to="AlertBroadcastAgent"),
    ],
    CrisisType.HEATWAVE: [
        ResponseAction(action_type=ActionType.CITIZEN_ALERT, priority=1,
            description="Heat advisory broadcast for affected area",
            message="🌡️ Extreme heat in {loc}. Stay indoors. Hydrate. Check on elderly neighbors.",
            channels=["push_notification", "sms_simulation", "in_app_banner"],
            assigned_to="AlertBroadcastAgent"),
        ResponseAction(action_type=ActionType.EMERGENCY_DISPATCH, priority=2,
            description="Deploy heat relief stations in {loc}",
            resources=["Water tankers", "Shade canopies", "Medical teams"],
            eta_minutes=20, assigned_to="EmergencyDispatchAgent"),
        ResponseAction(action_type=ActionType.INFRASTRUCTURE_RESPONSE, priority=3,
            description="Request IESCO load management to prevent blackouts in {loc}",
            eta_minutes=10, assigned_to="InfrastructureAgent"),
    ],
    CrisisType.INFRASTRUCTURE_FAILURE: [
        ResponseAction(action_type=ActionType.INFRASTRUCTURE_RESPONSE, priority=1,
            description="Notify IESCO for emergency power restoration at {loc}",
            resources=["Repair crew", "Mobile generator"],
            eta_minutes=30, assigned_to="InfrastructureAgent"),
        ResponseAction(action_type=ActionType.CITIZEN_ALERT, priority=2,
            description="Power outage advisory for {loc}",
            message="⚡ Power outage in {loc}. IESCO teams dispatched. Estimated restore: 4-6 hours.",
            channels=["push_notification", "in_app_banner"],
            assigned_to="AlertBroadcastAgent"),
        ResponseAction(action_type=ActionType.TRAFFIC_REROUTING, priority=3,
            description="Deploy traffic police to intersections without signals in {loc}",
            resources=["6x traffic police officers"],
            eta_minutes=15, assigned_to="TrafficControlAgent"),
    ],
}

# Default template for any unmapped types
DEFAULT_ACTIONS = [
    ResponseAction(action_type=ActionType.EMERGENCY_DISPATCH, priority=1,
        description="Deploy emergency response team to {loc}",
        resources=["2x emergency vehicles", "medical team"], eta_minutes=10,
        assigned_to="EmergencyDispatchAgent"),
    ResponseAction(action_type=ActionType.CITIZEN_ALERT, priority=2,
        description="Broadcast crisis alert for {loc}",
        message="⚠️ Crisis reported at {loc}. Stay alert. Follow official instructions.",
        channels=["push_notification", "in_app_banner"],
        assigned_to="AlertBroadcastAgent"),
]

class ActionPlanningAgent:
    def __init__(self):
        self.name = "ActionPlanningAgent"

    def _enrich_routes(self, actions, location, maps=None):
        """Replace generic routes with data from Maps API if available."""
        if not maps:
            return actions

        try:
            alt_routes = maps.get_alternate_routes(location)
            if alt_routes:
                for action in actions:
                    if action.action_type == ActionType.TRAFFIC_REROUTING:
                        action.target_routes = [
                            f"{r['route']} — ETA {r['eta_min']} min ({r['congestion']})"
                            for r in alt_routes[:3]
                        ]
                        action.estimated_impact = (
                            f"Reduce congestion via {len(alt_routes)} alternate routes. "
                            f"Fastest: {alt_routes[0]['route']} ({alt_routes[0]['eta_min']} min)"
                        )
        except Exception:
            pass

        return actions

    def run(self, crisis: CrisisReport, assessment: SituationAssessment,
            gemini=None, maps=None) -> ResponsePlan:
        templates = ACTION_TEMPLATES.get(crisis.crisis_type, DEFAULT_ACTIONS)
        loc = crisis.location
        actions = []
        for t in templates:
            a = t.model_copy()
            a.description = a.description.replace("{loc}", loc)
            a.message = a.message.replace("{loc}", loc)
            a.target_routes = [r.replace("{loc}", loc) for r in a.target_routes]
            actions.append(a)

        # Enrich routing actions with Maps API data
        actions = self._enrich_routes(actions, loc, maps)

        total_time = max(a.eta_minutes for a in actions if a.eta_minutes > 0) + 20 if actions else 30

        # Try Gemini-enhanced reasoning
        reasoning = None
        if gemini:
            reasoning = gemini.reason_action_planning(
                crisis_type=crisis.crisis_type.value,
                location=loc,
                severity=crisis.severity.value,
                urgency=assessment.recommended_urgency,
                num_actions=len(actions),
            )

        if not reasoning:
            reasoning = (
                f"Priority order based on life-safety first, then traffic flow, then infrastructure. "
                f"{len(actions)} actions planned for {crisis.crisis_type.value.replace('_',' ')} "
                f"at {loc}. Urgency: {assessment.recommended_urgency}."
            )

        return ResponsePlan(
            crisis_id=crisis.crisis_id, priority=assessment.recommended_urgency,
            actions=actions, estimated_total_resolution_time=f"{total_time}-{total_time+15} minutes",
            plan_reasoning=reasoning)
