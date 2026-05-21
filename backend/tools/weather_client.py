"""
OpenWeatherMap Client â€” Live weather data for crisis corroboration.
Free tier: 60 calls/minute, current weather + 5-day forecast.
Falls back to simulated data when API key is not set.
"""
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("zavia.weather")

# Pakistani city coordinates for weather lookups
CITY_WEATHER_COORDS = {
    "islamabad": {"lat": 33.6844, "lon": 73.0479},
    "lahore": {"lat": 31.5497, "lon": 74.3436},
    "karachi": {"lat": 24.8607, "lon": 67.0011},
    "rawalpindi": {"lat": 33.5651, "lon": 73.0169},
    "faisalabad": {"lat": 31.4187, "lon": 73.0791},
    "peshawar": {"lat": 34.0151, "lon": 71.5249},
}

# Simulated weather data for demo mode
SIMULATED_WEATHER = {
    "islamabad": {
        "temperature_c": 28, "feels_like_c": 31, "humidity": 82,
        "rainfall_mm": 87, "wind_speed_kmh": 15, "wind_direction": "SW",
        "description": "Heavy rain", "alert": "heavy_rain_warning",
        "visibility_km": 3, "pressure_hpa": 1005,
        "forecast_2h": "Continued heavy rainfall expected. 40-60mm additional.",
    },
    "lahore": {
        "temperature_c": 44, "feels_like_c": 48, "humidity": 22,
        "rainfall_mm": 0, "wind_speed_kmh": 8, "wind_direction": "W",
        "description": "Extreme heat", "alert": "heat_advisory",
        "visibility_km": 8, "pressure_hpa": 998,
        "forecast_2h": "Temperature peak expected at 46Â°C around 14:00.",
    },
    "karachi": {
        "temperature_c": 36, "feels_like_c": 40, "humidity": 65,
        "rainfall_mm": 12, "wind_speed_kmh": 25, "wind_direction": "S",
        "description": "Partly cloudy", "alert": "none",
        "visibility_km": 10, "pressure_hpa": 1010,
        "forecast_2h": "Sea breeze expected to provide relief by evening.",
    },
}


class WeatherClient:
    """
    OpenWeatherMap API wrapper with simulation fallback.
    """

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.available = bool(api_key and api_key != "YOUR_API_KEY_HERE")
        if self.available:
            logger.info("âœ“ OpenWeatherMap API initialized")
        else:
            logger.info("OpenWeatherMap API key not set â€” using simulated weather")

    def get_current_weather(self, city: str) -> Dict[str, Any]:
        """
        Get current weather for a city.
        Returns live data if API key is set, simulated data otherwise.
        """
        city_lower = city.lower().strip()

        if self.available:
            return self._fetch_live_weather(city_lower)

        return self._get_simulated_weather(city_lower)

    def _fetch_live_weather(self, city: str) -> Dict[str, Any]:
        """Fetch live weather from OpenWeatherMap API."""
        try:
            import httpx

            coords = CITY_WEATHER_COORDS.get(city, CITY_WEATHER_COORDS["islamabad"])
            url = (
                f"https://api.openweathermap.org/data/2.5/weather"
                f"?lat={coords['lat']}&lon={coords['lon']}"
                f"&appid={self.api_key}&units=metric"
            )

            with httpx.Client(timeout=5.0) as client:
                response = client.get(url)
                response.raise_for_status()
                data = response.json()

            rain_1h = data.get("rain", {}).get("1h", 0)
            rain_3h = data.get("rain", {}).get("3h", 0)
            rainfall = rain_1h or rain_3h / 3  # Approximate hourly

            # Determine alert level
            alert = "none"
            if rainfall > 50:
                alert = "heavy_rain_warning"
            elif rainfall > 20:
                alert = "rain_advisory"
            if data["main"]["temp"] > 42:
                alert = "heat_advisory"
            if data["main"]["temp"] > 45:
                alert = "extreme_heat_warning"

            return {
                "temperature_c": round(data["main"]["temp"], 1),
                "feels_like_c": round(data["main"]["feels_like"], 1),
                "humidity": data["main"]["humidity"],
                "rainfall_mm": round(rainfall, 1),
                "wind_speed_kmh": round(data["wind"]["speed"] * 3.6, 1),
                "wind_direction": self._deg_to_compass(data["wind"].get("deg", 0)),
                "description": data["weather"][0]["description"].title(),
                "alert": alert,
                "visibility_km": round(data.get("visibility", 10000) / 1000, 1),
                "pressure_hpa": data["main"]["pressure"],
                "source": "live_api",
                "city": city,
            }

        except Exception as e:
            logger.warning(f"Weather API failed, falling back to simulation: {e}")
            return self._get_simulated_weather(city)

    def _get_simulated_weather(self, city: str) -> Dict[str, Any]:
        """Return simulated weather data for demo purposes."""
        data = SIMULATED_WEATHER.get(city, SIMULATED_WEATHER["islamabad"]).copy()
        data["source"] = "simulated"
        data["city"] = city
        return data

    @staticmethod
    def _deg_to_compass(deg: float) -> str:
        dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        return dirs[int((deg + 22.5) / 45) % 8]


# Global singleton
_client: Optional[WeatherClient] = None


def get_weather_client() -> WeatherClient:
    """Get or create the global weather client singleton."""
    global _client
    if _client is None:
        from config import OPENWEATHERMAP_API_KEY
        _client = WeatherClient(api_key=OPENWEATHERMAP_API_KEY)
    return _client
