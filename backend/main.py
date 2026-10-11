import os
import sys
import random
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from database import (
    init_db, get_all_plants, get_plant_by_id, update_plant,
    get_astronaut, update_astronaut, get_food_inventory, add_food_item,
    get_alerts, add_alert, resolve_alert, get_emergency_state, set_emergency_state,
    trigger_stress_scenario, trigger_emergency_scenario, reset_nominal_scenario
)
from ai_analysis import analyze_plant_image, get_preset_samples
from prediction import calculate_growth_and_failure_risk, get_all_crop_predictions
from recommendations import (
    calculate_resource_optimization, calculate_space_food_suitability,
    generate_astronaut_meal_recommendation, generate_nutrition_monitor, generate_ai_insights
)

app = FastAPI(
    title="Space2Plate API",
    description="AI-Powered Space Food Security System Backend",
    version="1.0.0"
)

# Enable CORS for local development and any port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Simulated live environmental sensor state
current_env = {
    "temperature": 22.4,
    "temperature_range": [19.0, 26.0],
    "humidity": 64.8,
    "humidity_range": [55.0, 75.0],
    "co2": 950.0,
    "co2_range": [700.0, 1200.0],
    "light_intensity": 360.0,
    "light_range": [250.0, 450.0],
    "water_tank_level": 78.4,
    "nutrient_level": 84.2,
    "power_status": "NOMINAL (Solar Array / Fuel Cell 3)",
    "air_circulation": "ACTIVE (Laminar Microgravity Duct 4)",
    "radiation_shielding": "OPTIMAL (0.012 mSv/h)"
}


# ==========================================
# 1. DASHBOARD & OVERVIEW
# ==========================================
@app.get("/api/dashboard")
def get_dashboard():
    plants = get_all_plants()
    inventory = get_food_inventory()
    alerts = get_alerts(only_unresolved=True)
    emergency = get_emergency_state()
    is_emergency = bool(emergency.get("is_active", 0))

    total_plants = len(plants)
    healthy_plants = sum(1 for p in plants if float(p.get("health_score", 0)) >= 80)
    plants_at_risk = sum(1 for p in plants if float(p.get("failure_risk", 0)) > 30)

    # Average or peak failure risk
    max_risk = max([float(p.get("failure_risk", 0)) for p in plants]) if plants else 0.0

    # Total water usage and savings
    optimizations = calculate_resource_optimization(plants)
    total_water_current = sum(o["current_water_ml"] for o in optimizations)
    total_water_optimized = sum(o["optimized_water_ml"] for o in optimizations)
    total_water_saved = sum(o["water_saving_ml"] for o in optimizations)

    total_food_kg = sum(float(f.get("quantity_kg", 0)) for f in inventory)
    remaining_food_days = emergency.get("remaining_food_days", 65)

    insights = generate_ai_insights(plants, emergency_active=is_emergency)

    # Nearest upcoming harvest
    sorted_harvest = sorted(plants, key=lambda x: x.get("growth", 0), reverse=True)
    nearest_harvest = sorted_harvest[0] if sorted_harvest else None

    return {
        "mission": {
            "name": "Artemis Bio-Hab Alpha",
            "station": "Deep Space Gateway / Habitat",
            "sol": 142,
            "mission_days_remaining": 238,
            "crew_size": emergency.get("crew_size", 4),
            "emergency_mode": is_emergency,
            "emergency_scenario": emergency.get("scenario", "NOMINAL")
        },
        "stats": {
            "total_plants": total_plants,
            "healthy_plants": healthy_plants,
            "plants_at_risk": plants_at_risk,
            "max_crop_failure_risk": max_risk,
            "expected_harvest_crop": nearest_harvest.get("name") if nearest_harvest else "N/A",
            "expected_harvest_date": nearest_harvest.get("expected_harvest_date") if nearest_harvest else "N/A",
            "water_usage_current_ml": round(total_water_current, 1),
            "water_usage_optimized_ml": round(total_water_optimized, 1),
            "water_savings_ml": round(total_water_saved, 1),
            "water_savings_percent": round((total_water_saved / total_water_current * 100), 1) if total_water_current > 0 else 0,
            "nutrient_status": "NOMINAL (84.2%)" if not is_emergency else "CONSERVATION RATIO",
            "food_stock_kg": round(total_food_kg, 1),
            "food_stock_days_remaining": remaining_food_days,
            "active_alerts_count": len(alerts)
        },
        "environment": current_env,
        "recent_alerts": alerts[:4],
        "ai_insights": insights
    }


# ==========================================
# 2. PLANT MONITORING
# ==========================================
@app.get("/api/plants")
def list_plants():
    return get_all_plants()


@app.get("/api/plants/{plant_id}")
def get_plant_detail(plant_id: str):
    plant = get_plant_by_id(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    prediction = calculate_growth_and_failure_risk(plant)
    return {
        "plant": plant,
        "prediction": prediction
    }


@app.post("/api/plants/{plant_id}/water")
def water_plant(plant_id: str):
    plant = get_plant_by_id(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    new_health = min(98.0, float(plant["health_score"]) + 15.0)
    new_risk = max(5.0, float(plant["failure_risk"]) - 25.0)
    new_water = min(500.0, float(plant["water"]) + 60.0)
    new_status = "Healthy" if new_health >= 80 else "Recovering"

    update_plant(
        plant_id,
        health_score=new_health,
        failure_risk=new_risk,
        water=new_water,
        status=new_status,
        notes="Automated hydration pulse administered. Root moisture recovering."
    )
    add_alert(
        alert_type="ACTION_EXECUTED",
        plant_id=plant_id,
        message=f"Root hydration cycle applied to {plant['name']}. Health score recovered to {new_health}%.",
        severity="LOW"
    )
    return {
        "message": f"Successfully hydrated {plant['name']}",
        "new_health": new_health,
        "new_risk": new_risk
    }


# ==========================================
# 3. AI PLANT IMAGE ANALYSIS
# ==========================================
@app.post("/api/analyze-plant")
async def analyze_plant(
    file: Optional[UploadFile] = File(None),
    preset_id: Optional[str] = Form(None)
):
    # Check if a preset was selected
    if preset_id:
        presets = get_preset_samples()
        match = next((p for p in presets if p["id"] == preset_id), None)
        if match:
            return match

    if not file:
        # Default fallback sample
        presets = get_preset_samples()
        return presets[0]

    image_bytes = await file.read()
    result = analyze_plant_image(image_bytes, filename=file.filename or "")

    # If analyzed plant is in high stress, automatically record an alert
    if result.get("warning_flag"):
        add_alert(
            alert_type="AI_VISION_WARNING",
            plant_id=result.get("plant_name", "Uploaded Specimen"),
            message=f"AI Vision detected {result.get('possible_stress')} on {result.get('plant_name')} (Health: {result.get('health_score')}%).",
            severity="HIGH" if result.get("health_score", 100) < 50 else "MEDIUM"
        )

    return result


@app.get("/api/analyze-presets")
def get_presets():
    return get_preset_samples()


# ==========================================
# 4. ENVIRONMENTAL MONITORING
# ==========================================
@app.get("/api/environment")
def get_environment():
    # Slightly drift simulated readings for realistic real-time sensor feel
    current_env["temperature"] = round(current_env["temperature"] + random.uniform(-0.15, 0.15), 1)
    current_env["humidity"] = round(max(40.0, min(80.0, current_env["humidity"] + random.uniform(-0.3, 0.3))), 1)
    current_env["co2"] = round(max(800.0, min(1100.0, current_env["co2"] + random.uniform(-5.0, 5.0))), 0)

    # Evaluate warning conditions
    warnings = []
    if current_env["temperature"] > 26.0:
        warnings.append({"type": "TEMPERATURE_HIGH", "message": "Temperature exceeded safe range (Max 26.0°C)"})
    elif current_env["temperature"] < 19.0:
        warnings.append({"type": "TEMPERATURE_LOW", "message": "Temperature below threshold (Min 19.0°C)"})

    if current_env["water_tank_level"] < 40.0:
        warnings.append({"type": "WATER_SHORTAGE", "message": "Water tank below 40% threshold! Engage closed-loop recycling."})

    if current_env["nutrient_level"] < 50.0:
        warnings.append({"type": "NUTRIENT_DEFICIENCY", "message": "Bio-nutrient reservoir low! Replenish stock formulation."})

    return {
        "telemetry": current_env,
        "warnings": warnings,
        "is_safe": len(warnings) == 0,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ==========================================
# 5. GROWTH & FAILURE PREDICTIONS
# ==========================================
@app.get("/api/predictions")
def get_predictions():
    plants = get_all_plants()
    return get_all_crop_predictions(plants)


# ==========================================
# 6. RESOURCE OPTIMIZATION
# ==========================================
@app.get("/api/resources")
def get_resources():
    plants = get_all_plants()
    optimizations = calculate_resource_optimization(plants)
    total_water_curr = sum(o["current_water_ml"] for o in optimizations)
    total_water_opt = sum(o["optimized_water_ml"] for o in optimizations)
    total_nutr_curr = sum(o["current_nutrients_ppm"] for o in optimizations)
    total_nutr_opt = sum(o["optimized_nutrients_ppm"] for o in optimizations)

    return {
        "optimizations": optimizations,
        "summary": {
            "total_water_current_ml": round(total_water_curr, 1),
            "total_water_optimized_ml": round(total_water_opt, 1),
            "total_water_saved_ml": round(total_water_curr - total_water_opt, 1),
            "water_efficiency_gain_pct": round((total_water_curr - total_water_opt) / total_water_curr * 100, 1) if total_water_curr > 0 else 0,
            "total_nutrients_saved_ppm": round(total_nutr_curr - total_nutr_opt, 1),
            "prototype_note": "Resource recommendations are prototype heuristic estimates based on closed-loop life support simulation."
        }
    }


# ==========================================
# 7. HARVEST & FOOD SUITABILITY
# ==========================================
@app.get("/api/harvest")
def get_harvest_readiness():
    plants = get_all_plants()
    harvest_evals = []
    for p in plants:
        growth = float(p.get("growth", 0))
        suitability = calculate_space_food_suitability(p.get("species", p.get("name")), raw_nutrition=float(p.get("health_score", 85)))

        if growth >= 90:
            status = "READY TO HARVEST"
            rec = "Harvest within 24-48 hours to preserve peak micro-nutrient density."
            shelf_days = 5
        elif growth >= 70:
            status = "APPROACHING MATURITY"
            rec = f"Projected harvest in {max(1, round((100 - growth) / 3.0))} days."
            shelf_days = 6
        else:
            status = "VEGETATIVE GROWTH"
            rec = "Continue vegetative illumination and root hydration."
            shelf_days = 7

        harvest_evals.append({
            "plant_id": p.get("id"),
            "name": p.get("name"),
            "species": p.get("species"),
            "growth": growth,
            "status": status,
            "expected_harvest_date": p.get("expected_harvest_date"),
            "expected_yield_kg": p.get("expected_yield_kg", 1.0),
            "shelf_life_days": shelf_days,
            "storage_requirement": "Moist Cold Cassette (4°C, 85% RH)",
            "harvest_recommendation": rec,
            "food_suitability": suitability
        })
    return harvest_evals


@app.post("/api/harvest/{plant_id}")
def execute_harvest(plant_id: str):
    plant = get_plant_by_id(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    yield_kg = float(plant.get("expected_yield_kg", 1.2))
    food_id = f"FOOD-{int(datetime.now(timezone.utc).timestamp())}"

    # Add harvested crop to food inventory
    add_food_item({
        "id": food_id,
        "name": f"Fresh Space {plant['name']}",
        "quantity_kg": yield_kg,
        "nutrition_score": float(plant.get("health_score", 90)),
        "shelf_life_days": 6,
        "storage_requirement": "Aerotote Chill (4°C)",
        "particle_risk": "Low",
        "space_suitability_score": 93.0,
        "harvest_date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    })

    # Reset plant cycle for next growth run
    update_plant(
        plant_id,
        growth=12.0,
        status="Regrowing (Seedling)",
        stage="Seedling",
        notes=f"Harvested {yield_kg} kg on Sol 142. Next germination cycle initiated."
    )

    add_alert(
        alert_type="HARVEST_COMPLETED",
        plant_id=plant_id,
        message=f"Harvest completed: {plant['name']} yielded {yield_kg} kg of fresh produce transferred to food inventory.",
        severity="LOW"
    )

    return {
        "message": f"Successfully harvested {plant['name']}",
        "yield_kg": yield_kg,
        "transferred_to_inventory": food_id
    }


# ==========================================
# 8. MISSION FOOD INVENTORY & SUITABILITY
# ==========================================
@app.get("/api/food")
def get_food():
    inventory = get_food_inventory()
    evaluated = []
    for item in inventory:
        suitability = calculate_space_food_suitability(
            item["name"],
            raw_nutrition=float(item.get("nutrition_score", 85)),
            shelf_life_days=int(item.get("shelf_life_days", 7))
        )
        evaluated.append({
            **item,
            "suitability_details": suitability,
            "near_expiry": int(item.get("shelf_life_days", 10)) <= 5,
            "low_stock": float(item.get("quantity_kg", 10)) < 2.0
        })
    return evaluated


# ==========================================
# 9. ASTRONAUT PROFILE & RECOMMENDATION
# ==========================================
@app.get("/api/astronaut")
def get_astronaut_profile():
    return get_astronaut()


@app.post("/api/astronaut")
def update_astronaut_profile(profile: Dict[str, Any]):
    update_astronaut(profile)
    return {"message": "Astronaut profile updated successfully"}


@app.post("/api/recommend-food")
def recommend_food(custom_request: Optional[Dict[str, Any]] = None):
    astronaut = get_astronaut()
    plants = get_all_plants()
    inventory = get_food_inventory()
    emergency = get_emergency_state()
    is_emergency = bool(emergency.get("is_active", 0))

    recommendation = generate_astronaut_meal_recommendation(
        astronaut=astronaut,
        plants=plants,
        inventory=inventory,
        emergency_active=is_emergency
    )
    return recommendation


@app.get("/api/nutrition")
def get_astronaut_nutrition():
    return generate_nutrition_monitor(
        astronaut=get_astronaut(),
        plants=get_all_plants(),
        inventory=get_food_inventory()
    )


# ==========================================
# 10. ALERTS MANAGEMENT
# ==========================================
@app.get("/api/alerts")
def list_alerts():
    return get_alerts()


@app.post("/api/alerts/{alert_id}/resolve")
def resolve_existing_alert(alert_id: str):
    resolve_alert(alert_id)
    return {"message": f"Alert {alert_id} marked as resolved"}


# ==========================================
# 11. EMERGENCY MISSION MODE
# ==========================================
@app.get("/api/emergency")
def get_emergency_dashboard():
    emergency = get_emergency_state()
    is_active = bool(emergency.get("is_active", 0))
    plants = get_all_plants()
    inventory = get_food_inventory()
    astronaut = get_astronaut()

    meal_plan = generate_astronaut_meal_recommendation(astronaut, plants, inventory, emergency_active=is_active)

    return {
        "emergency_state": emergency,
        "is_active": is_active,
        "scenario": emergency.get("scenario", "NOMINAL"),
        "reason": emergency.get("reason", "Nominal operations"),
        "crew_size": emergency.get("crew_size", 4),
        "remaining_food_days": emergency.get("remaining_food_days", 65),
        "critical_actions": [
            {"id": 1, "title": "Harvest mature crops early", "status": "PENDING" if is_active else "STANDBY", "detail": "Reclaim all biomass from Spinach-04 and Lettuce-01 to avoid loss."},
            {"id": 2, "title": "Prioritize high-nutrition food", "status": "ACTIVE" if is_active else "STANDBY", "detail": "Distribute Spirulina and protein-dense rations first."},
            {"id": 3, "title": "Reduce non-essential water usage", "status": "ENFORCED" if is_active else "STANDBY", "detail": "Switch hydroponic loop to survival mist cycle (-25% water)."},
            {"id": 4, "title": "Adjust crew meal plan", "status": "ACTIVE" if is_active else "STANDBY", "detail": "Ration intake to 2,100 kcal with maximized electrolyte retention."},
            {"id": 5, "title": "Start backup crop cultivation", "status": "INCUBATING" if is_active else "STANDBY", "detail": "Deploy emergency microgreen trays (Fast-yield 4-day cycle)."}
        ],
        "emergency_meal_plan": meal_plan
    }


@app.post("/api/emergency/toggle")
def toggle_emergency(active: bool = Form(...), reason: Optional[str] = Form(None)):
    if active:
        set_emergency_state(
            is_active=True,
            scenario="MANUAL_SIMULATION_ALERT",
            reason=reason or "Manual emergency override triggered by crew command.",
            remaining_food_days=18
        )
        add_alert(
            alert_type="MISSION_EMERGENCY",
            plant_id=None,
            message=f"MANUAL EMERGENCY MODE ENGAGED: {reason or 'Crew initiated emergency conservation protocol.'}",
            severity="CRITICAL"
        )
    else:
        set_emergency_state(
            is_active=False,
            scenario="NOMINAL",
            reason="Nominal space agriculture restored.",
            remaining_food_days=65
        )
        add_alert(
            alert_type="EMERGENCY_CLEARED",
            plant_id=None,
            message="Mission emergency standing down. Normal nutrition protocol resumed.",
            severity="LOW"
        )
    return {"is_active": active, "message": "Emergency status updated"}


# ==========================================
# 12. DEMO MODE ENGINE (FOR 3-MIN HACKATHON PITCH)
# ==========================================
@app.post("/api/demo/stress")
def demo_stress_step():
    """Scenario 2: Plant Stress on Tomato-03"""
    trigger_stress_scenario()
    return {
        "status": "STRESS_SIMULATED",
        "plant_affected": "Tomato-03",
        "new_risk": 78.0,
        "message": "Demo Scenario 2: Tomato-03 water desiccation and failure risk escalated to 78%."
    }


@app.post("/api/demo/emergency")
def demo_emergency_step():
    """Scenario 3: Mission Emergency Triggered"""
    trigger_emergency_scenario()
    return {
        "status": "EMERGENCY_SIMULATED",
        "scenario": "CRITICAL_CROP_LOSS_WATER_SHORTAGE",
        "food_days_remaining": 18,
        "message": "Demo Scenario 3: Full mission emergency engaged. Remaining food recalculated to 18 days."
    }


@app.post("/api/demo/reset")
def demo_reset():
    """Scenario 1: Reset to baseline Nominal Mission"""
    reset_nominal_scenario()
    return {
        "status": "NOMINAL_RESET",
        "message": "System restored to pristine nominal state. All plants healthy."
    }


# ==========================================
# 13. AI INSIGHTS
# ==========================================
@app.get("/api/insights")
def get_insights():
    plants = get_all_plants()
    emergency = get_emergency_state()
    return generate_ai_insights(plants, emergency_active=bool(emergency.get("is_active", 0)))


# ==========================================
# 14. WEBSOCKET FOR REAL-TIME TELEMETRY
# ==========================================
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Send live telemetry tick every 2.5 seconds
            current_env["temperature"] = round(current_env["temperature"] + random.uniform(-0.1, 0.1), 1)
            current_env["humidity"] = round(max(50.0, min(75.0, current_env["humidity"] + random.uniform(-0.2, 0.2))), 1)
            current_env["co2"] = round(max(850.0, min(1050.0, current_env["co2"] + random.uniform(-3.0, 3.0))), 0)

            await websocket.send_json({
                "type": "TELEMETRY_TICK",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "telemetry": current_env
            })
            await asyncio.sleep(2.5)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


# ==========================================
# 15. FRONTEND STATIC MOUNTING
# ==========================================
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

if os.path.exists(frontend_dir):
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")

    @app.api_route("/", methods=["GET", "HEAD"])
    def serve_index():
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Space2Plate API online. Frontend index.html not found."}

    @app.get("/favicon.ico")
    def favicon():
        fav = os.path.join(frontend_dir, "assets", "sample_healthy_lettuce.png")
        if os.path.exists(fav):
            return FileResponse(fav)
        return JSONResponse({"status": "ok"}, status_code=200)

    @app.get("/dashboard")
    def serve_dashboard():
        dash_file = os.path.join(frontend_dir, "dashboard.html")
        if os.path.exists(dash_file):
            return FileResponse(dash_file)
        return FileResponse(os.path.join(frontend_dir, "index.html"))
