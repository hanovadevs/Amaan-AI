"""
CIRO Configuration — All API keys and service configs.
Replace YOUR_API_KEY_HERE with real keys before production.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ─── Google Gemini AI (FREE key from aistudio.google.com) ──
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_API_KEY_HERE")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# ─── Google Maps API ───────────────────────────────────────
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "YOUR_API_KEY_HERE")

# ─── OpenWeatherMap API (FREE key from openweathermap.org) ─
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY", "YOUR_API_KEY_HERE")

# ─── Google Vertex AI (alternative to direct Gemini key) ───
VERTEX_AI_PROJECT = os.getenv("VERTEX_AI_PROJECT", "ciro-hackathon")
VERTEX_AI_LOCATION = os.getenv("VERTEX_AI_LOCATION", "us-central1")

# ─── Firebase ──────────────────────────────────────────────
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "ciro-hackathon")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

# ─── Server ────────────────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# ─── Pakistani Cities Reference Data ──────────────────────
CITY_COORDS = {
    "islamabad": {"lat": 33.6844, "lng": 73.0479},
    "lahore":    {"lat": 31.5497, "lng": 74.3436},
    "karachi":   {"lat": 24.8607, "lng": 67.0011},
    "rawalpindi": {"lat": 33.5651, "lng": 73.0169},
    "faisalabad": {"lat": 31.4187, "lng": 73.0791},
    "peshawar":  {"lat": 34.0151, "lng": 71.5249},
}

SECTORS_ISLAMABAD = {
    "G-10": {"lat": 33.6800, "lng": 73.0150, "population_density": 8500},
    "G-9":  {"lat": 33.6850, "lng": 73.0250, "population_density": 9200},
    "G-8":  {"lat": 33.6900, "lng": 73.0350, "population_density": 7800},
    "G-7":  {"lat": 33.6950, "lng": 73.0450, "population_density": 6500},
    "G-6":  {"lat": 33.7000, "lng": 73.0550, "population_density": 5200},
    "F-10": {"lat": 33.6950, "lng": 73.0150, "population_density": 7100},
    "F-8":  {"lat": 33.7050, "lng": 73.0350, "population_density": 8900},
    "F-7":  {"lat": 33.7100, "lng": 73.0400, "population_density": 7500},
    "F-6":  {"lat": 33.7150, "lng": 73.0500, "population_density": 6800},
    "I-8":  {"lat": 33.6650, "lng": 73.0650, "population_density": 10200},
    "I-9":  {"lat": 33.6550, "lng": 73.0550, "population_density": 11500},
    "I-10": {"lat": 33.6450, "lng": 73.0450, "population_density": 12000},
    "Blue Area": {"lat": 33.7100, "lng": 73.0550, "population_density": 15000},
    "Saddar":    {"lat": 33.5950, "lng": 73.0500, "population_density": 18000},
}

# ─── Tool availability flags (auto-detected) ─────────────
def check_tool_status():
    """Return status of all external tool integrations."""
    return {
        "gemini_ai": GEMINI_API_KEY != "YOUR_API_KEY_HERE" and bool(GEMINI_API_KEY),
        "openweathermap": OPENWEATHERMAP_API_KEY != "YOUR_API_KEY_HERE" and bool(OPENWEATHERMAP_API_KEY),
        "google_maps": GOOGLE_MAPS_API_KEY != "YOUR_API_KEY_HERE" and bool(GOOGLE_MAPS_API_KEY),
        "firebase": bool(FIREBASE_CREDENTIALS_PATH),
    }
