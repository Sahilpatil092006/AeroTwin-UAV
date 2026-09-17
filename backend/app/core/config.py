"""
AeroTwin-UAV Backend Configuration Settings
===========================================
Environment variables and application configuration for the FastAPI service.

Software-only research prototype.
"""

import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    PROJECT_NAME: str = "AeroTwin-UAV API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = (
        "AI-Enabled Real-Time Digital Twin Backend for Aero Piston "
        "Engine Health Monitoring and Mission Reliability."
    )
    API_PREFIX: str = "/api"

    # Host & Port
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    # CORS configuration
    FRONTEND_ORIGIN: str = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGIN.split(",") if origin.strip()]


settings = Settings()
