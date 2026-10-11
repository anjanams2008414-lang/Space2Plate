# 🚀 Space2Plate – AI-Powered Space Food Security System

> **24-Hour Hackathon Prototype**  
> Autonomous Bio-Regenerative Life Support, Plant Health Diagnostics, Crop Failure Prediction, and Spaceflight Nutrition Recommendation.

---

## 📌 Project Overview

**Space2Plate** is a full-stack, responsive web application engineered for astronauts and ground control on long-duration space missions (such as Artemis Moon bases and Mars transit habitats). 

Growing crops in microgravity requires precision monitoring: moisture behaves abnormally without buoyancy, radiation elevates mutation risks, and food particles/crumbs can foul air filtration ducts. Space2Plate combines:
- **Optical AI Leaf Diagnostics:** Colorimetric Excess Green Index (ExG), Chlorosis, and Necrosis detection using Pillow.
- **Predictive Crop Analytics:** Multi-factor logistic growth curves, yield forecasting, and early crop-failure warning (0–30% Low, 31–60% Medium, 61–100% High Risk).
- **Orbital Greenhouse Digital Twin:** A dedicated Mission Control page beside the dashboard, with interactive 2D hydroponic grow racks, crop-stage and health indicators, live habitat sensors, airflow and nutrient-loop visuals, harvest forecasts, resource summaries, and AI care recommendations. LED energy is shown as a clearly identified prototype estimate; the basil bay is illustrative rather than live crop telemetry.
- **Closed-Loop Resource Optimization:** Water reclamation and nutrient EC balancing to reduce consumption by up to 8.5%.
- **Zero-Gravity Food Suitability & Crumb Hazard Scoring:** Microgravity safety scoring evaluating particle friability.
- **Personalized Astronaut Nutrition:** Tailored meal recommendations matching crop harvests to astronaut biometric priorities (e.g. bone density, antioxidant defense).
- **Astronaut Health & Nutrition Monitoring:** A dedicated page for daily reference-target coverage, estimated nutrient gaps, and preference-aware meal combinations using mission food stores and harvest-ready crops. Values are prototype estimates, not clinical guidance.
- **Emergency Mission Mode:** Autonomous protocol reallocation during catastrophic crop failures or water supply drops.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3 (Futuristic Space UI & Glassmorphism), Modern Vanilla JavaScript, Chart.js, Responsive Layout |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, WebSockets |
| **AI / Computer Vision** | Pillow, Colorimetric Spectral Analysis (ExG / Chlorosis / Necrosis Indices), Rule-based Heuristic Prediction |
| **Database** | SQLite (`space2plate.db`) with auto-seeding |
| **Telemetry** | Simulated IoT Microclimate Telemetry with real-time WebSocket stream |

---

## 📂 Project Structure

```text
space2plate/
├── frontend/
│   ├── index.html            # Main astronaut & mission control UI
│   ├── dashboard.html        # Direct dashboard router fallback
│   ├── css/
│   │   └── style.css         # Futuristic dark space theme & glassmorphism
│   ├── js/
│   │   ├── app.js            # App controller, navigation, demo triggers, toasts
│   │   ├── dashboard.js      # View renderer, API client, modal logic
│   │   └── charts.js         # Chart.js visualizations (Growth, Resources, Radar)
│   └── assets/               # Generated sample plant test images
│       ├── sample_healthy_lettuce.png
│       ├── sample_stressed_tomato.png
│       ├── sample_mature_spinach.png
│       └── sample_nitrogen_low_peas.png
├── backend/
│   ├── main.py               # FastAPI application with REST & WebSockets
│   ├── database.py           # SQLite database schema, CRUD, & scenario resets
│   ├── models.py             # Pydantic data schemas
│   ├── ai_analysis.py        # Image processing & optical leaf analysis
│   ├── prediction.py         # Growth curve & failure risk calculator
│   ├── recommendations.py    # Resource optimization & astronaut meal engine
│   └── requirements.txt      # Python dependencies
├── data/
│   └── sample_data.json      # Baseline Artemis Bio-Hab mission dataset
├── README.md                 # Complete system guide & demo pitch script
└── .gitignore                # Git ignore patterns
```

---

## ⚡ Quick Start & Installation

### 1. Install Backend Dependencies

From the project root directory:

```bash
cd backend
pip install -r requirements.txt
```

*(Note: dependencies are `fastapi`, `uvicorn[standard]`, `pillow`, `python-multipart`, and `websockets`.)*

### 2. Start the Backend Server

```bash
# From the backend directory
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The FastAPI backend starts and will serve the full frontend at:
👉 **`http://127.0.0.1:8000/`** (or `http://127.0.0.1:8000/dashboard`)

API interactive Swagger documentation is available at:
👉 **`http://127.0.0.1:8000/docs`**

### 3. Alternative: Run Frontend via VS Code Live Server

If you prefer serving the frontend separately (e.g. VS Code Live Server at port 5500), simply open `frontend/index.html`. The frontend automatically handles cross-origin requests to `http://127.0.0.1:8000`.

---

## 🔬 How to Test AI Plant Image Analysis

1. Navigate to the **"AI Image Analysis"** tab in the sidebar.
2. You can either:
   - **Click the Dropzone** and upload any plant image, or upload the pre-generated test images from `frontend/assets/` (`sample_healthy_lettuce.png`, `sample_stressed_tomato.png`, etc.).
   - **Click any of the 4 One-Click Space Specimen Chips:**
     - `🥗 Healthy Lettuce (LET-01)` -> Returns 94% health, pristine status.
     - `🍅 Water-Stressed Tomato (TOM-03)` -> Detects moisture desiccation, 52% health, prescriptive action.
     - `🥬 Mature Spinach (SPI-04)` -> Confirms peak vegetative maturity (96%).
     - `🌱 Low-Nitrogen Peas (PEA-01)` -> Flags mineral chlorosis.
3. The AI engine instantly calculates:
   - **Health Score (%)** and **Confidence Index (%)**
   - **Detected Stress & Pathology Risk**
   - **AI Autonomous Prescription** (e.g., "Increase water delivery by 18%...")
   - **Spectral Distribution:** Excess Green Area (ExG), Chlorosis % (Yellowing), and Necrosis % (Brown spots).

---

## 🎬 3-Minute Hackathon Demonstration Script

The application includes a prominent **Demo Control Bar** pinned to the top of the interface for an effortless 3-minute presentation.

### **Minute 1: Normal Mission Nominal State**
1. Click **`✓ Scenario 1: Normal Mission`** (or load the dashboard).
2. Highlight:
   - **Top Telemetry Ticker:** Simulated live temperature (22.4°C), humidity (64.8%), CO2, and water level.
   - **10 Core Metric Cards:** 5 Active Cultivars, 4 Healthy, Water usage 1,910 ml/day with 8.5% closed-loop reclamation.
   - **Plant Monitoring Tab:** Show sample crops (Lettuce-01, Tomato-03, Radish-02, Peas-01, Spinach-04). Click on *Lettuce-01* to show the telemetric sensor modal.
   - **Harvest & Food Tab:** Demonstrate *Spinach-04* ready for harvest. Click **"Harvest Crop"** and observe how yield (1.1 kg) transfers seamlessly into the Mission Food Supply.
   - **Astronaut Profile Tab:** Show Commander Alex's personalized recommendation (*Fresh Orbital Bio-Harvest Bowl*) with clear badges explaining why it was selected (high calcium/iron, zero crumb hazard).

### **Minute 2: Plant Stress & AI Diagnostic Intervention**
1. Click **`⚠️ Scenario 2: Plant Stress`**.
2. Explain the scenario:
   > *"Sensors on Tomato-03 detect sub-canopy thermal stress and root desiccation."*
3. The app automatically transitions to Plant Monitoring:
   - *Tomato-03* health drops to 48%, failure risk elevates to 78%, and an early warning badge appears.
   - Click **"Inspect Sensor Bio-Feed"** on Tomato-03 to display the **Crop Failure Warning Dialog** showing root cause and prescription.
   - Switch to **AI Image Analysis**: Click `Water-Stressed Tomato (TOM-03)` to demonstrate the computer-vision chlorophyll degradation diagnosis.
   - Click **"Execute Hydration Pulse"** to show real-time recovery.

### **Minute 3: Emergency Mission Mode & Survival Rationing**
1. Click **`🚨 Scenario 3: Emergency Mode`**.
2. The UI enters visual emergency status:
   - Pulsing red beacon indicators activate.
   - Crew food buffer drops from 65 sols to **18 sols**.
   - Autonomous Emergency Protocols engage: early harvesting of remaining crops, hydroponic mist conservation (-25% water), and deployment of rapid-cycle emergency microgreen trays.
   - Navigate to **Astronaut Profile**: The meal engine automatically switches to **"Emergency Sustenance Ration Alpha"** (Spirulina bio-gel + microgreen preservation formula), maintaining life-support resilience.
3. Click **`🔄 Reset State`** to restore nominal parameters.

---

## 🌐 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated mission statistics, active alerts, and AI insights |
| `GET` | `/api/plants` | List of all active space crop cultivars |
| `GET` | `/api/plants/{id}` | Detailed crop biometric and growth prediction |
| `POST` | `/api/plants/{id}/water` | Execute automated hydration pulse |
| `POST` | `/api/analyze-plant` | Upload and analyze plant leaf image (Pillow / ExG) |
| `GET` | `/api/analyze-presets` | Get pre-packaged demo specimens |
| `GET` | `/api/environment` | Live simulated microclimate telemetry readings |
| `GET` | `/api/predictions` | Crop growth trajectories and failure probabilities |
| `GET` | `/api/resources` | Water, nutrient, and lighting optimization |
| `GET` | `/api/harvest` | Harvest readiness, shelf-life, and space suitability |
| `POST` | `/api/harvest/{id}` | Harvest crop and transfer to food inventory |
| `GET` | `/api/food` | Food supply inventory with crumb risk scoring |
| `GET` | `/api/astronaut` | Current astronaut nutritional profile |
| `POST` | `/api/astronaut` | Update astronaut preferences and priorities |
| `POST` | `/api/recommend-food` | Generate tailored astronaut meal recommendation |
| `GET` | `/api/alerts` | Active and historical station alerts |
| `GET` | `/api/emergency` | Emergency mission status, checklist, and ration plan |
| `POST` | `/api/emergency/toggle` | Manual toggle for emergency simulation |
| `POST` | `/api/demo/stress` | Demo Step 2: Trigger Tomato-03 stress |
| `POST` | `/api/demo/emergency` | Demo Step 3: Trigger full emergency catastrophe |
| `POST` | `/api/demo/reset` | Restore baseline Sol 142 nominal parameters |
| `WS` | `/ws/telemetry` | Real-time WebSocket telemetry stream |

---

## 🔒 Spaceflight Heuristics Disclaimer

*Space2Plate is a hackathon prototype designed to demonstrate full-stack AI-driven decision flows for closed-loop space agriculture. Predictive models, optical colorimetric indices, and crumb dispersal metrics are prototype heuristic simulations and are not certified NASA or ESA flight software.*

---

© 2026 Space2Plate Team • Built for the 24-Hour Space Food Security Hackathon
