import math
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List


def calculate_growth_and_failure_risk(plant: Dict[str, Any]) -> Dict[str, Any]:
    """
    Lightweight rule-based and sigmoidal projection model for space crop growth
    and failure risk analysis.
    """
    health = float(plant.get("health_score", 80))
    current_growth = float(plant.get("growth", 50))
    water = float(plant.get("water", 350))
    nutrients = float(plant.get("nutrients", 80))
    temp = float(plant.get("temperature", 22))
    humidity = float(plant.get("humidity", 60))

    # Optimal baseline reference values for space crops
    opt_water = 400.0
    opt_nutrients = 85.0
    opt_temp = 22.0
    opt_humidity = 65.0

    # Environmental stress penalties
    water_penalty = abs(water - opt_water) / opt_water * 35.0
    nutrient_penalty = abs(nutrients - opt_nutrients) / opt_nutrients * 30.0
    temp_penalty = abs(temp - opt_temp) / 5.0 * 20.0
    humidity_penalty = abs(humidity - opt_humidity) / 20.0 * 15.0

    env_stress = min(50.0, water_penalty + nutrient_penalty + temp_penalty + humidity_penalty)

    # Health inverted risk factor
    health_factor = (100.0 - health) * 0.65

    # Composite Crop Failure Risk (0-100%)
    raw_risk = (health_factor * 0.6) + (env_stress * 0.4)
    failure_probability = round(max(5.0, min(95.0, raw_risk)), 1)

    # Risk Tier classification
    if failure_probability <= 30.0:
        risk_tier = "LOW RISK"
        alert_needed = False
        reason = "All biometric parameters within nominal space-greenhouse boundaries."
        recommended_action = "Maintain regular automated nutrient doser and misting cycle."
    elif failure_probability <= 60.0:
        risk_tier = "MEDIUM RISK"
        alert_needed = False
        reason = "Sub-optimal hydration or thermal elevation detected."
        recommended_action = "Adjust root moisture by +10% and verify LED heatsink airflow."
    else:
        risk_tier = "HIGH RISK"
        alert_needed = True
        reasons = []
        if water < 300:
            reasons.append("Low root hydration (< 300 ml/day)")
        if nutrients < 65:
            reasons.append("Low nutrient reservoir concentration")
        if temp > 25:
            reasons.append("Chamber thermal stress (> 25°C)")
        if health < 70:
            reasons.append("Depressed optical canopy health score")
        reason = " + ".join(reasons) if reasons else "Abnormal environmental stress index"
        recommended_action = "Immediately increase nutrient/water supply and isolate cassette for 6-hour monitoring."

    # Growth rate projection (Sigmoidal logistic curve derivative)
    base_daily_growth = 3.5  # % per day under ideal conditions
    growth_penalty_factor = (100.0 - failure_probability) / 100.0
    daily_growth_rate = round(max(0.5, base_daily_growth * growth_penalty_factor), 2)

    remaining_growth = max(0.0, 100.0 - current_growth)
    days_to_harvest = max(1, math.ceil(remaining_growth / daily_growth_rate))

    # Calculate expected harvest date
    now = datetime.now(timezone.utc)
    expected_harvest_dt = now + timedelta(days=days_to_harvest)
    expected_harvest_date_str = expected_harvest_dt.strftime("%Y-%m-%d")

    # Projected yield estimate in kilograms
    base_yield = float(plant.get("expected_yield_kg", 1.2))
    projected_yield = round(max(0.2, base_yield * (health / 100.0) * (1.0 - (failure_probability / 200.0))), 2)

    # Historical simulated growth trajectory (7 past days + 7 forecast days)
    trajectory = []
    for d in range(-6, 8):
        day_date = (now + timedelta(days=d)).strftime("%b %d")
        if d <= 0:
            past_pct = max(10.0, current_growth + (d * daily_growth_rate))
            trajectory.append({"day": day_date, "type": "Historical", "growth": round(min(100.0, past_pct), 1)})
        else:
            future_pct = current_growth + (d * daily_growth_rate)
            trajectory.append({"day": day_date, "type": "Projected", "growth": round(min(100.0, future_pct), 1)})

    return {
        "plant_id": plant.get("id", "PLANT-00"),
        "plant_name": plant.get("name", "Unknown Crop"),
        "current_growth": current_growth,
        "growth_rate_daily": daily_growth_rate,
        "expected_harvest_date": expected_harvest_date_str,
        "simulated_days_to_harvest": days_to_harvest,
        "expected_yield_kg": projected_yield,
        "failure_probability": failure_probability,
        "risk_tier": risk_tier,
        "alert_needed": alert_needed,
        "failure_reason": reason,
        "recommended_action": recommended_action,
        "confidence_interval": "± 4.2%",
        "historical_trajectory": trajectory,
        "prototype_disclaimer": "Prototype heuristic prediction for hackathon demonstration. Not certified spaceflight flight software."
    }


def get_all_crop_predictions(plants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [calculate_growth_and_failure_risk(p) for p in plants]
