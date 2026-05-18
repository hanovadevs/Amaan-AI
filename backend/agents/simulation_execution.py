"""
Agent 5 — SimulationExecutionAgent
Simulates execution of every action with before/after state changes.
"""
import random
from models import ResponsePlan, ResponseAction, SimulationResult, SimulationLog, ActionType

class SimulationExecutionAgent:
    def __init__(self):
        self.name = "SimulationExecutionAgent"

    def _sim_traffic(self, action: ResponseAction) -> SimulationResult:
        return SimulationResult(
            simulation_type="traffic_rerouting",
            before={"congestion_level": "340%", "avg_speed_kmh": 4, "blocked_routes": [action.description]},
            execution_steps=[
                "Step 1: Maps API called — alternate route computed via Srinagar Highway",
                "Step 2: Digital signage updated — diversion markers activated",
                "Step 3: Traffic police dispatch notification sent",
                "Step 4: Route updated in navigation apps (simulated)",
            ],
            after={"congestion_level": "85%", "avg_speed_kmh": 22, "rerouted_vehicles": 1240,
                   "time_elapsed_simulation": f"{action.eta_minutes or 18} minutes"})

    def _sim_emergency(self, action: ResponseAction) -> SimulationResult:
        ticket = f"EMG-2026-{random.randint(10000,99999)}"
        return SimulationResult(
            simulation_type="emergency_dispatch",
            before={"emergency_response_active": False, "units_available": 5, "ticket": None},
            execution_steps=[
                f"Step 1: Emergency ticket {ticket} created",
                f"Step 2: Units dispatched: {', '.join(action.resources[:3])}",
                "Step 3: Route computed avoiding crisis zone",
                f"Step 4: Arrived at scene — ETA: {action.eta_minutes} min (simulated)",
            ],
            after={"emergency_response_active": True, "ticket_id": ticket,
                   "units_dispatched": action.resources, "eta_minutes": action.eta_minutes})

    def _sim_alert(self, action: ResponseAction) -> SimulationResult:
        total = random.randint(7000, 9000)
        return SimulationResult(
            simulation_type="alert_broadcast",
            before={"citizens_alerted": 0, "channels_active": 0},
            execution_steps=[
                f"Step 1: Alert message composed: {action.message[:60]}...",
                f"Step 2: Push notifications sent to {int(total*0.73)} devices",
                f"Step 3: SMS simulation sent to {int(total*0.21)} numbers",
                f"Step 4: In-app banners activated for {total} users",
            ],
            after={"citizens_alerted": total, "channels": {"push": int(total*0.73),
                   "sms": int(total*0.21), "in_app": total},
                   "delivery_time_seconds": 3, "acknowledgements": int(total*0.49)})

    def _sim_infra(self, action: ResponseAction) -> SimulationResult:
        return SimulationResult(
            simulation_type="infrastructure_response",
            before={"drainage_active": False, "protocol_status": "inactive"},
            execution_steps=[
                "Step 1: WASA emergency hotline contacted (simulated)",
                "Step 2: Emergency drainage protocol activated",
                "Step 3: Pump stations in sector brought online",
                "Step 4: Estimated drainage time: 45 minutes",
            ],
            after={"drainage_active": True, "protocol_status": "active",
                   "estimated_drain_time_minutes": 45})

    def _sim_default(self, action: ResponseAction) -> SimulationResult:
        return SimulationResult(
            simulation_type=action.action_type.value,
            before={"status": "pending"},
            execution_steps=[f"Step 1: {action.description} initiated (simulated)",
                             "Step 2: Resources allocated", "Step 3: Execution complete"],
            after={"status": "completed"})

    def run(self, plan: ResponsePlan) -> SimulationLog:
        sims = []
        total_ms = 0
        for action in plan.actions:
            if action.action_type == ActionType.TRAFFIC_REROUTING:
                sim = self._sim_traffic(action)
            elif action.action_type == ActionType.EMERGENCY_DISPATCH:
                sim = self._sim_emergency(action)
            elif action.action_type == ActionType.CITIZEN_ALERT:
                sim = self._sim_alert(action)
            elif action.action_type == ActionType.INFRASTRUCTURE_RESPONSE:
                sim = self._sim_infra(action)
            else:
                sim = self._sim_default(action)
            sims.append(sim)
            total_ms += random.randint(200, 900)
        return SimulationLog(crisis_id=plan.crisis_id, simulations=sims, total_simulation_duration_ms=total_ms)
