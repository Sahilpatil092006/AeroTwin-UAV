"""
AeroTwin-UAV Flight History Persistence Module
=============================================
Provides thread-safe SQLite persistence for live simulated flight telemetry,
sorties, and engine health summary metrics.
"""

import os
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from threading import Lock

logger = logging.getLogger("aerotwin.db")

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "flight_history.db")


import time


class FlightHistoryDB:
    """Manages persistent SQLite flight history and telemetry session archiving."""

    def __init__(self, db_path: Optional[str] = None, min_sample_interval_sec: float = 0.5):
        self.db_path = db_path or os.getenv("FLIGHT_HISTORY_DB_PATH", DEFAULT_DB_PATH)
        self.min_sample_interval_sec = min_sample_interval_sec
        self._lock = Lock()
        self._active_sorties: Dict[str, str] = {}
        self._last_sample_time: Dict[str, float] = {}
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Returns a fast, thread-safe connection configured with Row factory."""
        conn = sqlite3.connect(self.db_path, timeout=10.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout = 5000;")
        return conn

    def _init_db(self) -> None:
        """Creates table schemas, pragmas, and indexing if not already present."""
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        with self._lock:
            conn = sqlite3.connect(self.db_path, timeout=10.0, check_same_thread=False)
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.execute("PRAGMA busy_timeout = 5000;")
            try:
                with conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS flight_sessions (
                            sortie_id TEXT PRIMARY KEY,
                            uav_id TEXT NOT NULL,
                            start_time TEXT NOT NULL,
                            end_time TEXT,
                            flight_phase TEXT NOT NULL,
                            status TEXT NOT NULL,
                            peak_cht REAL DEFAULT 0.0,
                            peak_egt REAL DEFAULT 0.0,
                            min_oil_pressure REAL DEFAULT 0.0,
                            health_score REAL DEFAULT 100.0,
                            mission_risk TEXT DEFAULT 'LOW',
                            total_samples INTEGER DEFAULT 0,
                            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_sessions_uav ON flight_sessions(uav_id);
                    """)
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS telemetry_samples (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            sortie_id TEXT NOT NULL,
                            uav_id TEXT NOT NULL,
                            timestamp TEXT NOT NULL,
                            flight_phase TEXT NOT NULL,
                            rpm REAL NOT NULL,
                            cht REAL NOT NULL,
                            egt REAL NOT NULL,
                            oil_pressure REAL NOT NULL,
                            oil_temperature REAL NOT NULL,
                            vibration REAL NOT NULL,
                            fuel_flow REAL NOT NULL,
                            throttle REAL NOT NULL,
                            engine_load REAL NOT NULL,
                            health_score REAL,
                            mission_risk TEXT,
                            FOREIGN KEY(sortie_id) REFERENCES flight_sessions(sortie_id)
                        );
                    """)
                    conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_samples_uav_time ON telemetry_samples(uav_id, timestamp);
                    """)
                    conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_samples_sortie ON telemetry_samples(sortie_id);
                    """)
            except Exception as e:
                logger.error("Failed to initialize flight history database: %s", e)
            finally:
                conn.close()

    def get_or_create_sortie(self, uav_id: str, flight_phase: str = "CRUISE") -> str:
        """Retrieves active sortie ID for uav_id or initializes a new flight session."""
        clean_id = str(uav_id).strip().upper()
        if clean_id in self._active_sorties:
            return self._active_sorties[clean_id]

        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT sortie_id FROM flight_sessions WHERE uav_id = ? AND status = 'ACTIVE' ORDER BY rowid DESC LIMIT 1",
                    (clean_id,)
                )
                row = cursor.fetchone()
                if row:
                    sortie_id = str(row["sortie_id"])
                else:
                    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
                    sortie_id = f"SRT-{clean_id}-{date_str}"
                    start_time = datetime.now(timezone.utc).isoformat()
                    with conn:
                        cursor.execute("""
                            INSERT OR REPLACE INTO flight_sessions (
                                sortie_id, uav_id, start_time, flight_phase, status,
                                peak_cht, peak_egt, min_oil_pressure, health_score, mission_risk, total_samples
                            ) VALUES (?, ?, ?, ?, 'ACTIVE', 0.0, 0.0, 99.0, 100.0, 'LOW', 0)
                        """, (sortie_id, clean_id, start_time, flight_phase))
                self._active_sorties[clean_id] = sortie_id
                return sortie_id
            finally:
                conn.close()

    def record_telemetry(
        self,
        uav_id: str,
        telemetry: Dict[str, Any],
        flight_phase: str = "CRUISE",
        health_score: float = 100.0,
        mission_risk: str = "LOW",
        timestamp: Optional[Any] = None
    ) -> Optional[int]:
        """Persists a single telemetry sample and updates the running session summary."""
        clean_id = str(uav_id).strip().upper()
        sortie_id = self.get_or_create_sortie(clean_id, flight_phase=flight_phase)
        if timestamp is None:
            ts = datetime.now(timezone.utc).isoformat()
        else:
            ts = str(timestamp)

        rpm = float(telemetry.get("rpm", 0.0))
        cht = float(telemetry.get("cht", 0.0))
        egt = float(telemetry.get("egt", 0.0))
        oil_p = float(telemetry.get("oil_pressure", 0.0))
        oil_t = float(telemetry.get("oil_temperature", 0.0))
        vib = float(telemetry.get("vibration", 0.0))
        fuel = float(telemetry.get("fuel_flow", 0.0))
        throttle = float(telemetry.get("throttle", telemetry.get("engine_load", 0.0)))
        load = float(telemetry.get("engine_load", throttle))

        now_t = time.time()
        with self._lock:
            last_t = self._last_sample_time.get(clean_id, 0.0)
            if now_t - last_t < self.min_sample_interval_sec:
                return None
            self._last_sample_time[clean_id] = now_t

            conn = self._get_connection()
            try:
                with conn:
                    cursor = conn.cursor()
                    # 1. Insert telemetry sample
                    cursor.execute("""
                        INSERT INTO telemetry_samples (
                            sortie_id, uav_id, timestamp, flight_phase,
                            rpm, cht, egt, oil_pressure, oil_temperature,
                            vibration, fuel_flow, throttle, engine_load,
                            health_score, mission_risk
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        sortie_id, clean_id, ts, flight_phase,
                        rpm, cht, egt, oil_p, oil_t,
                        vib, fuel, throttle, load,
                        round(health_score, 1), mission_risk
                    ))
                    sample_id = cursor.lastrowid

                    # 2. Update session peak and summary statistics
                    cursor.execute("""
                        UPDATE flight_sessions
                        SET total_samples = total_samples + 1,
                            flight_phase = ?,
                            peak_cht = MAX(peak_cht, ?),
                            peak_egt = MAX(peak_egt, ?),
                            min_oil_pressure = CASE WHEN min_oil_pressure == 0.0 OR min_oil_pressure == 99.0 THEN ? ELSE MIN(min_oil_pressure, ?) END,
                            health_score = ?,
                            mission_risk = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE sortie_id = ?
                    """, (
                        flight_phase, cht, egt, oil_p, oil_p,
                        round(health_score, 1), mission_risk, sortie_id
                    ))
                    return sample_id
            except Exception as e:
                logger.warning("Failed to record telemetry for %s: %s", clean_id, e)
                return None
            finally:
                conn.close()

    def get_sessions(self, uav_id: str) -> List[Dict[str, Any]]:
        """Returns all persisted flight sessions / sorties for a specific UAV."""
        clean_id = str(uav_id).strip().upper()
        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sortie_id, uav_id, start_time, end_time, flight_phase,
                           status, peak_cht, peak_egt, min_oil_pressure,
                           health_score, mission_risk, total_samples, updated_at
                    FROM flight_sessions
                    WHERE uav_id = ?
                    ORDER BY rowid DESC
                """, (clean_id,))
                rows = cursor.fetchall()
                results = []
                for r in rows:
                    d = dict(r)
                    if d.get("min_oil_pressure") == 99.0:
                        d["min_oil_pressure"] = 0.0
                    results.append(d)
                return results
            finally:
                conn.close()

    def get_history(self, uav_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Returns the most recent persisted telemetry samples for a specific UAV."""
        clean_id = str(uav_id).strip().upper()
        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, sortie_id, uav_id, timestamp, flight_phase,
                           rpm, cht, egt, oil_pressure, oil_temperature,
                           vibration, fuel_flow, throttle, engine_load,
                           health_score, mission_risk
                    FROM telemetry_samples
                    WHERE uav_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                """, (clean_id, limit))
                rows = cursor.fetchall()
                # Return in chronological order
                results = [dict(r) for r in reversed(rows)]
                return results
            finally:
                conn.close()

    def get_summary(self, uav_id: str) -> Dict[str, Any]:
        """Returns the session summary for the active sortie of a specific UAV."""
        clean_id = str(uav_id).strip().upper()
        with self._lock:
            conn = self._get_connection()
            try:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT sortie_id, uav_id, start_time, end_time, flight_phase,
                           status, peak_cht, peak_egt, min_oil_pressure,
                           health_score, mission_risk, total_samples, updated_at
                    FROM flight_sessions
                    WHERE uav_id = ?
                    ORDER BY rowid DESC
                    LIMIT 1
                """, (clean_id,))
                session_row = cursor.fetchone()
                if not session_row:
                    return {
                        "uav_id": clean_id,
                        "sortie_id": f"SRT-{clean_id}-STANDBY",
                        "status": "STANDBY",
                        "flight_phase": "CRUISE",
                        "total_samples": 0,
                        "peak_cht": 0.0,
                        "peak_egt": 0.0,
                        "min_oil_pressure": 0.0,
                        "health_score": 100.0,
                        "mission_risk": "LOW"
                    }

                summary = dict(session_row)
                if summary.get("min_oil_pressure") == 99.0:
                    summary["min_oil_pressure"] = 0.0

                # Get latest sample
                cursor.execute("""
                    SELECT rpm, cht, egt, oil_pressure, oil_temperature,
                           vibration, fuel_flow, throttle, engine_load, timestamp
                    FROM telemetry_samples
                    WHERE uav_id = ?
                    ORDER BY id DESC
                    LIMIT 1
                """, (clean_id,))
                last_sample = cursor.fetchone()
                summary["latest_telemetry"] = dict(last_sample) if last_sample else {}
                return summary
            finally:
                conn.close()


flight_history_db = FlightHistoryDB()
