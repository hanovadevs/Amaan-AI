"""
Agent 1 — SignalIngestionAgent
Collects and normalizes all incoming signals from multiple sources.
Parses English + Roman Urdu, extracts entities, produces SignalObjects.
"""
import re
from typing import List, Dict, Any
from datetime import datetime

from models import (
    SignalObject, SignalInput, SignalSource, Language, SeverityLevel
)


# ─── Roman Urdu keyword mappings ──────────────────────────

ROMAN_URDU_CRISIS_MAP: Dict[str, Dict[str, Any]] = {
    # Flooding
    "pani": {"type": "flood", "severity": SeverityLevel.HIGH},
    "sailab": {"type": "flood", "severity": SeverityLevel.CRITICAL},
    "baarish": {"type": "flood", "severity": SeverityLevel.MEDIUM},
    "doob": {"type": "flood", "severity": SeverityLevel.HIGH},
    "bhar gaya": {"type": "flood", "severity": SeverityLevel.HIGH},
    "pani bhar": {"type": "flood", "severity": SeverityLevel.HIGH},
    # Fire
    "aag": {"type": "fire", "severity": SeverityLevel.CRITICAL},
    "dhuan": {"type": "fire", "severity": SeverityLevel.HIGH},
    "jal raha": {"type": "fire", "severity": SeverityLevel.CRITICAL},
    # Traffic
    "jam": {"type": "traffic", "severity": SeverityLevel.MEDIUM},
    "gaariyan": {"type": "traffic", "severity": SeverityLevel.MEDIUM},
    "traffic": {"type": "traffic", "severity": SeverityLevel.MEDIUM},
    "rasta band": {"type": "traffic", "severity": SeverityLevel.HIGH},
    "phans": {"type": "traffic", "severity": SeverityLevel.HIGH},
    # Power
    "bijli": {"type": "power", "severity": SeverityLevel.MEDIUM},
    "load shedding": {"type": "power", "severity": SeverityLevel.MEDIUM},
    "andhera": {"type": "power", "severity": SeverityLevel.MEDIUM},
    # Accident
    "hadsa": {"type": "accident", "severity": SeverityLevel.HIGH},
    "takkar": {"type": "accident", "severity": SeverityLevel.HIGH},
    "zakhmi": {"type": "accident", "severity": SeverityLevel.HIGH},
    # Heat
    "garmi": {"type": "heat", "severity": SeverityLevel.MEDIUM},
    "loo": {"type": "heat", "severity": SeverityLevel.HIGH},
    "dhoop": {"type": "heat", "severity": SeverityLevel.MEDIUM},
}

ENGLISH_CRISIS_MAP: Dict[str, Dict[str, Any]] = {
    "flood": {"type": "flood", "severity": SeverityLevel.HIGH},
    "flooding": {"type": "flood", "severity": SeverityLevel.HIGH},
    "rain": {"type": "flood", "severity": SeverityLevel.MEDIUM},
    "waterlogged": {"type": "flood", "severity": SeverityLevel.HIGH},
    "submerged": {"type": "flood", "severity": SeverityLevel.CRITICAL},
    "stranded": {"type": "flood", "severity": SeverityLevel.HIGH},
    "impassable": {"type": "flood", "severity": SeverityLevel.CRITICAL},
    "fire": {"type": "fire", "severity": SeverityLevel.CRITICAL},
    "smoke": {"type": "fire", "severity": SeverityLevel.HIGH},
    "blaze": {"type": "fire", "severity": SeverityLevel.CRITICAL},
    "traffic": {"type": "traffic", "severity": SeverityLevel.MEDIUM},
    "congestion": {"type": "traffic", "severity": SeverityLevel.MEDIUM},
    "blocked": {"type": "traffic", "severity": SeverityLevel.HIGH},
    "accident": {"type": "accident", "severity": SeverityLevel.HIGH},
    "crash": {"type": "accident", "severity": SeverityLevel.HIGH},
    "collision": {"type": "accident", "severity": SeverityLevel.HIGH},
    "injury": {"type": "accident", "severity": SeverityLevel.HIGH},
    "power outage": {"type": "power", "severity": SeverityLevel.MEDIUM},
    "blackout": {"type": "power", "severity": SeverityLevel.HIGH},
    "heatwave": {"type": "heat", "severity": SeverityLevel.HIGH},
    "heat stroke": {"type": "heat", "severity": SeverityLevel.CRITICAL},
}

# Known locations in Pakistani cities
LOCATION_PATTERNS = [
    r"G-\d{1,2}", r"F-\d{1,2}", r"I-\d{1,2}", r"E-\d{1,2}",
    r"H-\d{1,2}", r"D-\d{1,2}",
    r"Blue Area", r"Saddar", r"Gulberg", r"DHA", r"Clifton",
    r"Johar Town", r"Model Town", r"Garden Town", r"Liberty",
    r"Mall Road", r"Anarkali", r"Rawalpindi", r"Faisal Town",
    r"Markaz", r"George Town", r"Korangi", r"Nazimabad",
    r"North Nazimabad", r"Liaquatabad", r"Defence",
    r"Bahria Town", r"Srinagar Highway", r"IJP Road",
]


class SignalIngestionAgent:
    """
    Agent 1: Parses and normalizes raw multi-source signals.
    Supports English and Roman Urdu text input.
    """

    def __init__(self):
        self.name = "SignalIngestionAgent"

    def detect_language(self, text: str) -> Language:
        """Detect if text is English, Urdu, or Roman Urdu."""
        roman_urdu_indicators = [
            "hai", "hain", "mein", "ka", "ki", "ko", "ne",
            "se", "ho", "gaya", "gayi", "raha", "rahi",
            "nahi", "bhi", "aur", "ya", "yeh", "woh",
        ]
        text_lower = text.lower()
        urdu_word_count = sum(1 for word in roman_urdu_indicators if word in text_lower.split())
        total_words = len(text_lower.split())

        if total_words > 0 and urdu_word_count / total_words > 0.2:
            return Language.ROMAN_UR
        return Language.EN

    def extract_location(self, text: str) -> str:
        """Extract location from text using pattern matching."""
        for pattern in LOCATION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        return "Unknown Location"

    def extract_keywords_and_severity(self, text: str, language: Language):
        """Extract crisis keywords and determine severity."""
        text_lower = text.lower()
        keywords = []
        max_severity = SeverityLevel.LOW

        # Check Roman Urdu keywords
        for keyword, info in ROMAN_URDU_CRISIS_MAP.items():
            if keyword in text_lower:
                keywords.append(keyword)
                if self._severity_rank(info["severity"]) > self._severity_rank(max_severity):
                    max_severity = info["severity"]

        # Check English keywords
        for keyword, info in ENGLISH_CRISIS_MAP.items():
            if keyword in text_lower:
                keywords.append(keyword)
                if self._severity_rank(info["severity"]) > self._severity_rank(max_severity):
                    max_severity = info["severity"]

        return keywords, max_severity

    def _severity_rank(self, severity: SeverityLevel) -> int:
        ranks = {
            SeverityLevel.LOW: 1,
            SeverityLevel.MEDIUM: 2,
            SeverityLevel.HIGH: 3,
            SeverityLevel.CRITICAL: 4,
        }
        return ranks.get(severity, 0)

    def process_text_signal(self, signal_input: SignalInput) -> SignalObject:
        """Process a text-based signal (social media or manual report)."""
        text = signal_input.text or ""
        language = self.detect_language(text)
        location = self.extract_location(text)
        keywords, severity = self.extract_keywords_and_severity(text, language)

        return SignalObject(
            source=signal_input.source,
            raw_text=text,
            language_detected=language,
            extracted_location=location,
            event_keywords=keywords,
            severity_hint=severity,
            timestamp=datetime.utcnow().isoformat(),
        )

    def process_weather_signal(self, signal_input: SignalInput) -> SignalObject:
        """Process a weather API payload."""
        data = signal_input.weather_data or {}
        location = data.get("location", "Unknown")
        rainfall = data.get("rainfall_mm", 0)
        alert = data.get("alert", "")
        temp = data.get("temperature_c", 0)

        keywords = []
        severity = SeverityLevel.LOW

        if rainfall > 50:
            keywords.extend(["heavy_rain", "flood_risk"])
            severity = SeverityLevel.HIGH
        if rainfall > 80:
            severity = SeverityLevel.CRITICAL
        if "warning" in alert.lower():
            keywords.append("weather_warning")
            severity = SeverityLevel.HIGH
        if temp > 42:
            keywords.extend(["extreme_heat", "heatwave"])
            severity = SeverityLevel.HIGH

        raw_text = f"Weather API: {location} | Rainfall: {rainfall}mm | Alert: {alert} | Temp: {temp}°C"

        return SignalObject(
            source=SignalSource.WEATHER_API,
            raw_text=raw_text,
            language_detected=Language.EN,
            extracted_location=location,
            event_keywords=keywords,
            severity_hint=severity,
            timestamp=datetime.utcnow().isoformat(),
        )

    def process_traffic_signal(self, signal_input: SignalInput) -> SignalObject:
        """Process a traffic/maps API payload."""
        data = signal_input.traffic_data or {}
        area = data.get("area", "Unknown")
        congestion = data.get("congestion_percent", 0)
        avg_speed = data.get("avg_speed", 30)

        keywords = []
        severity = SeverityLevel.LOW

        if congestion > 200:
            keywords.extend(["severe_congestion", "traffic_jam"])
            severity = SeverityLevel.HIGH
        elif congestion > 100:
            keywords.extend(["congestion"])
            severity = SeverityLevel.MEDIUM

        if avg_speed < 10:
            keywords.append("near_standstill")
            severity = SeverityLevel.HIGH
        if avg_speed < 5:
            severity = SeverityLevel.CRITICAL

        raw_text = f"Maps API: {area} | Congestion: {congestion}% | Avg Speed: {avg_speed} km/h"

        return SignalObject(
            source=SignalSource.MAPS_API,
            raw_text=raw_text,
            language_detected=Language.EN,
            extracted_location=area,
            event_keywords=keywords,
            severity_hint=severity,
            timestamp=datetime.utcnow().isoformat(),
        )

    def run(self, signals: List[SignalInput]) -> List[SignalObject]:
        """
        Execute Agent 1: Process all incoming signals into normalized SignalObjects.
        """
        parsed_signals = []

        for signal_input in signals:
            if signal_input.weather_data:
                parsed_signals.append(self.process_weather_signal(signal_input))
            elif signal_input.traffic_data:
                parsed_signals.append(self.process_traffic_signal(signal_input))
            elif signal_input.text:
                parsed_signals.append(self.process_text_signal(signal_input))

        return parsed_signals
