"""
Agent 2 — CrisisDetectionAgent
Analyzes normalized signals, clusters them, and detects crises.
Optionally uses Gemini AI for enhanced reasoning.
"""
from typing import List, Optional
from collections import defaultdict
from datetime import datetime
from models import (
    SignalObject, CrisisReport, CrisisType, CrisisStatus,
    ConfidenceLevel, SeverityLevel, GeoCoordinates
)
from config import SECTORS_ISLAMABAD, CITY_COORDS

KEYWORD_CRISIS_MAP = {
    "flood": CrisisType.URBAN_FLOODING, "pani": CrisisType.URBAN_FLOODING,
    "baarish": CrisisType.URBAN_FLOODING, "sailab": CrisisType.URBAN_FLOODING,
    "doob": CrisisType.URBAN_FLOODING, "heavy_rain": CrisisType.URBAN_FLOODING,
    "flood_risk": CrisisType.URBAN_FLOODING, "waterlogged": CrisisType.URBAN_FLOODING,
    "submerged": CrisisType.URBAN_FLOODING, "stranded": CrisisType.URBAN_FLOODING,
    "impassable": CrisisType.URBAN_FLOODING, "rain": CrisisType.URBAN_FLOODING,
    "flooding": CrisisType.URBAN_FLOODING, "bhar gaya": CrisisType.URBAN_FLOODING,
    "pani bhar": CrisisType.URBAN_FLOODING,
    "aag": CrisisType.FIRE, "fire": CrisisType.FIRE, "dhuan": CrisisType.FIRE,
    "smoke": CrisisType.FIRE, "blaze": CrisisType.FIRE, "jalna": CrisisType.FIRE,
    "jam": CrisisType.ROAD_BLOCKAGE, "traffic": CrisisType.ROAD_BLOCKAGE,
    "blocked": CrisisType.ROAD_BLOCKAGE, "congestion": CrisisType.ROAD_BLOCKAGE,
    "severe_congestion": CrisisType.ROAD_BLOCKAGE, "traffic_jam": CrisisType.ROAD_BLOCKAGE,
    "near_standstill": CrisisType.ROAD_BLOCKAGE, "rasta band": CrisisType.ROAD_BLOCKAGE,
    "hadsa": CrisisType.ACCIDENT, "accident": CrisisType.ACCIDENT,
    "crash": CrisisType.ACCIDENT, "collision": CrisisType.ACCIDENT, "takkar": CrisisType.ACCIDENT,
    "bijli": CrisisType.INFRASTRUCTURE_FAILURE, "power outage": CrisisType.INFRASTRUCTURE_FAILURE,
    "blackout": CrisisType.INFRASTRUCTURE_FAILURE, "light nahi": CrisisType.INFRASTRUCTURE_FAILURE,
    "bijli nahi": CrisisType.INFRASTRUCTURE_FAILURE,
    "garmi": CrisisType.HEATWAVE, "extreme_heat": CrisisType.HEATWAVE,
    "heatwave": CrisisType.HEATWAVE, "loo": CrisisType.HEATWAVE,
    "heat_advisory": CrisisType.HEATWAVE, "extreme_heat_warning": CrisisType.HEATWAVE,
    "weather_warning": CrisisType.URBAN_FLOODING, "heavy_rain_warning": CrisisType.URBAN_FLOODING,
}

class CrisisDetectionAgent:
    def __init__(self):
        self.name = "CrisisDetectionAgent"

    def _get_coords(self, location: str) -> GeoCoordinates:
        for sector, data in SECTORS_ISLAMABAD.items():
            if sector.upper() in location.upper():
                return GeoCoordinates(lat=data["lat"], lng=data["lng"])
        return GeoCoordinates(lat=CITY_COORDS["islamabad"]["lat"], lng=CITY_COORDS["islamabad"]["lng"])

    def _estimate_pop(self, location: str, radius: float) -> int:
        for sector, data in SECTORS_ISLAMABAD.items():
            if sector.upper() in location.upper():
                return int(data["population_density"] * 3.14 * radius * 0.3)
        return int(5000 * radius)

    def _detect_type(self, signals: List[SignalObject]) -> CrisisType:
        votes = defaultdict(int)
        for s in signals:
            for kw in s.event_keywords:
                ct = KEYWORD_CRISIS_MAP.get(kw.lower())
                if ct: votes[ct] += 1
        return max(votes, key=votes.get) if votes else CrisisType.URBAN_FLOODING

    def _calc_confidence(self, signals: List[SignalObject]):
        n = len(signals)
        sources = set(s.source for s in signals)
        if n >= 3 and len(sources) >= 2:
            score, level = 0.91, ConfidenceLevel.VERY_HIGH
        elif n >= 2:
            score, level = 0.72, ConfidenceLevel.HIGH
        elif n == 1 and any(s.severity_hint in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] for s in signals):
            score, level = 0.55, ConfidenceLevel.MEDIUM
        else:
            score, level = 0.35, ConfidenceLevel.LOW
        if any(s.source.value == "weather_api" for s in signals): score = min(score + 0.05, 0.98)
        if any(s.source.value == "maps_api" for s in signals): score = min(score + 0.04, 0.98)
        return score, level

    def _get_severity(self, signals, conf):
        ranks = {SeverityLevel.LOW: 1, SeverityLevel.MEDIUM: 2, SeverityLevel.HIGH: 3, SeverityLevel.CRITICAL: 4}
        mx = max(ranks.get(s.severity_hint, 1) for s in signals)
        if conf > 0.85 and mx >= 3: return SeverityLevel.CRITICAL
        if mx >= 3: return SeverityLevel.HIGH
        if mx >= 2: return SeverityLevel.MEDIUM
        return SeverityLevel.LOW

    def _build_reasoning(self, signals, crisis_type, location, score, gemini=None) -> str:
        """Build reasoning — use Gemini AI if available, otherwise template."""
        n = len(signals)
        src_set = set(s.source.value for s in signals)
        signals_summary = "\n".join([
            f"- [{s.source.value}] {s.raw_text or 'API data'} → keywords: {s.event_keywords}"
            for s in signals
        ])

        # Try Gemini-enhanced reasoning
        if gemini:
            ai_reasoning = gemini.reason_crisis_detection(
                signals_summary=signals_summary,
                detected_type=crisis_type.value,
                location=location,
                confidence=score,
            )
            if ai_reasoning:
                return ai_reasoning

        # Template fallback
        return (
            f"{n} correlated {crisis_type.value.replace('_',' ')} signals within 15min in {location}. "
            f"Sources: {', '.join(src_set)}. "
            f"Multi-source corroboration raises confidence to {score:.2f}."
        )

    def run(self, signals: List[SignalObject], gemini=None) -> CrisisReport:
        if not signals:
            return CrisisReport(crisis_type=CrisisType.URBAN_FLOODING, location="Unknown",
                geo_coordinates=GeoCoordinates(lat=33.6844, lng=73.0479),
                confidence=ConfidenceLevel.LOW, confidence_score=0.1,
                severity=SeverityLevel.LOW, status=CrisisStatus.EMERGING, reasoning="No signals.")
        locs = [s.extracted_location for s in signals if s.extracted_location != "Unknown Location"]
        location = locs[0] if locs else "Islamabad"
        crisis_type = self._detect_type(signals)
        score, level = self._calc_confidence(signals)
        severity = self._get_severity(signals, score)
        coords = self._get_coords(location)
        radius = 2.5 if severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] else 1.5
        affected = self._estimate_pop(location, radius)
        status = CrisisStatus.ACTIVE if score > 0.8 else CrisisStatus.EMERGING
        reasoning = self._build_reasoning(signals, crisis_type, location, score, gemini)

        return CrisisReport(crisis_type=crisis_type, location=location, geo_coordinates=coords,
            confidence=level, confidence_score=round(score, 2),
            active_signals=[s.signal_id for s in signals],
            affected_radius_km=radius, estimated_affected_people=affected,
            severity=severity, status=status, reasoning=reasoning)
