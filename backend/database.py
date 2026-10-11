import sqlite3
import json
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "space2plate.db")
SAMPLE_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sample_data.json")


def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
    except Exception:
        pass
    return conn



def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Plants table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS plants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            health_score REAL NOT NULL,
            growth REAL NOT NULL,
            water REAL NOT NULL,
            nutrients REAL NOT NULL,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL,
            light REAL NOT NULL,
            expected_harvest_date TEXT NOT NULL,
            expected_yield_kg REAL NOT NULL,
            failure_risk REAL NOT NULL,
            status TEXT NOT NULL,
            stage TEXT NOT NULL,
            notes TEXT
        )
    """)

    # Astronaut table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS astronauts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT,
            age INTEGER,
            mission_days INTEGER,
            preferences TEXT,
            dietary_requirements TEXT,
            nutritional_priorities TEXT,
            avoid TEXT
        )
    """)

    # Food inventory table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS food_inventory (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            quantity_kg REAL NOT NULL,
            nutrition_score REAL NOT NULL,
            shelf_life_days INTEGER NOT NULL,
            storage_requirement TEXT NOT NULL,
            particle_risk TEXT NOT NULL,
            space_suitability_score REAL NOT NULL,
            harvest_date TEXT NOT NULL
        )
    """)

    # Alerts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            plant_id TEXT,
            message TEXT NOT NULL,
            severity TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            resolved INTEGER NOT NULL DEFAULT 0
        )
    """)

    # Emergency state table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_state (
            id INTEGER PRIMARY KEY,
            is_active INTEGER NOT NULL DEFAULT 0,
            scenario TEXT NOT NULL DEFAULT 'NOMINAL',
            reason TEXT,
            crew_size INTEGER NOT NULL DEFAULT 4,
            remaining_food_days INTEGER NOT NULL DEFAULT 65,
            water_ration_active INTEGER NOT NULL DEFAULT 0,
            backup_crops_started INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        )
    """)

    conn.commit()

    # Seed initial data if tables are empty
    cursor.execute("SELECT COUNT(*) FROM plants")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_data(conn)

    conn.close()


def seed_data(conn=None):
    close_at_end = False
    if conn is None:
        conn = get_connection()
        close_at_end = True

    cursor = conn.cursor()

    # Clear existing
    cursor.execute("DELETE FROM plants")
    cursor.execute("DELETE FROM astronauts")
    cursor.execute("DELETE FROM food_inventory")
    cursor.execute("DELETE FROM alerts")
    cursor.execute("DELETE FROM emergency_state")

    # Load from sample_data.json if exists
    if os.path.exists(SAMPLE_DATA_PATH):
        with open(SAMPLE_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {}

    plants = data.get("plants", [])
    for p in plants:
        cursor.execute("""
            INSERT INTO plants (id, name, species, health_score, growth, water, nutrients, temperature, humidity, light, expected_harvest_date, expected_yield_kg, failure_risk, status, stage, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p["id"], p["name"], p["species"], p["health_score"], p["growth"],
            p["water"], p["nutrients"], p["temperature"], p["humidity"], p["light"],
            p["expected_harvest_date"], p.get("expected_yield_kg", 1.0), p["failure_risk"],
            p["status"], p.get("stage", "Vegetative"), p.get("notes", "")
        ))

    astro = data.get("astronaut", {
        "id": "ASTRO-01",
        "name": "Commander Alex Vance",
        "role": "Mission Commander & Astrobiologist",
        "age": 38,
        "mission_days": 180,
        "preferences": "Fresh crispy greens, mild herbs, nutrient-dense bowls",
        "dietary_requirements": "High protein, calcium retention, low sodium",
        "nutritional_priorities": "Bone density preservation, antioxidant defense, cognitive stamina",
        "avoid": "Very spicy foods, crumbly dehydrated items, high-sulfur compounds"
    })
    cursor.execute("""
        INSERT INTO astronauts (id, name, role, age, mission_days, preferences, dietary_requirements, nutritional_priorities, avoid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        astro["id"], astro["name"], astro.get("role", "Mission Commander"), astro["age"],
        astro["mission_days"], astro["preferences"], astro["dietary_requirements"],
        astro["nutritional_priorities"], astro["avoid"]
    ))

    foods = data.get("food_inventory", [])
    for f in foods:
        cursor.execute("""
            INSERT INTO food_inventory (id, name, quantity_kg, nutrition_score, shelf_life_days, storage_requirement, particle_risk, space_suitability_score, harvest_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f["id"], f["name"], f["quantity_kg"], f["nutrition_score"],
            f["shelf_life_days"], f["storage_requirement"], f["particle_risk"],
            f["space_suitability_score"], f["harvest_date"]
        ))

    alerts = data.get("alerts", [])
    for a in alerts:
        cursor.execute("""
            INSERT INTO alerts (id, type, plant_id, message, severity, timestamp, resolved)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            a["id"], a["type"], a.get("plant_id"), a["message"], a["severity"],
            a["timestamp"], 1 if a.get("resolved") else 0
        ))

    cursor.execute("""
        INSERT INTO emergency_state (id, is_active, scenario, reason, crew_size, remaining_food_days, water_ration_active, backup_crops_started, updated_at)
        VALUES (1, 0, 'NOMINAL', 'Mission operations normal. Bio-habitat nominal.', 4, 65, 0, 0, ?)
    """, (datetime.now(timezone.utc).isoformat(),))

    conn.commit()
    if close_at_end:
        conn.close()


def get_all_plants() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM plants ORDER BY name ASC")
    rows = cursor.fetchall()
    plants = [dict(r) for r in rows]
    conn.close()
    return plants


def get_plant_by_id(plant_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM plants WHERE id = ? OR name LIKE ?", (plant_id, f"%{plant_id}%"))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_plant(plant_id: str, **kwargs):
    conn = get_connection()
    cursor = conn.cursor()
    set_clause = ", ".join([f"{k} = ?" for k in kwargs.keys()])
    values = list(kwargs.values()) + [plant_id]
    cursor.execute(f"UPDATE plants SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_astronaut() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM astronauts LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


def update_astronaut(data: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE astronauts
        SET name = ?, role = ?, age = ?, mission_days = ?, preferences = ?,
            dietary_requirements = ?, nutritional_priorities = ?, avoid = ?
        WHERE id = ?
    """, (
        data.get("name", "Commander Alex Vance"),
        data.get("role", "Mission Commander"),
        data.get("age", 38),
        data.get("mission_days", 180),
        data.get("preferences", ""),
        data.get("dietary_requirements", ""),
        data.get("nutritional_priorities", ""),
        data.get("avoid", ""),
        data.get("id", "ASTRO-01")
    ))
    conn.commit()
    conn.close()


def get_food_inventory() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM food_inventory ORDER BY shelf_life_days ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_food_item(item: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO food_inventory (id, name, quantity_kg, nutrition_score, shelf_life_days, storage_requirement, particle_risk, space_suitability_score, harvest_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item["id"], item["name"], item["quantity_kg"], item["nutrition_score"],
        item["shelf_life_days"], item["storage_requirement"], item["particle_risk"],
        item["space_suitability_score"], item["harvest_date"]
    ))
    conn.commit()
    conn.close()


def get_alerts(only_unresolved: bool = False) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if only_unresolved:
        cursor.execute("SELECT * FROM alerts WHERE resolved = 0 ORDER BY timestamp DESC")
    else:
        cursor.execute("SELECT * FROM alerts ORDER BY resolved ASC, timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_alert(alert_type: str, message: str, severity: str = "MEDIUM", plant_id: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    unique_suffix = uuid.uuid4().hex[:6]
    alert_id = f"ALT-{int(datetime.now(timezone.utc).timestamp())}-{unique_suffix}"
    cursor.execute("""
        INSERT INTO alerts (id, type, plant_id, message, severity, timestamp, resolved)
        VALUES (?, ?, ?, ?, ?, ?, 0)
    """, (alert_id, alert_type, plant_id, message, severity, datetime.now(timezone.utc).isoformat()))
    conn.commit()
    conn.close()
    return alert_id


def resolve_alert(alert_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET resolved = 1 WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()


def get_emergency_state() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergency_state WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {
        "is_active": 0,
        "scenario": "NOMINAL",
        "reason": "Nominal",
        "crew_size": 4,
        "remaining_food_days": 65,
        "water_ration_active": 0,
        "backup_crops_started": 0
    }


def set_emergency_state(is_active: bool, scenario: str, reason: str, remaining_food_days: int = 18):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE emergency_state
        SET is_active = ?, scenario = ?, reason = ?, remaining_food_days = ?,
            water_ration_active = ?, backup_crops_started = ?, updated_at = ?
        WHERE id = 1
    """, (
        1 if is_active else 0,
        scenario,
        reason,
        remaining_food_days if is_active else 65,
        1 if is_active else 0,
        1 if is_active else 0,
        datetime.now(timezone.utc).isoformat()
    ))
    conn.commit()
    conn.close()


# Demo Mode Scenarios
def trigger_stress_scenario():
    """Demo Scenario 2: Plant Stress on Tomato-03"""
    update_plant(
        "TOM-03",
        health_score=48.0,
        water=180.0,
        nutrients=42.0,
        temperature=27.4,
        humidity=41.0,
        failure_risk=78.0,
        status="Critical Stress",
        notes="Severe root desiccation and early blossom end rot detected by optical sensors."
    )
    add_alert(
        alert_type="CROP_FAILURE_WARNING",
        plant_id="TOM-03",
        message="CRITICAL: Tomato-03 failure risk reached 78%. Immediate nutrient flush and root hydration required.",
        severity="HIGH"
    )


def trigger_emergency_scenario():
    """Demo Scenario 3: Emergency Mission Mode"""
    trigger_stress_scenario()
    set_emergency_state(
        is_active=True,
        scenario="CRITICAL_CROP_LOSS_WATER_SHORTAGE",
        reason="Tomato-03 failure detected. Secondary hydroponic loop valve blockage. Remaining crew food ration reduced to 18 days.",
        remaining_food_days=18
    )
    add_alert(
        alert_type="MISSION_EMERGENCY",
        plant_id=None,
        message="EMERGENCY PROTOCOL ENGAGED: Food buffer dropped below 21-day critical margin. Rations reduced by 15%. Early harvest mandated.",
        severity="CRITICAL"
    )


def reset_nominal_scenario():
    """Reset to baseline pristine state"""
    seed_data()
