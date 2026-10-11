from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PlantBase(BaseModel):
    id: str
    name: str
    species: str
    health_score: float = Field(..., ge=0, le=100)
    growth: float = Field(..., ge=0, le=100)
    water: float  # ml/day or tank level
    nutrients: float  # index or ppm
    temperature: float
    humidity: float
    light: float
    expected_harvest_date: str
    expected_yield_kg: float = 1.0
    failure_risk: float = Field(..., ge=0, le=100)
    status: str
    stage: str
    notes: Optional[str] = ""


class Plant(PlantBase):
    pass


class AstronautProfile(BaseModel):
    id: str = "ASTRO-01"
    name: str = "Commander Alex Vance"
    role: str = "Mission Commander & Astrobiologist"
    age: int = 38
    mission_days: int = 180
    preferences: str = "Fresh crispy greens, mild herbs, nutrient-dense bowls"
    dietary_requirements: str = "High protein, calcium retention, low sodium"
    nutritional_priorities: str = "Bone density preservation, antioxidant defense, cognitive stamina"
    avoid: str = "Very spicy foods, crumbly dehydrated items, high-sulfur compounds"


class FoodItem(BaseModel):
    id: str
    name: str
    quantity_kg: float
    nutrition_score: float
    shelf_life_days: int
    storage_requirement: str
    particle_risk: str  # Low, Medium, High, Zero
    space_suitability_score: float
    harvest_date: str


class Alert(BaseModel):
    id: str
    type: str
    plant_id: Optional[str] = None
    message: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    timestamp: str
    resolved: bool = False


class ImageAnalysisResult(BaseModel):
    plant_name: str
    health_score: float
    health_status: str  # Healthy, Stressed, Diseased, Critical
    possible_stress: str
    possible_disease: str
    confidence: float
    recommendation: str
    chlorosis_index: float
    necrosis_index: float
    green_coverage: float
    warning_flag: bool
    metrics: Dict[str, Any] = {}


class EnvironmentalReading(BaseModel):
    temperature: float
    temperature_status: str
    humidity: float
    humidity_status: str
    co2: float
    co2_status: str
    light_intensity: float
    light_status: str
    water_tank_level: float
    water_status: str
    nutrient_level: float
    nutrient_status: str
    power_status: str
    air_circulation: str
    timestamp: str


class PredictionResult(BaseModel):
    plant_id: str
    plant_name: str
    current_growth: float
    growth_rate_daily: float
    expected_harvest_date: str
    expected_yield_kg: float
    failure_probability: float
    risk_tier: str  # LOW RISK, MEDIUM RISK, HIGH RISK
    confidence_interval: str
    historical_trajectory: List[Dict[str, Any]]
    simulated_days_to_harvest: int
    notes: str


class ResourceOptimization(BaseModel):
    plant_id: str
    plant_name: str
    current_water_ml: float
    optimized_water_ml: float
    water_saving_ml: float
    current_nutrients_ppm: float
    optimized_nutrients_ppm: float
    nutrient_saving_ppm: float
    current_light_hours: float
    optimized_light_hours: float
    energy_saving_pct: float
    storage_priority: str
    action_notes: str


class FoodSuitabilityEvaluation(BaseModel):
    food_name: str
    nutrition_score: float
    shelf_life_score: float
    storage_score: float
    particle_risk: str
    particle_risk_score: float
    overall_suitability_score: float
    assessment_notes: str


class MealRecommendation(BaseModel):
    meal_title: str
    category: str
    description: str
    ingredients: List[str]
    reasons: List[str]
    nutrition_highlights: Dict[str, str]
    space_safety_rating: str
    suitability_score: float
    alternatives: List[Dict[str, Any]]
