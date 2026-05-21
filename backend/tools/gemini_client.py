"""
Gemini AI Client â€” Powers intelligent reasoning across all ZAVIA agents.
Uses google-generativeai SDK with free API key from aistudio.google.com.
Falls back gracefully when API key is not configured.
"""
import json
import logging
from typing import Optional

logger = logging.getLogger("zavia.gemini")

# Global singleton
_client: Optional["GeminiClient"] = None


class GeminiClient:
    """
    Wrapper around Google Gemini API for agent reasoning.
    Falls back to None responses if the API key is not set,
    allowing agents to use their template-based defaults.
    """

    def __init__(self, api_key: str = "", model_name: str = "gemini-2.0-flash"):
        self.api_key = api_key
        self.model_name = model_name
        self.model = None
        self.available = False

        if api_key and api_key != "YOUR_API_KEY_HERE":
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel(model_name)
                self.available = True
                logger.info(f"âœ“ Gemini AI initialized ({model_name})")
            except ImportError:
                logger.warning("google-generativeai not installed. Run: pip install google-generativeai")
            except Exception as e:
                logger.warning(f"Gemini init failed: {e}")
        else:
            logger.info("Gemini API key not set â€” using template-based reasoning")

    def generate(self, prompt: str, system_instruction: str = "", max_tokens: int = 1024) -> Optional[str]:
        """
        Generate text with Gemini. Returns None if unavailable,
        so agents can fall back to templates.
        """
        if not self.available or not self.model:
            return None

        try:
            full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
            response = self.model.generate_content(
                full_prompt,
                generation_config={
                    "max_output_tokens": max_tokens,
                    "temperature": 0.7,
                }
            )
            return response.text
        except Exception as e:
            logger.warning(f"Gemini generation failed: {e}")
            return None

    def generate_json(self, prompt: str, system_instruction: str = "") -> Optional[dict]:
        """Generate structured JSON output from Gemini."""
        json_prompt = f"{prompt}\n\nRespond ONLY with valid JSON, no markdown formatting or code blocks."
        text = self.generate(json_prompt, system_instruction, max_tokens=2048)
        if not text:
            return None
        try:
            # Strip markdown code fences if present
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]  # Remove first line
                cleaned = cleaned.rsplit("```", 1)[0]  # Remove last fence
            return json.loads(cleaned)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse Gemini JSON response")
            return None

    # â”€â”€â”€ Agent-specific reasoning methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def reason_crisis_detection(self, signals_summary: str, detected_type: str,
                                 location: str, confidence: float) -> Optional[str]:
        """Generate detailed reasoning for crisis detection."""
        system = (
            "You are a crisis detection analyst for ZAVIA (Crisis Intelligence & Response Orchestrator), "
            "a system monitoring Pakistani metropolitan areas. Provide concise, evidence-based reasoning "
            "for why you've detected a crisis. Reference specific signals and their correlation. "
            "Keep response under 3 sentences."
        )
        prompt = (
            f"Crisis type detected: {detected_type}\n"
            f"Location: {location}\n"
            f"Confidence score: {confidence}\n"
            f"Input signals:\n{signals_summary}\n\n"
            f"Explain WHY this crisis was detected with this confidence level."
        )
        return self.generate(prompt, system, max_tokens=256)

    def reason_situation_analysis(self, crisis_type: str, location: str,
                                    severity: str, affected_people: int) -> Optional[str]:
        """Generate detailed situation analysis with cascading impacts."""
        system = (
            "You are a situation analysis agent for ZAVIA, specializing in Pakistani urban crisis scenarios. "
            "Analyze cascading impacts of the crisis. Reference local infrastructure, hospitals, schools, "
            "and transportation networks. Be specific to Pakistani cities. Keep response under 4 sentences."
        )
        prompt = (
            f"Crisis: {crisis_type} at {location}\n"
            f"Severity: {severity}\n"
            f"Estimated affected: {affected_people:,} people\n\n"
            f"Provide a situation summary analyzing cascading impacts and urgency."
        )
        return self.generate(prompt, system, max_tokens=300)

    def reason_action_planning(self, crisis_type: str, location: str,
                                 severity: str, urgency: str, num_actions: int) -> Optional[str]:
        """Generate reasoning for the action plan."""
        system = (
            "You are an action planning agent for ZAVIA. Explain the reasoning behind the response plan "
            "you've generated. Reference triage principles and resource allocation logic. "
            "Keep response under 3 sentences."
        )
        prompt = (
            f"Crisis: {crisis_type} at {location}\n"
            f"Severity: {severity}, Urgency: {urgency}\n"
            f"Actions planned: {num_actions}\n\n"
            f"Explain the reasoning and priority ordering for this response plan."
        )
        return self.generate(prompt, system, max_tokens=200)

    def reason_outcome(self, crisis_type: str, location: str,
                        before_state: dict, after_state: dict) -> Optional[str]:
        """Generate a compelling outcome summary."""
        system = (
            "You are an outcome reporting agent for ZAVIA. Summarize the impact of the crisis response "
            "with specific metrics. Be precise and impactful. Keep response under 2 sentences."
        )
        prompt = (
            f"Crisis: {crisis_type} at {location}\n"
            f"Before: {json.dumps(before_state)}\n"
            f"After: {json.dumps(after_state)}\n\n"
            f"Summarize the measurable impact of the response."
        )
        return self.generate(prompt, system, max_tokens=150)


def get_gemini_client() -> GeminiClient:
    """Get or create the global Gemini client singleton."""
    global _client
    if _client is None:
        from config import GEMINI_API_KEY, GEMINI_MODEL
        _client = GeminiClient(api_key=GEMINI_API_KEY, model_name=GEMINI_MODEL)
    return _client
