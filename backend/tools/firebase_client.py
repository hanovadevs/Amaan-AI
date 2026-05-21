"""
Firebase Client â€” Firestore persistence for ZAVIA pipeline data.
Stores crisis reports, pipeline runs, and alert history.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger("zavia.firebase")

_client: Optional["FirebaseClient"] = None


class FirebaseClient:
    """
    Firebase Admin SDK wrapper for Firestore operations.
    Persists pipeline results for history and analytics.
    """

    def __init__(self, credentials_path: str = "", project_id: str = ""):
        self.available = False
        self.db = None

        if not credentials_path:
            logger.info("Firebase credentials not set â€” persistence disabled")
            return

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            # Only initialize once
            if not firebase_admin._apps:
                cred = credentials.Certificate(credentials_path)
                firebase_admin.initialize_app(cred, {"projectId": project_id})

            self.db = firestore.client()
            self.available = True
            logger.info(f"âœ“ Firebase Firestore initialized (project: {project_id})")
        except FileNotFoundError:
            logger.warning(f"Firebase credentials file not found: {credentials_path}")
        except Exception as e:
            logger.warning(f"Firebase init failed: {e}")

    # â”€â”€â”€ Write Operations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def save_pipeline_run(self, run_data: Dict[str, Any]) -> Optional[str]:
        """Save a completed pipeline run to Firestore."""
        if not self.available:
            return None

        try:
            doc_ref = self.db.collection("pipeline_runs").document()
            run_data["created_at"] = datetime.utcnow().isoformat()
            run_data["doc_id"] = doc_ref.id
            doc_ref.set(run_data)
            logger.info(f"Pipeline run saved: {doc_ref.id}")
            return doc_ref.id
        except Exception as e:
            logger.warning(f"Failed to save pipeline run: {e}")
            return None

    def save_crisis_report(self, crisis_data: Dict[str, Any]) -> Optional[str]:
        """Save a crisis report to the active crises collection."""
        if not self.available:
            return None

        try:
            doc_ref = self.db.collection("crises").document()
            crisis_data["created_at"] = datetime.utcnow().isoformat()
            crisis_data["doc_id"] = doc_ref.id
            doc_ref.set(crisis_data)
            logger.info(f"Crisis report saved: {doc_ref.id}")
            return doc_ref.id
        except Exception as e:
            logger.warning(f"Failed to save crisis: {e}")
            return None

    def save_alert(self, alert_data: Dict[str, Any]) -> Optional[str]:
        """Save an alert to Firestore."""
        if not self.available:
            return None

        try:
            doc_ref = self.db.collection("alerts").document()
            alert_data["created_at"] = datetime.utcnow().isoformat()
            doc_ref.set(alert_data)
            return doc_ref.id
        except Exception as e:
            logger.warning(f"Failed to save alert: {e}")
            return None

    # â”€â”€â”€ Read Operations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    def get_recent_runs(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent pipeline runs from Firestore."""
        if not self.available:
            return []

        try:
            docs = self.db.collection("pipeline_runs").limit(limit).stream()
            results = [doc.to_dict() for doc in docs]
            results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return results
        except Exception as e:
            logger.warning(f"Failed to fetch runs: {e}")
            return []

    def get_active_crises(self) -> List[Dict[str, Any]]:
        """Get all active crisis reports."""
        if not self.available:
            return []

        try:
            docs = self.db.collection("crises").limit(50).stream()
            results = [doc.to_dict() for doc in docs]
            results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return results
        except Exception as e:
            logger.warning(f"Failed to fetch crises: {e}")
            return []

    def get_alerts(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Get recent alerts."""
        if not self.available:
            return []

        try:
            docs = self.db.collection("alerts").limit(limit).stream()
            results = [doc.to_dict() for doc in docs]
            results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return results
        except Exception as e:
            logger.warning(f"Failed to fetch alerts: {e}")
            return []


def get_firebase_client() -> FirebaseClient:
    """Get or create the global Firebase client singleton."""
    global _client
    if _client is None:
        from config import FIREBASE_CREDENTIALS_PATH, FIREBASE_PROJECT_ID
        _client = FirebaseClient(
            credentials_path=FIREBASE_CREDENTIALS_PATH,
            project_id=FIREBASE_PROJECT_ID,
        )
    return _client
