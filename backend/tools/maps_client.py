"""
Google Maps Client — Traffic data and route computation.
Falls back to simulated data when API key is not set.
Simulation mode provides realistic Pakistani road/traffic data.
"""
import random
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("ciro.maps")

# Simulated traffic data for Islamabad sectors
SIMULATED_TRAFFIC = {
    "G-10": {"congestion_percent": 340, "avg_speed_kmh": 4, "incidents": 3,
             "blocked_roads": ["G-10 Markaz main road", "G-10/4 link road"]},
    "G-9": {"congestion_percent": 180, "avg_speed_kmh": 12, "incidents": 1,
            "blocked_roads": ["G-9 Markaz approach"]},
    "G-8": {"congestion_percent": 120, "avg_speed_kmh": 18, "incidents": 0, "blocked_roads": []},
    "F-10": {"congestion_percent": 95, "avg_speed_kmh": 25, "incidents": 0, "blocked_roads": []},
    "F-8": {"congestion_percent": 200, "avg_speed_kmh": 8, "incidents": 2,
            "blocked_roads": ["F-8 Markaz center road"]},
    "Blue Area": {"congestion_percent": 250, "avg_speed_kmh": 6, "incidents": 2,
                  "blocked_roads": ["Jinnah Avenue central section"]},
    "I-8": {"congestion_percent": 110, "avg_speed_kmh": 20, "incidents": 0, "blocked_roads": []},
}

# Simulated alternate routes
ALTERNATE_ROUTES = {
    "G-10": [
        {"route": "G-10 → G-9 via Street 7", "distance_km": 3.2, "eta_min": 12, "congestion": "moderate"},
        {"route": "G-10 → Srinagar Highway via Service Road", "distance_km": 4.8, "eta_min": 15, "congestion": "low"},
        {"route": "G-10 → F-10 via Margalla Road", "distance_km": 5.1, "eta_min": 18, "congestion": "low"},
    ],
    "F-8": [
        {"route": "F-8 → F-7 via Street 4", "distance_km": 2.1, "eta_min": 8, "congestion": "moderate"},
        {"route": "F-8 → Blue Area via Nazimuddin Road", "distance_km": 3.5, "eta_min": 14, "congestion": "moderate"},
    ],
    "Blue Area": [
        {"route": "Blue Area → F-6 via Ataturk Avenue", "distance_km": 2.8, "eta_min": 10, "congestion": "low"},
        {"route": "Blue Area → G-6 via Constitution Avenue", "distance_km": 3.2, "eta_min": 12, "congestion": "moderate"},
    ],
}

# Emergency facilities in Islamabad
EMERGENCY_FACILITIES = {
    "G-10": {
        "nearest_hospital": "PIMS Hospital (G-8)", "hospital_distance_km": 3.2,
        "nearest_fire_station": "I-9 Fire Station", "fire_station_distance_km": 4.5,
        "nearest_police": "G-10 Police Station", "police_distance_km": 0.8,
        "schools_in_zone": ["G-10 Model School", "Islamabad College G-10", "Beacon House G-10"],
    },
    "F-8": {
        "nearest_hospital": "Shifa International Hospital", "hospital_distance_km": 1.8,
        "nearest_fire_station": "F-7 Fire Station", "fire_station_distance_km": 2.1,
        "nearest_police": "F-8 Police Post", "police_distance_km": 0.5,
        "schools_in_zone": ["F-8 Boys High School", "Roots Millennium F-8"],
    },
    "Blue Area": {
        "nearest_hospital": "Quaid-e-Azam International Hospital", "hospital_distance_km": 2.5,
        "nearest_fire_station": "G-7 Fire Station", "fire_station_distance_km": 3.0,
        "nearest_police": "Blue Area Police Station", "police_distance_km": 0.3,
        "schools_in_zone": [],
    },
}


class MapsClient:
    """
    Google Maps API wrapper with simulation fallback.
    Provides traffic data, alternate routes, and nearby facility lookups.
    """

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.available = bool(api_key and api_key != "YOUR_API_KEY_HERE")
        if self.available:
            logger.info("✓ Google Maps API initialized")
        else:
            logger.info("Google Maps API key not set — using simulated traffic data")

    def get_traffic(self, location: str) -> Dict[str, Any]:
        """Get traffic data for a location. Falls back to simulation."""
        if self.available:
            return self._fetch_live_traffic(location)
        return self._get_simulated_traffic(location)

    def get_alternate_routes(self, location: str) -> List[Dict[str, Any]]:
        """Get alternate routes avoiding the crisis zone."""
        # Extract sector name from location string
        sector = self._extract_sector(location)
        routes = ALTERNATE_ROUTES.get(sector, [])
        if not routes:
            # Generate generic routes
            routes = [
                {"route": f"{location} → nearby sector via highway",
                 "distance_km": round(random.uniform(3, 8), 1),
                 "eta_min": random.randint(10, 25), "congestion": "moderate"},
                {"route": f"{location} → bypass via service road",
                 "distance_km": round(random.uniform(4, 10), 1),
                 "eta_min": random.randint(12, 30), "congestion": "low"},
            ]
        return routes

    def get_nearby_facilities(self, location: str) -> Dict[str, Any]:
        """Get emergency facilities near a location."""
        sector = self._extract_sector(location)
        return EMERGENCY_FACILITIES.get(sector, {
            "nearest_hospital": "Pakistan Institute of Medical Sciences",
            "hospital_distance_km": 5.0,
            "nearest_fire_station": "Islamabad Fire Brigade HQ",
            "fire_station_distance_km": 6.0,
            "nearest_police": "Islamabad Police",
            "police_distance_km": 3.0,
            "schools_in_zone": [],
        })

    def _fetch_live_traffic(self, location: str) -> Dict[str, Any]:
        """Fetch live traffic from Google Maps API."""
        try:
            import httpx
            # Google Maps Distance Matrix API for traffic
            coords = self._get_coords(location)
            url = (
                f"https://maps.googleapis.com/maps/api/distancematrix/json"
                f"?origins={coords['lat']},{coords['lng']}"
                f"&destinations={coords['lat']+0.01},{coords['lng']+0.01}"
                f"&departure_time=now&traffic_model=best_guess"
                f"&key={self.api_key}"
            )
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url)
                data = response.json()

            if data["status"] == "OK":
                element = data["rows"][0]["elements"][0]
                normal_duration = element.get("duration", {}).get("value", 300)
                traffic_duration = element.get("duration_in_traffic", {}).get("value", normal_duration)
                congestion = int((traffic_duration / max(normal_duration, 1)) * 100)
                avg_speed = max(1, int(60 / (traffic_duration / max(normal_duration, 1))))

                return {
                    "congestion_percent": congestion,
                    "avg_speed_kmh": avg_speed,
                    "incidents": 0,
                    "blocked_roads": [],
                    "source": "live_api",
                }
        except Exception as e:
            logger.warning(f"Maps API failed: {e}")

        return self._get_simulated_traffic(location)

    def _get_simulated_traffic(self, location: str) -> Dict[str, Any]:
        """Return simulated traffic data."""
        sector = self._extract_sector(location)
        data = SIMULATED_TRAFFIC.get(sector, {
            "congestion_percent": random.randint(80, 200),
            "avg_speed_kmh": random.randint(5, 25),
            "incidents": random.randint(0, 2),
            "blocked_roads": [],
        }).copy()
        data["source"] = "simulated"
        data["location"] = location
        return data

    def _extract_sector(self, location: str) -> str:
        """Extract the sector/area name from a location string."""
        import re
        for sector in SIMULATED_TRAFFIC:
            if sector.upper() in location.upper():
                return sector
        # Try regex for sector patterns
        match = re.search(r'[A-Z]-\d{1,2}', location.upper())
        if match:
            return match.group(0)
        return location

    def _get_coords(self, location: str) -> Dict[str, float]:
        from config import SECTORS_ISLAMABAD, CITY_COORDS
        sector = self._extract_sector(location)
        if sector in SECTORS_ISLAMABAD:
            return {"lat": SECTORS_ISLAMABAD[sector]["lat"], "lng": SECTORS_ISLAMABAD[sector]["lng"]}
        return CITY_COORDS.get("islamabad", {"lat": 33.6844, "lng": 73.0479})


# Global singleton
_client: Optional[MapsClient] = None


def get_maps_client() -> MapsClient:
    """Get or create the global maps client singleton."""
    global _client
    if _client is None:
        from config import GOOGLE_MAPS_API_KEY
        _client = MapsClient(api_key=GOOGLE_MAPS_API_KEY)
    return _client
