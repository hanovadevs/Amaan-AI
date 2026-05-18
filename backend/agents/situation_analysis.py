"""
Agent 3 — SituationAnalysisAgent
Deep-reasons about cascading impacts using:
- Maps data for nearby hospitals/schools/facilities
- Weather data for forecast trajectory
- Gemini AI for enhanced situation summary
"""
from typing import Optional
from models import CrisisReport, SituationAssessment, CrisisType, SeverityLevel
from config import SECTORS_ISLAMABAD

# Pre-built impact templates by crisis type
IMPACT_TEMPLATES = {
    CrisisType.URBAN_FLOODING: {
        "primary": "{location} Markaz road fully blocked by standing water",
        "secondary": [
            "Emergency vehicles unable to reach {hospital}",
            "{schools_text}",
            "Drainage system overloaded — risk of spread to adjacent sectors in ~{ttc_short}",
            "Low-lying residential areas at risk of basement flooding",
        ],
        "escalation": 0.78,
        "ttc": "~40 minutes if unaddressed",
    },
    CrisisType.FIRE: {
        "primary": "Active fire reported in {location} — immediate danger to life",
        "secondary": [
            "Adjacent buildings at risk of fire spread",
            "Toxic smoke affecting 1km radius — {hospital} may need to prepare",
            "Gas lines in area may be compromised",
            "Evacuation needed for 500m radius — {schools_text}",
        ],
        "escalation": 0.92,
        "ttc": "~15 minutes — critical",
    },
    CrisisType.ROAD_BLOCKAGE: {
        "primary": "Major road blockage in {location} causing traffic paralysis",
        "secondary": [
            "Ambulance routes to {hospital} compromised",
            "Public transport routes severely disrupted",
            "Commercial activity in area halted",
        ],
        "escalation": 0.45,
        "ttc": "~90 minutes without intervention",
    },
    CrisisType.ACCIDENT: {
        "primary": "Serious accident reported at {location} — casualties possible",
        "secondary": [
            "Traffic backing up on approach roads",
            "Emergency medical response needed — nearest hospital: {hospital}",
            "Road surface may be damaged or hazardous",
        ],
        "escalation": 0.60,
        "ttc": "~30 minutes — medical urgency",
    },
    CrisisType.INFRASTRUCTURE_FAILURE: {
        "primary": "Power/infrastructure failure affecting {location}",
        "secondary": [
            "Medical facilities on backup power — limited capacity",
            "Traffic signals offline — intersection safety risk",
            "Water pumping stations affected — supply disruption",
        ],
        "escalation": 0.50,
        "ttc": "~2 hours for partial restoration",
    },
    CrisisType.HEATWAVE: {
        "primary": "Extreme heat conditions in {location} — health advisory active",
        "secondary": [
            "Vulnerable populations (elderly, children) at heat stroke risk",
            "Outdoor workers need immediate shelter access",
            "Power grid under stress — {infrastructure_note}",
            "Water demand surge expected in affected areas",
        ],
        "escalation": 0.65,
        "ttc": "~4 hours until temperature peak",
    },
}


class SituationAnalysisAgent:
    def __init__(self):
        self.name = "SituationAnalysisAgent"

    def _get_facility_context(self, location: str, maps=None) -> dict:
        """Get nearby facilities from maps tool or defaults."""
        default = {
            "hospital": "nearest hospital",
            "hospital_dist": "~3km",
            "fire_station": "nearest fire station",
            "schools": [],
            "schools_text": "Schools in affected zone with students potentially at risk",
            "blocked_roads": [],
        }

        if maps:
            try:
                facilities = maps.get_nearby_facilities(location)
                hospital_name = facilities.get("nearest_hospital", "nearest hospital")
                hospital_dist = facilities.get("hospital_distance_km", 3.0)
                schools = facilities.get("schools_in_zone", [])
                schools_text = (
                    f"{len(schools)} schools in affected zone ({', '.join(schools[:2])})"
                    if schools else "No schools directly in impact zone"
                )
                return {
                    "hospital": f"{hospital_name} ({hospital_dist}km away)",
                    "hospital_dist": f"{hospital_dist}km",
                    "fire_station": facilities.get("nearest_fire_station", "nearest fire station"),
                    "schools": schools,
                    "schools_text": schools_text,
                    "blocked_roads": [],
                }
            except Exception:
                pass

        return default

    def _get_weather_context(self, location: str, weather=None) -> dict:
        """Get weather forecast context."""
        default = {"forecast": "Weather trajectory unknown", "infrastructure_note": "load conditions unknown"}

        if weather:
            try:
                data = weather.get_current_weather(location.split(",")[0].strip().lower())
                source = "[LIVE]" if data.get("source") == "live_api" else "[SIMULATED]"
                forecast = data.get("forecast_2h", "Conditions expected to continue")
                return {
                    "forecast": f"{source} {forecast}",
                    "temperature_c": data.get("temperature_c", 30),
                    "humidity": data.get("humidity", 50),
                    "infrastructure_note": (
                        f"AC load critical at {data.get('temperature_c', 30)}°C"
                        if data.get("temperature_c", 30) > 40
                        else "load conditions elevated"
                    ),
                }
            except Exception:
                pass

        return default

    def run(self, crisis: CrisisReport, gemini=None, maps=None, weather=None) -> SituationAssessment:
        template = IMPACT_TEMPLATES.get(crisis.crisis_type, IMPACT_TEMPLATES[CrisisType.URBAN_FLOODING])
        location = crisis.location

        # Get contextual data from tools
        facility = self._get_facility_context(location, maps)
        weather_ctx = self._get_weather_context(location, weather)

        # Format template with real facility/weather data
        fmt = {
            "location": location,
            "hospital": facility["hospital"],
            "schools_text": facility["schools_text"],
            "ttc_short": template["ttc"].replace("~", "").split("—")[0].strip(),
            "infrastructure_note": weather_ctx.get("infrastructure_note", "load conditions unknown"),
        }

        primary = template["primary"].format(**fmt)
        secondary = []
        for s in template["secondary"]:
            try:
                secondary.append(s.format(**fmt))
            except KeyError:
                secondary.append(s)

        escalation = template["escalation"]
        ttc = template["ttc"]

        # Adjust escalation based on severity
        if crisis.severity == SeverityLevel.CRITICAL:
            escalation = min(escalation + 0.10, 0.99)
        elif crisis.severity == SeverityLevel.LOW:
            escalation = max(escalation - 0.20, 0.10)

        urgency = "IMMEDIATE" if escalation > 0.7 else "HIGH" if escalation > 0.4 else "MODERATE"

        # Try Gemini-enhanced summary
        summary = None
        if gemini:
            summary = gemini.reason_situation_analysis(
                crisis_type=crisis.crisis_type.value,
                location=location,
                severity=crisis.severity.value,
                affected_people=crisis.estimated_affected_people,
            )

        if not summary:
            summary = (
                f"A {crisis.crisis_type.value.replace('_',' ')} crisis is {crisis.status.value} in {location}. "
                f"{primary}. {len(secondary)} cascading impacts identified. "
                f"Escalation probability: {escalation:.0%}. "
                f"Estimated {crisis.estimated_affected_people:,} people affected within "
                f"{crisis.affected_radius_km}km radius. "
                f"Nearest hospital: {facility['hospital']}. "
                f"Time to critical: {ttc}. Response urgency: {urgency}."
            )

        return SituationAssessment(
            crisis_id=crisis.crisis_id,
            primary_impact=primary,
            secondary_impacts=secondary,
            risk_escalation_probability=round(escalation, 2),
            time_to_critical=ttc,
            recommended_urgency=urgency,
            situation_summary=summary,
        )
