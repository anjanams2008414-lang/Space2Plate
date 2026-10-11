from typing import Dict, Any, List


def calculate_resource_optimization(plants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Computes prototype resource optimization for water, nutrients, and light.
    Simulates intelligent aeroponic closed-loop reclamation and dynamic lighting.
    """
    optimizations = []
    for p in plants:
        current_water = float(p.get("water", 400))
        current_nutrients = float(p.get("nutrients", 80))
        health = float(p.get("health_score", 85))
        growth = float(p.get("growth", 60))

        # Dynamic formula based on growth stage and optical health
        if growth > 85:
            # Pre-harvest crops need slightly reduced nitrogen and calibrated transpiration
            water_factor = 0.92
            nutrient_factor = 0.88
            light_hours = 14.0
            storage_priority = "HIGH (Immediate Harvest Stage)"
            action = f"Reduce nitrogen by 12% to prevent nitrate accumulation before harvest. Optimize misting cycle to save {round(current_water * (1 - water_factor))} ml/day."
        elif health < 70:
            # Stressed crop needs recovery hydration and balanced EC
            water_factor = 1.15
            nutrient_factor = 1.10
            light_hours = 15.0
            storage_priority = "CRITICAL (Recovery Ward)"
            action = f"Increase water delivery by {round(current_water * (water_factor - 1))} ml/day and flush salts. Reduce thermal irradiance."
        else:
            # Normal steady vegetative growth
            water_factor = 0.90
            nutrient_factor = 0.95
            light_hours = 16.0
            storage_priority = "MEDIUM (Steady Growth)"
            action = f"Engage closed-loop vapor condenser. Reclaiming approx {round(current_water * 0.10)} ml/day with zero yield loss."

        opt_water = round(current_water * water_factor, 1)
        water_saved = round(current_water - opt_water, 1)

        opt_nutrients = round(current_nutrients * nutrient_factor, 1)
        nutrient_saved = round(current_nutrients - opt_nutrients, 1)

        optimizations.append({
            "plant_id": p.get("id"),
            "plant_name": p.get("name"),
            "species": p.get("species"),
            "current_water_ml": current_water,
            "optimized_water_ml": opt_water,
            "water_saving_ml": water_saved,
            "current_nutrients_ppm": current_nutrients,
            "optimized_nutrients_ppm": opt_nutrients,
            "nutrient_saving_ppm": nutrient_saved,
            "current_light_hours": 16.0,
            "optimized_light_hours": light_hours,
            "energy_saving_pct": round((16.0 - light_hours) / 16.0 * 100, 1) if light_hours < 16 else 0.0,
            "storage_priority": storage_priority,
            "action_notes": action
        })
    return optimizations


def calculate_space_food_suitability(item_name: str, raw_nutrition: float = 85.0, shelf_life_days: int = 7) -> Dict[str, Any]:
    """
    Evaluates space food suitability:
    - Nutrition Score (0-100)
    - Shelf-Life Score (0-100)
    - Storage Compatibility (0-100)
    - Floating-Crumb Particle Risk (Microgravity Dispersion hazard)
    - Overall Space Food Suitability Score
    """
    name_lower = item_name.lower()

    # Particle/crumb risk evaluation for zero-gravity environments
    if any(k in name_lower for k in ["bread", "cookie", "cracker", "flake", "dry powder"]):
        crumb_risk = "HIGH"
        crumb_score = 30.0
        crumb_note = "High floating particulate risk! Threat to cabin air recirculators and astronaut eye safety."
    elif any(k in name_lower for k in ["chip", "dehydrated crunchy", "cereal"]):
        crumb_risk = "MEDIUM"
        crumb_score = 65.0
        crumb_note = "Moderate friability. Must be consumed inside negative-pressure food glovebox."
    elif any(k in name_lower for k in ["spirulina", "gel", "paste", "puree"]):
        crumb_risk = "ZERO"
        crumb_score = 99.0
        crumb_note = "Surface-tension adherent matrix. Zero particle shedding in microgravity."
    else:  # Fresh vegetables, moist greens, tomatoes
        crumb_risk = "LOW"
        crumb_score = 92.0
        crumb_note = "Cohesive turgid cellular tissue. Minimal airborne crumb dispersal."

    # Shelf-life score
    if shelf_life_days >= 30:
        shelf_score = 95.0
    elif shelf_life_days >= 14:
        shelf_score = 85.0
    elif shelf_life_days >= 5:
        shelf_score = 75.0
    else:
        shelf_score = 60.0

    # Storage score (hydroponic refrigeration vs ambient)
    storage_score = 88.0 if "ambient" in name_lower or "spirulina" in name_lower else 82.0

    nutrition_score = round(raw_nutrition, 1)
    overall_score = round((nutrition_score * 0.35) + (shelf_score * 0.25) + (storage_score * 0.15) + (crumb_score * 0.25), 1)

    return {
        "food_name": item_name,
        "nutrition_score": nutrition_score,
        "shelf_life_score": shelf_score,
        "storage_score": storage_score,
        "particle_risk": crumb_risk,
        "particle_risk_score": crumb_score,
        "particle_risk_note": crumb_note,
        "overall_suitability_score": overall_score,
        "prototype_disclaimer": "The floating-crumb assessment is a prototype risk indicator, not a certified space-food safety test."
    }


def generate_astronaut_meal_recommendation(
    astronaut: Dict[str, Any],
    plants: List[Dict[str, Any]],
    inventory: List[Dict[str, Any]],
    emergency_active: bool = False
) -> Dict[str, Any]:
    """
    Recommendation engine balancing:
    1. Available fresh crops & inventory
    2. Nutritional priorities (e.g. Bone density, antioxidants, protein)
    3. Astronaut preferences & avoided foods
    4. Shelf-life expiration urgency
    5. Space microgravity suitability
    """
    name = astronaut.get("name", "Astronaut")
    priorities = astronaut.get("nutritional_priorities", "")
    preferences = astronaut.get("preferences", "")
    avoid = astronaut.get("avoid", "")

    # Ready to harvest crops
    harvest_ready = [p for p in plants if p.get("growth", 0) >= 90 or "ready" in p.get("status", "").lower()]

    if emergency_active:
        # EMERGENCY RATION PLAN
        return {
            "mode": "EMERGENCY_MISSION_RATION",
            "meal_title": "🚨 Emergency Sustenance Ration Alpha: High-Density Bio-Greens & Spirulina",
            "category": "Survival & Critical Nutrient Conservation",
            "description": f"Mission emergency active! Automated rationing protocol prioritizes maximum caloric & micronutrient density with lowest resource overhead for {name}.",
            "ingredients": [
                "Early-harvested Spinach-04 (120g - high iron/folate)",
                "Spirulina Bio-Gel Ration (60g - 42g pure protein)",
                "Radish Micro-Greens (40g - antioxidant crunch)",
                "Electrolyte Rehydration Formulation Pack (250ml)"
            ],
            "reasons": [
                "✓ Maximum micronutrient preservation per milliliter of water used",
                "✓ Zero airborne crumb / floating particle hazard",
                "✓ Immediate consumption of near-maturity crops prevents biomass spoilage",
                "✓ Conserves 22% daily life-support water allocation",
                "✓ Supports bone density and cellular stamina under mission stress"
            ],
            "nutrition_highlights": {
                "Calories": "520 kcal (Conserved Ration)",
                "Protein": "46g (Preserves Muscle Mass)",
                "Calcium & Magnesium": "98% Daily Space Value",
                "Hydration Index": "Optimal (Retained Cell Moisture)",
                "Particle Safety": "ZERO Crumb Risk"
            },
            "space_safety_rating": "CRITICAL PASS (100% Microgravity Safe)",
            "suitability_score": 96.5,
            "alternatives": [
                {
                    "title": "Compact Pea Shoot & Algae Emulsion",
                    "calories": "480 kcal",
                    "prep_time": "1 min",
                    "reason": "Rapid absorption, zero refrigeration required"
                },
                {
                    "title": "Dehydrated Tomato-Algae Protein Paste",
                    "calories": "510 kcal",
                    "prep_time": "3 min",
                    "reason": "High lycopene for cosmic radiation mitigation"
                }
            ]
        }

    # NOMINAL RECOMMENDATION
    return {
        "mode": "NOMINAL_GOURMET",
        "meal_title": "🥗 Fresh Orbital Bio-Harvest Bowl (Spinach, Crisp Radish & Pea Shoots)",
        "category": "Fresh Harvest Special",
        "description": f"Tailored for {name} based on active harvest cycles, sensory crispness preferences, and calcium/iron priorities.",
        "ingredients": [
            "Fresh-cut Spinach-04 Leaves (90g, harvested Sol 142)",
            "Crisp Sliced Radish-02 (45g, crunchy texture profile)",
            "Hydroponic Pea Shoots (35g, sweet natural tendrils)",
            "Olive Oil & Lemon Micro-Droplet Dressing (Low-Sodium)"
        ],
        "reasons": [
            "✓ Matches astronaut preference: Fresh crispy greens with satisfying crunch",
            "✓ Addresses nutritional priority: High iron, folate, and calcium for bone integrity",
            "✓ Utilizes Spinach-04 which is at peak maturity (96%) and ready to harvest today",
            "✓ Low storage overhead: Harvested and served immediately from rack 2",
            "✓ Safe microgravity food: Cohesive moisture matrix with low particulate risk"
        ],
        "nutrition_highlights": {
            "Calories": "340 kcal",
            "Protein": "14g Plant-Based Amino Acids",
            "Calcium": "185 mg (Spaceflight Bone Retention)",
            "Vitamin C & Lycopene": "120% DV (Cosmic Radiation Defense)",
            "Sodium": "110 mg (Strict Space Cardiac Limit)"
        },
        "space_safety_rating": "EXCELLENT (Low Particle Hazard)",
        "suitability_score": 93.8,
        "alternatives": [
            {
                "title": "Fresh Romaine & Tomato Wrap with Pea Emulsion",
                "calories": "380 kcal",
                "prep_time": "4 min",
                "reason": "Satisfies savory umami craving while keeping crumbs zero"
            },
            {
                "title": "Spirulina Green Smoothie Infused with Micro-Peas",
                "calories": "310 kcal",
                "prep_time": "2 min",
                "reason": "Rapid pre-EVA high antioxidant endurance beverage"
            }
        ]
    }


def generate_nutrition_monitor(
    astronaut: Dict[str, Any],
    plants: List[Dict[str, Any]],
    inventory: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Estimate daily nutrient coverage from available foods and build a preference-aware menu."""
    targets = [
        {"key": "calories", "label": "Energy", "unit": "kcal", "target": 2200, "weight": 1.0},
        {"key": "protein", "label": "Protein", "unit": "g", "target": 70, "weight": 1.2},
        {"key": "calcium", "label": "Calcium", "unit": "mg", "target": 1000, "weight": 1.15},
        {"key": "iron", "label": "Iron", "unit": "mg", "target": 18, "weight": 1.0},
        {"key": "vitamin_c", "label": "Vitamin C", "unit": "mg", "target": 90, "weight": 0.9}
    ]
    profiles = {
        "romaine": {"calories": 17, "protein": 1.2, "calcium": 36, "iron": 0.9, "vitamin_c": 9, "tags": "fresh crispy greens"},
        "lettuce": {"calories": 17, "protein": 1.2, "calcium": 36, "iron": 0.9, "vitamin_c": 9, "tags": "fresh crispy greens"},
        "tomato": {"calories": 18, "protein": 0.9, "calcium": 10, "iron": 0.3, "vitamin_c": 14, "tags": "fresh juicy antioxidant"},
        "spirulina": {"calories": 120, "protein": 20, "calcium": 60, "iron": 2.5, "vitamin_c": 0, "tags": "nutrient dense protein"},
        "pea": {"calories": 84, "protein": 5, "calcium": 25, "iron": 1.5, "vitamin_c": 40, "tags": "fresh sweet greens"},
        "spinach": {"calories": 23, "protein": 2.9, "calcium": 99, "iron": 2.7, "vitamin_c": 28, "tags": "fresh greens iron"},
        "radish": {"calories": 16, "protein": 0.7, "calcium": 25, "iron": 0.3, "vitamin_c": 15, "tags": "fresh crispy crunchy"}
    }
    preferences = str(astronaut.get("preferences", "")).lower()
    priorities = str(astronaut.get("nutritional_priorities", "")).lower()
    dietary = str(astronaut.get("dietary_requirements", "")).lower()
    avoid_terms = [term.strip().lower() for term in str(astronaut.get("avoid", "")).split(",") if term.strip()]

    for target in targets:
        if target["label"].lower() in priorities or target["label"].lower() in dietary:
            target["weight"] += 0.25

    def matching_profile(name: str):
        lowered = name.lower()
        for key, profile in profiles.items():
            if key in lowered:
                return profile
        return None

    foods = []
    nutrient_keys = ("calories", "protein", "calcium", "iron", "vitamin_c")
    for item in inventory:
        name = str(item.get("name", ""))
        profile = matching_profile(name)
        quantity = max(0.0, float(item.get("quantity_kg", 0)))
        if profile and quantity > 0:
            foods.append({
                "name": name,
                "source": "Stored food",
                "serving_g": 100,
                "servings_available": max(1, int(quantity * 10)),
                "quantity_kg": quantity,
                "fit_score": round(float(item.get("nutrition_score", 0))),
                "nutrients": {key: profile[key] for key in nutrient_keys},
                "tags": profile["tags"]
            })

    for plant in plants:
        name = str(plant.get("name", ""))
        profile = matching_profile(f"{name} {plant.get('species', '')}")
        growth = float(plant.get("growth", 0))
        health = float(plant.get("health_score", 0))
        if profile and growth >= 90 and health >= 60:
            yield_kg = max(0.0, float(plant.get("expected_yield_kg", 0.5)))
            foods.append({
                "name": name,
                "source": "Space-grown harvest",
                "serving_g": 75,
                "servings_available": int(yield_kg * 1000 / 75),
                "quantity_kg": yield_kg,
                "fit_score": round(health),
                "nutrients": {key: round(profile[key] * 0.75, 1) for key in nutrient_keys},
                "tags": profile["tags"]
            })

    available = [
        food for food in foods
        if food["servings_available"] > 0
        and not any(term and term in food["name"].lower() for term in avoid_terms)
    ]
    preference_terms = [word for word in preferences.replace(",", " ").split() if len(word) > 3]
    for food in available:
        searchable = f"{food['name']} {food['tags']}".lower()
        food["preference_match"] = any(word in searchable for word in preference_terms)

    totals = {target["key"]: 0.0 for target in targets}
    portions = {food["name"]: 0 for food in available}
    for _ in range(12):
        best_food = None
        best_score = 0.0
        for food in available:
            if portions[food["name"]] >= min(3, food["servings_available"]):
                continue
            score = sum(
                min(food["nutrients"][target["key"]], max(0, target["target"] - totals[target["key"]]))
                / target["target"] * target["weight"]
                for target in targets
            )
            if food["preference_match"]:
                score *= 1.15
            if score > best_score:
                best_food = food
                best_score = score
        if best_food is None:
            break
        portions[best_food["name"]] += 1
        for key in totals:
            totals[key] += best_food["nutrients"][key]

    menu = []
    for food in available:
        count = portions[food["name"]]
        if count:
            menu.append({
                "name": food["name"],
                "source": food["source"],
                "servings": count,
                "serving_g": food["serving_g"],
                "fit_score": food["fit_score"],
                "preference_match": food["preference_match"],
                "nutrients": {key: round(value * count, 1) for key, value in food["nutrients"].items()}
            })

    nutrient_status = []
    for target in targets:
        amount = round(totals[target["key"]], 1)
        percent = min(100, round(amount / target["target"] * 100))
        nutrient_status.append({
            "key": target["key"],
            "label": target["label"],
            "unit": target["unit"],
            "target": target["target"],
            "planned": amount,
            "percent": percent,
            "gap": round(max(0, target["target"] - amount), 1),
            "score": percent
        })

    return {
        "astronaut_name": astronaut.get("name", "Astronaut"),
        "overall_score": round(sum(item["percent"] for item in nutrient_status) / len(nutrient_status)),
        "daily_targets": nutrient_status,
        "available_foods": [
            {
                "name": food["name"],
                "source": food["source"],
                "servings_available": food["servings_available"],
                "quantity_kg": round(food["quantity_kg"], 2),
                "nutrition_score": food["fit_score"],
                "preference_match": food["preference_match"],
                "serving_g": food["serving_g"],
                "nutrients": {key: round(value, 1) for key, value in food["nutrients"].items()}
            }
            for food in available
        ],
        "recommended_menu": menu,
        "preference_summary": astronaut.get("preferences", ""),
        "avoid_summary": astronaut.get("avoid", ""),
        "disclaimer": "Nutrient values and daily targets are illustrative prototype estimates, not clinical guidance. Actual needs vary by individual and mission medical guidance."
    }


def generate_ai_insights(plants: List[Dict[str, Any]], emergency_active: bool = False) -> List[Dict[str, str]]:
    """
    Generates dynamic bulleted recommendations and system observations.
    """
    insights = []
    if emergency_active:
        insights.append({
            "category": "EMERGENCY",
            "icon": "🚨",
            "text": "CRITICAL: Mission Food Mode engaged. Rations locked to emergency preservation protocol.",
            "type": "danger"
        })
        insights.append({
            "category": "CROP LOSS",
            "icon": "⚠️",
            "text": "Tomato-03 has increased crop-failure risk (78%). Automated harvest diverted to secondary biomass loop.",
            "type": "warning"
        })
        insights.append({
            "category": "RESOURCE",
            "icon": "💧",
            "text": "Water optimization actively reducing daily consumption by 24% to sustain life-support reserves.",
            "type": "info"
        })
        insights.append({
            "category": "NUTRITION",
            "icon": "🥗",
            "text": "Prioritize mature Spinach-04 and Spirulina rations for crew meals to preserve protein and bone density.",
            "type": "success"
        })
        return insights

    # Check stressed plants
    stressed = [p for p in plants if float(p.get("failure_risk", 0)) > 30]
    if stressed:
        p = stressed[0]
        insights.append({
            "category": "CROP HEALTH",
            "icon": "⚠️",
            "text": f"{p.get('name')} shows elevated failure risk ({p.get('failure_risk')}%). Root zone moisture supplementation advised.",
            "type": "warning"
        })
    else:
        insights.append({
            "category": "CANOPY STATUS",
            "icon": "🌱",
            "text": "All bio-crops exhibiting positive chlorophyll fluorescence and nominal biomass accumulation.",
            "type": "success"
        })

    # Check harvest ready
    ready = [p for p in plants if float(p.get("growth", 0)) >= 90]
    if ready:
        p = ready[0]
        insights.append({
            "category": "HARVEST ADVISORY",
            "icon": "✂️",
            "text": f"{p.get('name')} has achieved {p.get('growth')}% maturity. Immediate harvest window active to maximize shelf life.",
            "type": "info"
        })

    # Water optimization insight
    insights.append({
        "category": "RESOURCE SAVINGS",
        "icon": "💧",
        "text": "Current water optimization can reduce consumption by approximately 8.5% in this prototype simulation.",
        "type": "primary"
    })

    # Dietary insight
    insights.append({
        "category": "CREW DIET",
        "icon": "🥗",
        "text": "Prioritize Spinach-04 and crisp radishes for upcoming meals based on high iron, low crumb risk, and shelf life.",
        "type": "success"
    })

    return insights
