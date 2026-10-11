// Space2Plate - Dashboard & View Renderer Controller

const Dashboard = {
  data: {
    dashboard: null,
    plants: [],
    predictions: [],
    resources: null,
    harvest: [],
    food: [],
    astronaut: null,
    emergency: null,
    alerts: []
  },

  async loadAll() {
    try {
      const [dashRes, plantsRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard`).then(r => r.json()),
        fetch(`${API_BASE}/api/plants`).then(r => r.json()),
        fetch(`${API_BASE}/api/alerts`).then(r => r.json())
      ]);

      this.data.dashboard = dashRes;
      this.data.plants = plantsRes;
      this.data.alerts = alertsRes;

      this.renderDashboardStats();
      this.renderMissionHero();
      this.renderDigitalTwin(dashRes.environment);
      this.renderAIInsights();
      this.renderRecentAlerts();

      // Check emergency mode styling
      if (dashRes.mission && dashRes.mission.emergency_mode) {
        document.body.classList.add('emergency-mode-active');
        document.querySelectorAll('.pulse-dot').forEach(el => el.classList.add('emergency'));
        const emBanner = document.getElementById('topEmergencyAlert');
        if (emBanner) emBanner.style.display = 'flex';
      } else {
        document.body.classList.remove('emergency-mode-active');
        document.querySelectorAll('.pulse-dot').forEach(el => el.classList.remove('emergency'));
        const emBanner = document.getElementById('topEmergencyAlert');
        if (emBanner) emBanner.style.display = 'none';
      }
      if (typeof App !== 'undefined') App.updateCrewTip();

      // Initialize charts
      if (typeof initCharts === 'function') {
        initCharts();
      }

      const healthyCount = dashRes.stats.healthy_plants || 0;
      const atRiskCount = dashRes.stats.plants_at_risk || 0;
      const criticalCount = (dashRes.stats.max_crop_failure_risk > 60) ? 1 : 0;
      if (typeof updateHealthDistChart === 'function') {
        updateHealthDistChart(healthyCount, atRiskCount, criticalCount);
      }

      // Preload current view
      if (App.activePage === 'plants') this.renderPlantsView();
      if (App.activePage === 'prediction') this.renderPredictionView();
      if (App.activePage === 'resources') this.renderResourcesView();
      if (App.activePage === 'harvest') this.renderHarvestView();
      if (App.activePage === 'astronaut') this.renderAstronautView();
      if (App.activePage === 'emergency') this.renderEmergencyView();

    } catch (err) {
      console.warn('Backend API connecting...', err);
    }
  },

  renderDashboardStats() {
    const s = this.data.dashboard?.stats;
    if (!s) return;

    this.setText('statTotalPlants', s.total_plants);
    this.setText('statHealthyPlants', s.healthy_plants);
    this.setText('statPlantsAtRisk', s.plants_at_risk);
    this.setText('statMaxRisk', `${s.max_crop_failure_risk}%`);
    this.setText('statExpectedHarvest', `${s.expected_harvest_crop} (${s.expected_harvest_date})`);
    this.setText('statWaterUsage', `${s.water_usage_current_ml} ml/day`);
    this.setText('statWaterSavings', `-${s.water_savings_ml} ml (${s.water_savings_percent}%)`);
    this.setText('statNutrientStatus', s.nutrient_status);
    this.setText('statFoodStock', `${s.food_stock_kg} kg (${s.food_stock_days_remaining} sols)`);
    this.setText('statMissionDays', `${this.data.dashboard.mission.mission_days_remaining} Days`);
  },

  renderMissionHero() {
    const dash = this.data.dashboard;
    if (!dash) return;

    const mission = dash.mission || {};
    const stats = dash.stats || {};
    const emergency = Boolean(mission.emergency_mode);
    const needsAttention = Number(stats.plants_at_risk || 0) > 0;
    const statusPanel = document.querySelector('.mission-hero-status');
    const hero = document.getElementById('missionHero');
    const crewName = document.getElementById('crewNameDisplay')?.textContent?.trim() || 'Commander';
    const harvestDate = stats.expected_harvest_date
      ? new Date(`${stats.expected_harvest_date}T00:00:00`)
      : null;
    const formattedHarvestDate = harvestDate && !Number.isNaN(harvestDate.getTime())
      ? harvestDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : 'Not scheduled';
    const status = emergency ? 'EMERGENCY' : needsAttention ? 'CROP ATTENTION' : 'NOMINAL';

    if (hero) hero.classList.toggle('is-emergency', emergency);
    if (statusPanel) {
      statusPanel.classList.toggle('is-emergency', emergency);
      statusPanel.classList.toggle('is-attention', !emergency && needsAttention);
    }

    this.setText('heroCrewName', crewName);
    this.setText('heroSol', mission.sol ?? '—');
    this.setText('heroStatus', status);
    this.setText('heroFoodDays', `${stats.food_stock_days_remaining ?? '—'} sols`);
    this.setText('heroNextHarvest', `${stats.expected_harvest_crop || 'No crop'} · ${formattedHarvestDate}`);
    this.setText(
      'heroSummary',
      emergency
        ? `Emergency protocols are active. The crew food reserve is currently ${stats.food_stock_days_remaining ?? '—'} sols.`
        : `${stats.healthy_plants ?? 0} of ${stats.total_plants ?? 0} crops are healthy${needsAttention
          ? `; ${stats.plants_at_risk} crop${stats.plants_at_risk === 1 ? ' needs' : 's need'} attention`
          : ' and the greenhouse is nominal'}.`
    );
    this.setText('sidebarMissionName', mission.name || 'Artemis Bio-Hab');
    this.setText('sidebarMissionStatus', `Sol ${mission.sol ?? '—'} • Status: ${status}`);
  },

  renderDigitalTwin(environment = this.data.dashboard?.environment) {
    const rack = document.getElementById('digitalTwinPlants');
    if (!rack) return;

    const plants = this.data.plants || [];
    const tiers = [[], [], []];
    plants.forEach((plant, index) => tiers[index % tiers.length].push(plant));
    if (!plants.some((plant) => /herb|basil/i.test(plant.species || plant.name || ''))) {
      tiers[2].push({
        name: 'Basil-01',
        species: 'Orbital herb nursery',
        growth: 38,
        visualModel: true
      });
    }

    rack.replaceChildren(...tiers.map((tierPlants) => {
    const tier = document.createElement('div');
    tier.className = 'rack-tier';
    tierPlants.forEach((plant) => tier.appendChild(this.createTwinPlant(plant)));
    return tier;
    }));

    this.updateTwinTelemetry(environment);

    const stats = this.data.dashboard?.stats || {};
    const forecastPlant = plants.find((plant) => plant.name === stats.expected_harvest_crop)
    || [...plants].sort((a, b) => Number(b.growth || 0) - Number(a.growth || 0))[0];
    if (forecastPlant) {
    const health = Math.round(Number(forecastPlant.health_score || 0));
    const growth = Math.round(Number(forecastPlant.growth || 0));
    const harvestDate = forecastPlant.expected_harvest_date
      ? new Date(`${forecastPlant.expected_harvest_date}T00:00:00`)
      : null;
    const formattedDate = harvestDate && !Number.isNaN(harvestDate.getTime())
      ? harvestDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'date pending';
    this.setText('twinPredictionTitle', `${forecastPlant.name} · ${health}% health`);
    this.setText('twinPredictionText', `${growth}% grown · projected harvest ${formattedDate}.`);
    } else {
    this.setText('twinPredictionTitle', 'No crop telemetry');
    this.setText('twinPredictionText', 'Plant growth forecasts will appear when crop telemetry is available.');
    }

    const insights = this.data.dashboard?.ai_insights || [];
    const recommendation = insights.find((insight) => /warning|risk|stress|health/i.test(`${insight.category} ${insight.type}`))
    || insights.find((insight) => /resource|water|nutrient/i.test(`${insight.category} ${insight.text}`))
    || insights[0];
    this.setText(
    'twinRecommendationText',
    recommendation?.text || 'All monitored systems are nominal. Continue the current crop-care and resource plan.'
    );
  },

  createTwinPlant(plant) {
    const name = String(plant.name || 'Crop');
    const species = String(plant.species || '').toLowerCase();
    const growth = Number(plant.growth || 0);
    const isModel = Boolean(plant.visualModel);
    const health = isModel ? null : Math.max(0, Math.min(100, Number(plant.health_score || 0)));
    const risk = Number(plant.failure_risk || 0);
    const isUnhealthy = !isModel && (risk > 30 || health < 75);
    const stage = isModel ? 'Visual model' : growth <= 25 ? 'Seedling' : growth >= 90 ? 'Harvest-ready' : growth >= 70 ? 'Mature' : 'Growing';
    const visual = /tomato/i.test(species)
    ? '<path class="plant-stem" d="M28 56V26m0 13L14 30m14 9 14-9"/><path class="plant-leaf" d="M14 30C4 17 9 12 25 23c2 8-3 10-11 7Zm28 0c10-13 5-18-11-7-2 8 3 10 11 7Z"/><circle class="plant-fruit" cx="16" cy="43" r="7"/><circle class="plant-fruit" cx="40" cy="44" r="7"/>'
    : /herb|pea/i.test(species)
      ? '<path class="plant-stem" d="M28 56V31m0 13L15 35m13 4 13-8m-13 16-11-4"/><path class="plant-leaf" d="M15 35C5 22 10 19 25 29c1 6-3 8-10 6Zm26-4c10-13 5-16-10-7-1 6 3 8 10 7ZM17 47C7 36 12 33 25 41c1 5-3 7-8 6Z"/><path class="plant-leaf plant-leaf-alt" d="M28 31C20 18 25 15 31 27Z"/>'
      : '<path class="plant-stem" d="M28 57V31m0 16L14 38m14 5 14-9m-14 2L21 24m7 8 8-10"/><path class="plant-leaf" d="M14 38C3 25 9 20 25 33c2 7-4 9-11 5Zm28-4c11-13 5-18-11-5-2 7 4 9 11 5ZM21 24c-7-13-1-16 10-4 0 6-4 7-10 4Zm15-2c7-13 13-10 7 4-5 3-8 1-7-4Z"/><path class="plant-leaf plant-leaf-alt" d="M28 31c-3-14 3-17 7-3-2 6-5 7-7 3Z"/>';

    const card = document.createElement(isModel ? 'div' : 'button');
    if (!isModel) card.type = 'button';
    card.className = `twin-plant${isUnhealthy ? ' is-unhealthy' : ''}${isModel ? ' is-model' : ''}`;
    card.title = isModel ? `${name} is an illustrative herb-bay model, not live sensor telemetry.` : `Inspect ${name}: ${health}% health, ${stage}`;
    card.setAttribute('aria-label', isModel
      ? `${name}, illustrative herb bay model, not live sensor telemetry`
      : `Inspect ${name}, ${health}% health, ${stage}${isUnhealthy ? ', needs attention' : ''}`);

    const visualElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    visualElement.setAttribute('viewBox', '0 0 56 68');
    visualElement.setAttribute('class', 'twin-plant-graphic');
    visualElement.setAttribute('aria-hidden', 'true');
    visualElement.innerHTML = `${visual}<path class="plant-root" d="M28 57v7m0-4-6 5m6-3 6 3"/>`;

    const plantName = document.createElement('span');
    plantName.className = 'twin-plant-name';
    plantName.textContent = name;
    const stageLabel = document.createElement('span');
    stageLabel.className = 'twin-plant-stage';
    stageLabel.textContent = isModel ? 'VISUAL MODEL' : `${stage} · ${health}%`;
    card.append(visualElement, plantName, stageLabel);
    if (!isModel) {
      const healthBar = document.createElement('span');
      healthBar.className = 'twin-plant-health';
      const healthFill = document.createElement('i');
      healthFill.style.width = `${health}%`;
      healthBar.appendChild(healthFill);
      card.appendChild(healthBar);
      card.addEventListener('click', () => this.openPlantModal(plant.id));
    }
    return card;
  },

  updateTwinTelemetry(telemetry) {
    if (!telemetry) return;

    this.setText('twinTemperature', `${telemetry.temperature ?? '--'} °C`);
    this.setText('twinHumidity', `${telemetry.humidity ?? '--'} %`);
    this.setText('twinLight', `${telemetry.light_intensity ?? '--'} μmol`);
    this.setText('twinLightLabel', `${telemetry.light_intensity ?? '--'} μmol/m²/s`);
    this.setText('twinCo2', `${telemetry.co2 ?? '--'} ppm`);
    this.setText('twinCo2Label', `${telemetry.co2 ?? '--'} ppm CO₂`);
    this.setText('twinWater', `${telemetry.water_tank_level ?? '--'} %`);
    this.setText('twinNutrients', `${telemetry.nutrient_level ?? '--'} %`);

    const stats = this.data.dashboard?.stats || {};
    const waterUse = Number(stats.water_usage_current_ml || 0);
    const waterMax = Math.max(waterUse, 2500);
    const light = Number(telemetry.light_intensity || 0);
    const modeledEnergy = light > 0 ? (light / 75).toFixed(1) : '—';
    const nutrientLevel = Number(telemetry.nutrient_level || 0);
    this.setText('twinWaterUse', `${Math.round(waterUse).toLocaleString()} ml/day`);
    this.setText('twinEnergyUse', `${modeledEnergy} kWh/sol`);
    this.setText('twinNutrientUse', `${Math.round(nutrientLevel)}% available`);
    const waterBar = document.getElementById('twinWaterBar');
    const energyBar = document.getElementById('twinEnergyBar');
    const nutrientBar = document.getElementById('twinNutrientBar');
    if (waterBar) waterBar.style.width = `${Math.min(100, waterUse / waterMax * 100)}%`;
    if (energyBar) energyBar.style.width = `${Math.min(100, light / 500 * 100)}%`;
    if (nutrientBar) nutrientBar.style.width = `${Math.max(0, Math.min(100, nutrientLevel))}%`;
  },

  renderAIInsights() {
    const list = document.getElementById('aiInsightsList');
    if (!list) return;

    const insights = this.data.dashboard?.ai_insights || [];
    list.innerHTML = insights.map(i => `
      <div class="insight-item ${i.type}">
        <span style="font-size: 1.2rem;">${i.icon}</span>
        <div>
          <strong style="color: var(--text-primary); font-size: 0.78rem; text-transform: uppercase;">[${i.category}]</strong>
          <p style="margin-top: 2px;">${i.text}</p>
        </div>
      </div>
    `).join('');
  },

  renderRecentAlerts() {
    const list = document.getElementById('recentAlertsList');
    if (!list) return;

    const alerts = [...(this.data.alerts.length ? this.data.alerts : this.data.dashboard?.recent_alerts || [])]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
    if (alerts.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.textContent = 'All systems nominal. Mission events will appear here as they happen.';
      list.replaceChildren(empty);
      return;
    }

    const events = alerts.map((alert) => {
      const event = document.createElement('article');
      const severity = String(alert.severity || '').toUpperCase();
      event.className = `timeline-event${severity === 'CRITICAL' || severity === 'HIGH' ? ' is-critical' : severity === 'MEDIUM' ? ' is-warning' : ''}${alert.resolved ? ' is-resolved' : ''}`;

      const heading = document.createElement('div');
      heading.className = 'timeline-event-heading';
      const title = document.createElement('strong');
      title.textContent = alert.resolved ? `${alert.type || 'MISSION EVENT'} · RESOLVED` : alert.type || 'MISSION EVENT';
      const time = document.createElement('time');
      const date = new Date(alert.timestamp);
      time.dateTime = Number.isNaN(date.getTime()) ? '' : date.toISOString();
      time.textContent = Number.isNaN(date.getTime())
        ? 'Time unavailable'
        : date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      heading.append(title, time);

      const message = document.createElement('p');
      message.textContent = alert.message || 'Mission event recorded.';
      event.append(heading, message);
      return event;
    });
    list.replaceChildren(...events);
  },

  updateTelemetryUI(t) {
    if (!t) return;
    this.updateTwinTelemetry(t);
    this.setText('telTemp', `${t.temperature}°C`);
    this.setText('telHum', `${t.humidity}%`);
    this.setText('telCo2', `${t.co2} ppm`);
    this.setText('telWater', `${t.water_tank_level}%`);

    // Gauges if on environment view
    this.setText('gaugeTemp', `${t.temperature}°C`);
    this.setText('gaugeHum', `${t.humidity}%`);
    this.setText('gaugeCo2', `${t.co2} ppm`);
    this.setText('gaugeLight', `${t.light_intensity} µmol`);
    this.setText('gaugeWater', `${t.water_tank_level}%`);
    this.setText('gaugeNutr', `${t.nutrient_level}%`);

    this.setProgress('progTemp', (t.temperature / 35) * 100);
    this.setProgress('progHum', t.humidity);
    this.setProgress('progCo2', (t.co2 / 1500) * 100);
    this.setProgress('progLight', (t.light_intensity / 500) * 100);
    this.setProgress('progWater', t.water_tank_level);
    this.setProgress('progNutr', t.nutrient_level);
  },

  async fetchLiveTelemetry() {
    try {
      const res = await fetch(`${API_BASE}/api/environment`);
      if (res.ok) {
        const data = await res.json();
        this.updateTelemetryUI(data.telemetry);
      }
    } catch (e) {}
  },

  // ==========================================
  // VIEW: PLANT MONITORING
  // ==========================================
  async renderPlantsView() {
    try {
      const plants = await fetch(`${API_BASE}/api/plants`).then(r => r.json());
      this.data.plants = plants;

      const grid = document.getElementById('plantsGrid');
      if (!grid) return;

      grid.innerHTML = plants.map(p => {
        let badgeClass = 'badge-healthy';
        if (p.failure_risk > 60 || p.health_score < 50) badgeClass = 'badge-critical';
        else if (p.failure_risk > 30 || p.health_score < 75) badgeClass = 'badge-stress';

        let riskColor = 'fill-green';
        if (p.failure_risk > 60) riskColor = 'fill-red';
        else if (p.failure_risk > 30) riskColor = 'fill-amber';
        const cropIcon = /lettuce/i.test(p.species) ? '🥬'
          : /pea/i.test(p.species) ? '🫛'
          : /radish/i.test(p.species) ? '🌱'
          : /spinach/i.test(p.species) ? '🍃'
          : /tomato/i.test(p.species) ? '🍅'
          : '🌿';
        const healthClass = p.failure_risk > 60 || p.health_score < 50
          ? 'is-critical'
          : p.failure_risk > 30 || p.health_score < 75
            ? 'is-stress'
            : '';

        return `
          <div class="glass-card plant-card ${p.failure_risk > 60 ? 'emergency-active-border' : ''}">
            <div>
              <div class="crop-identity">
                <div class="crop-portrait" aria-hidden="true">${cropIcon}</div>
                <div class="crop-identity-copy">
                  <h3>${p.name}</h3>
                  <p>${p.species}</p>
                </div>
                <span class="crop-health-chip ${healthClass}">${p.health_score}% health</span>
              </div>
              <div class="plant-card-top">
                <span class="plant-badge ${badgeClass}">${p.status}</span>
              </div>

              <div class="progress-bar-container">
                <div class="progress-header">
                  <span style="color: var(--text-muted);">Growth Stage (${p.stage})</span>
                  <span style="font-weight: 600; color: #fff;">${p.growth}%</span>
                </div>
                <div class="custom-progress">
                  <div class="progress-fill fill-cyan" style="width: ${p.growth}%;"></div>
                </div>
              </div>

              <div class="progress-bar-container">
                <div class="progress-header">
                  <span style="color: var(--text-muted);">Health Score</span>
                  <span style="font-weight: 600; color: #fff;">${p.health_score}%</span>
                </div>
                <div class="custom-progress">
                  <div class="progress-fill fill-green" style="width: ${p.health_score}%;"></div>
                </div>
              </div>

              <div class="progress-bar-container">
                <div class="progress-header">
                  <span style="color: var(--text-muted);">Failure Risk</span>
                  <span style="font-weight: 600; color: #fff;">${p.failure_risk}%</span>
                </div>
                <div class="custom-progress">
                  <div class="progress-fill ${riskColor}" style="width: ${p.failure_risk}%;"></div>
                </div>
              </div>

              <div class="plant-metrics">
                <div class="metric-item">
                  <span class="metric-label">💧 Water</span>
                  <span class="metric-val">${p.water} ml/d</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">🧪 Nutrients</span>
                  <span class="metric-val">${p.nutrients} ppm</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">🌡️ Chamber</span>
                  <span class="metric-val">${p.temperature}°C</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">📅 Harvest</span>
                  <span class="metric-val">${p.expected_harvest_date}</span>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button class="btn-primary" style="flex-grow: 1; justify-content: center;" onclick="Dashboard.openPlantModal('${p.id}')">
                Inspect Sensor Bio-Feed
              </button>
              <button class="btn-secondary" title="Quick Water Hydration" onclick="Dashboard.quickWaterPlant('${p.id}')">
                💧
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async openPlantModal(plantId) {
    try {
      const res = await fetch(`${API_BASE}/api/plants/${plantId}`).then(r => r.json());
      const p = res.plant;
      const pred = res.prediction;

      const modal = document.getElementById('plantModal');
      const body = document.getElementById('plantModalBody');
      if (!modal || !body) return;

      body.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 700;">🌱 ${p.name} (${p.id})</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">${p.species}</p>
          </div>
          <span class="plant-badge ${p.failure_risk > 50 ? 'badge-critical' : 'badge-healthy'}">${p.status}</span>
        </div>

        ${pred.alert_needed ? `
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--red-alert); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="color: var(--red-alert); font-size: 0.85rem;">🚨 CROP FAILURE EARLY WARNING</strong>
            <p style="font-size: 0.8rem; margin-top: 4px;"><strong>Failure Probability:</strong> ${pred.failure_probability}% (${pred.risk_tier})</p>
            <p style="font-size: 0.8rem;"><strong>Root Cause:</strong> ${pred.failure_reason}</p>
            <p style="font-size: 0.8rem; color: var(--cyan-neon); margin-top: 4px;"><strong>Prescription:</strong> ${pred.recommended_action}</p>
          </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div class="glass-card" style="padding: 12px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">GROWTH & STAGE</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--cyan-neon);">${p.growth}%</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Stage: ${p.stage}</div>
          </div>
          <div class="glass-card" style="padding: 12px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">HEALTH SCORE</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--green-bio);">${p.health_score}%</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Yield Est: ${pred.expected_yield_kg} kg</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 14px; margin-bottom: 16px;">
          <h4 style="font-size: 0.85rem; margin-bottom: 8px;">Telemetric Chamber Sensors</h4>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.8rem;">
            <div>💧 Hydration: <strong>${p.water} ml</strong></div>
            <div>🧪 Nutrients: <strong>${p.nutrients} ppm</strong></div>
            <div>🌡️ Temp: <strong>${p.temperature}°C</strong></div>
            <div>💨 Humidity: <strong>${p.humidity}%</strong></div>
            <div>☀️ Light: <strong>${p.light} µmol</strong></div>
            <div>📅 Harvest: <strong>${pred.expected_harvest_date}</strong></div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <h4 style="font-size: 0.85rem; margin-bottom: 4px;">Bio-Log Notes</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px;">${p.notes || 'Nominal vegetative expansion.'}</p>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn-secondary" onclick="Dashboard.closePlantModal()">Close</button>
          <button class="btn-primary" onclick="Dashboard.hydratePlant('${p.id}')">💧 Execute Hydration Pulse</button>
        </div>
      `;

      modal.classList.add('active');
    } catch (e) {
      console.error(e);
    }
  },

  closePlantModal() {
    document.getElementById('plantModal')?.classList.remove('active');
  },

  async hydratePlant(plantId) {
    try {
      const res = await fetch(`${API_BASE}/api/plants/${plantId}/water`, { method: 'POST' }).then(r => r.json());
      App.showToast(`💧 ${res.message}`, 'success');
      this.closePlantModal();
      await this.loadAll();
      this.renderPlantsView();
    } catch (e) {
      console.error(e);
    }
  },

  async quickWaterPlant(plantId) {
    await this.hydratePlant(plantId);
  },

  // ==========================================
  // VIEW: AI PLANT IMAGE ANALYSIS
  // ==========================================
  setupImageAnalysis() {
    const dropzone = document.getElementById('uploadDropzone');
    const fileInput = document.getElementById('plantFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.uploadAndAnalyzeFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          this.uploadAndAnalyzeFile(fileInput.files[0]);
        }
      });
    }

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-preset');
        this.analyzePreset(presetId);
      });
    });
  },

  async uploadAndAnalyzeFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const btn = document.getElementById('btnAnalyzeSubmit');
    if (btn) btn.innerText = 'Analyzing with Pillow & Spectral Vision...';

    try {
      const res = await fetch(`${API_BASE}/api/analyze-plant`, {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      this.displayAnalysisResult(res);
      App.showToast(`AI Analysis complete for ${res.plant_name}`, 'success');
    } catch (err) {
      console.error(err);
      App.showToast('Analysis error. Using simulated inference.', 'warning');
    } finally {
      if (btn) btn.innerText = 'Run Analysis';
    }
  },

  async analyzePreset(presetId) {
    try {
      const formData = new FormData();
      formData.append('preset_id', presetId);

      const res = await fetch(`${API_BASE}/api/analyze-plant`, {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      this.displayAnalysisResult(res);
      App.showToast(`Analyzed preset: ${res.plant_name || presetId}`, 'info');
    } catch (err) {
      console.error(err);
    }
  },

  displayAnalysisResult(data) {
    const container = document.getElementById('analysisResultContainer');
    if (!container) return;

    let statusBadge = 'badge-healthy';
    if (data.health_score < 50) statusBadge = 'badge-critical';
    else if (data.health_score < 75) statusBadge = 'badge-stress';

    container.innerHTML = `
      <div class="glass-card analysis-result-card ${data.warning_flag ? 'emergency-active-border' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
          <div>
            <span style="font-size: 0.72rem; color: var(--cyan-neon); letter-spacing: 1px; text-transform: uppercase;">BIOMETRIC SPECTRAL DIAGNOSIS</span>
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #fff;">${data.plant_name}</h2>
          </div>
          <span class="plant-badge ${statusBadge}" style="font-size: 0.85rem; padding: 6px 14px;">${data.health_status}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
          <div class="glass-card" style="padding: 16px; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">OVERALL HEALTH SCORE</div>
            <div class="score-badge-huge">${data.health_score}%</div>
            <div style="font-size: 0.75rem; color: var(--green-bio);">Confidence: ${data.confidence}%</div>
          </div>
          <div class="glass-card" style="padding: 16px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">DETECTED STRESS</div>
            <div style="font-size: 1rem; font-weight: 600; color: ${data.warning_flag ? 'var(--amber-warn)' : '#fff'};">${data.possible_stress}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px;">PATHOLOGY RISK</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: #fff;">${data.possible_disease}</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 18px; border-left: 4px solid var(--cyan-neon); margin-bottom: 20px;">
          <h4 style="font-size: 0.85rem; color: var(--cyan-neon); margin-bottom: 6px; text-transform: uppercase;">🤖 AI Autonomous Prescription</h4>
          <p style="font-size: 0.95rem; line-height: 1.5; color: #fff;">${data.recommendation}</p>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 14px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 6px;">
            <span>Excess Green Vegetation Index (ExG): <strong>${data.green_coverage || 75}%</strong></span>
            <span>Chlorosis (Yellowing): <strong>${data.chlorosis_index || 0}%</strong></span>
            <span>Necrosis (Cell Death): <strong>${data.necrosis_index || 0}%</strong></span>
          </div>
          <div class="custom-progress" style="height: 10px; display: flex;">
            <div style="width: ${data.green_coverage || 75}%; background: var(--green-bio);" title="Healthy Green"></div>
            <div style="width: ${data.chlorosis_index || 5}%; background: var(--amber-warn);" title="Chlorosis"></div>
            <div style="width: ${data.necrosis_index || 2}%; background: var(--red-alert);" title="Necrosis"></div>
          </div>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">
            * Prototype computer-vision indicator. Values simulated for hackathon demonstration.
          </p>
        </div>
      </div>
    `;
    container.scrollIntoView({ behavior: 'smooth' });
  },

  // ==========================================
  // VIEW: GROWTH & FAILURE PREDICTION
  // ==========================================
  async renderPredictionView() {
    try {
      const preds = await fetch(`${API_BASE}/api/predictions`).then(r => r.json());
      this.data.predictions = preds;

      const container = document.getElementById('predictionCropsList');
      if (!container) return;

      container.innerHTML = preds.map(p => {
        let riskColor = 'fill-green';
        let tierColor = 'var(--green-bio)';
        if (p.failure_probability > 60) {
          riskColor = 'fill-red';
          tierColor = 'var(--red-alert)';
        } else if (p.failure_probability > 30) {
          riskColor = 'fill-amber';
          tierColor = 'var(--amber-warn)';
        }

        return `
          <div class="glass-card ${p.alert_needed ? 'emergency-active-border' : ''}" style="margin-bottom: 14px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div>
                <h4 style="font-size: 1.05rem; font-weight: 700;">${p.plant_name} (${p.plant_id})</h4>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Harvest Window: <strong>${p.expected_harvest_date}</strong> (${p.simulated_days_to_harvest} sols remaining)</span>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.75rem; font-weight: 700; color: ${tierColor};">${p.risk_tier}</span>
                <div style="font-size: 1.2rem; font-family: var(--font-mono); font-weight: 700;">${p.failure_probability}% Risk</div>
              </div>
            </div>

            <div class="custom-progress" style="margin: 8px 0;">
              <div class="progress-fill ${riskColor}" style="width: ${p.failure_probability}%;"></div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; font-size: 0.78rem; margin: 10px 0;">
              <div>Current Growth: <strong>${p.current_growth}%</strong></div>
              <div>Daily Rate: <strong>+${p.growth_rate_daily}%/day</strong></div>
              <div>Yield Projection: <strong>${p.expected_yield_kg} kg</strong></div>
            </div>

            ${p.alert_needed ? `
              <div style="background: rgba(239, 68, 68, 0.12); border-left: 3px solid var(--red-alert); padding: 8px 12px; border-radius: 4px; font-size: 0.8rem; margin-top: 8px;">
                <strong>🚨 Cause:</strong> ${p.failure_reason}<br>
                <strong style="color: var(--cyan-neon);">Action:</strong> ${p.recommended_action}
              </div>
            ` : ''}

            <button class="btn-secondary" style="margin-top: 10px; width: 100%; font-size: 0.78rem;" onclick="Dashboard.selectPredictionTrajectory('${p.plant_id}')">
              📈 Plot AI Trajectory Curve
            </button>
          </div>
        `;
      }).join('');

      // Auto-plot first plant or stressed plant
      const target = preds.find(p => p.failure_probability > 50) || preds[0];
      if (target) {
        this.selectPredictionTrajectory(target.plant_id);
      }
    } catch (e) {
      console.error(e);
    }
  },

  selectPredictionTrajectory(plantId) {
    const p = this.data.predictions.find(item => item.plant_id === plantId);
    if (!p) return;
    if (typeof updateGrowthPredictionChart === 'function') {
      updateGrowthPredictionChart(p.plant_name, p.historical_trajectory);
    }
  },

  // ==========================================
  // VIEW: RESOURCE OPTIMIZATION
  // ==========================================
  async renderResourcesView() {
    try {
      const res = await fetch(`${API_BASE}/api/resources`).then(r => r.json());
      this.data.resources = res;

      this.setText('resTotalWaterCurrent', `${res.summary.total_water_current_ml} ml`);
      this.setText('resTotalWaterOpt', `${res.summary.total_water_optimized_ml} ml`);
      this.setText('resWaterSaved', `${res.summary.total_water_saved_ml} ml (${res.summary.water_efficiency_gain_pct}%)`);
      this.setText('resNutrientsSaved', `${res.summary.total_nutrients_saved_ppm} ppm`);

      const tableBody = document.getElementById('resourceTableBody');
      if (tableBody) {
        tableBody.innerHTML = res.optimizations.map(o => `
          <tr>
            <td><strong>${o.plant_name}</strong></td>
            <td>${o.current_water_ml} ml/d</td>
            <td style="color: var(--cyan-neon); font-weight: 600;">${o.optimized_water_ml} ml/d</td>
            <td style="color: var(--green-bio);">-${o.water_saving_ml} ml</td>
            <td>${o.optimized_light_hours} hrs/d</td>
            <td><span class="plant-badge badge-healthy">${o.storage_priority}</span></td>
          </tr>
        `).join('');
      }

      if (typeof updateResourceChart === 'function') {
        updateResourceChart(res.optimizations);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================
  // VIEW: HARVEST READINESS & SUITABILITY
  // ==========================================
  async renderHarvestView() {
    try {
      const [harvest, food] = await Promise.all([
        fetch(`${API_BASE}/api/harvest`).then(r => r.json()),
        fetch(`${API_BASE}/api/food`).then(r => r.json())
      ]);

      this.data.harvest = harvest;
      this.data.food = food;

      const container = document.getElementById('harvestCropsGrid');
      if (container) {
        container.innerHTML = harvest.map(h => {
          const isReady = h.growth >= 90;
          return `
            <div class="glass-card" style="padding: 18px; border-left: 4px solid ${isReady ? 'var(--green-bio)' : 'var(--border-glow)'};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div>
                  <h3 style="font-size: 1.15rem; font-weight: 700;">${h.name}</h3>
                  <p style="font-size: 0.75rem; color: var(--text-muted);">${h.species}</p>
                </div>
                <span class="plant-badge ${isReady ? 'badge-healthy' : 'badge-stress'}">${h.status}</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; margin: 12px 0; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px;">
                <div>Maturity: <strong>${h.growth}%</strong></div>
                <div>Expected Yield: <strong>${h.expected_yield_kg} kg</strong></div>
                <div>Shelf Life: <strong>${h.shelf_life_days} days</strong></div>
                <div>Particle Risk: <strong style="color: var(--green-bio);">${h.food_suitability.particle_risk}</strong></div>
              </div>

              <div style="background: rgba(0, 229, 255, 0.05); padding: 10px; border-radius: 6px; font-size: 0.8rem; margin-bottom: 12px;">
                <div style="color: var(--cyan-neon); font-weight: 600; font-size: 0.75rem;">SPACE SUITABILITY SCORE: ${h.food_suitability.overall_suitability_score}/100</div>
                <p style="margin-top: 4px; color: var(--text-muted);">${h.harvest_recommendation}</p>
              </div>

              <button class="btn-primary" style="width: 100%; justify-content: center;" onclick="Dashboard.executeHarvest('${h.plant_id}')">
                🌾 Harvest Crop & Transfer to Storage
              </button>
            </div>
          `;
        }).join('');
      }

      // Render Food Supply Inventory Table
      const invBody = document.getElementById('foodInventoryTableBody');
      if (invBody) {
        invBody.innerHTML = food.map(f => `
          <tr>
            <td><strong>${f.name}</strong></td>
            <td>${f.quantity_kg} kg</td>
            <td><span class="plant-badge badge-healthy">${f.nutrition_score}/100</span></td>
            <td>${f.shelf_life_days} days ${f.near_expiry ? '<span style="color: var(--red-alert);">⚠️ Near Expiry</span>' : ''}</td>
            <td>${f.storage_requirement}</td>
            <td><span class="plant-badge ${f.particle_risk === 'Zero' || f.particle_risk === 'Low' ? 'badge-healthy' : 'badge-critical'}">${f.particle_risk}</span></td>
            <td style="color: var(--cyan-neon); font-weight: 700;">${f.space_suitability_score}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  async executeHarvest(plantId) {
    try {
      const res = await fetch(`${API_BASE}/api/harvest/${plantId}`, { method: 'POST' }).then(r => r.json());
      App.showToast(`🌾 ${res.message} (${res.yield_kg} kg stored)`, 'success');
      await this.loadAll();
      this.renderHarvestView();
    } catch (e) {
      console.error(e);
    }
  },

  async renderNutritionView() {
    const progressList = document.getElementById('nutritionProgressList');
    if (!progressList) return;

    try {
      const response = await fetch(`${API_BASE}/api/nutrition`);
      if (!response.ok) throw new Error(`Nutrition analysis failed with HTTP ${response.status}`);
      const nutrition = await response.json();
      const create = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
      };

      this.setText('nutritionOverallScore', nutrition.overall_score);
      this.setText('nutritionCrewName', nutrition.astronaut_name || 'Astronaut');
      this.setText('nutritionPreferences', nutrition.preference_summary || 'No preferences saved');
      this.setText('nutritionAvoid', nutrition.avoid_summary || 'None listed');
      const atTarget = nutrition.daily_targets.filter(item => item.percent >= 100).length;
      this.setText(
        'nutritionScoreSummary',
        `${atTarget} of ${nutrition.daily_targets.length} monitored nutrients meet the suggested daily reference.`
      );

      progressList.replaceChildren(...nutrition.daily_targets.map(item => {
        const row = create('div', 'nutrition-progress-item');
        const header = create('div', 'nutrition-progress-header');
        const name = create('strong', '', item.label);
        const amount = create('span', '', `${item.planned} / ${item.target} ${item.unit}`);
        header.append(name, amount);

        const track = create('div', 'custom-progress nutrition-progress-track');
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-label', `${item.label} daily target coverage`);
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', '100');
        track.setAttribute('aria-valuenow', String(item.percent));
        const fill = create('div', `progress-fill ${item.percent >= 100 ? 'fill-green' : item.percent >= 50 ? 'fill-cyan' : 'fill-amber'}`);
        fill.style.width = `${item.percent}%`;
        track.appendChild(fill);

        const footer = create(
          'div',
          `nutrition-gap ${item.gap > 0 ? 'has-gap' : 'is-met'}`,
          item.gap > 0 ? `Gap: ${item.gap} ${item.unit}` : 'Daily reference met'
        );
        row.append(header, track, footer);
        return row;
      }));

      const menu = document.getElementById('nutritionMenu');
      if (menu) {
        if (nutrition.recommended_menu.length) {
          const list = create('div', 'nutrition-menu-list');
          nutrition.recommended_menu.forEach(item => {
            const card = create('article', 'nutrition-menu-item');
            const heading = create('div', 'nutrition-menu-heading');
            heading.append(
              create('strong', '', item.name),
              create('span', 'plant-badge badge-healthy', `${item.servings} × ${item.serving_g} g`)
            );
            const details = create(
              'p',
              '',
              `${item.source} · ${item.preference_match ? 'Matches saved preferences' : 'Fits dietary profile'}`
            );
            card.append(heading, details);
            list.appendChild(card);
          });
          menu.replaceChildren(list);
        } else {
          menu.replaceChildren(create('p', 'nutrition-empty', 'No suitable foods are currently available. Review food stores and dietary exclusions.'));
        }
      }

      const sources = document.getElementById('nutritionFoodSources');
      if (sources) {
        if (nutrition.available_foods.length) {
          const list = create('div', 'nutrition-source-list');
          nutrition.available_foods.forEach(food => {
            const item = create('div', 'nutrition-source-item');
            const copy = create('div', 'nutrition-source-copy');
            copy.append(
              create('strong', '', food.name),
              create('span', '', `${food.source} · ${food.quantity_kg} kg available`),
              create(
                'span',
                'nutrition-source-nutrients',
                `Per ${food.serving_g} g · ${food.nutrients.calories} kcal · Protein ${food.nutrients.protein} g · Calcium ${food.nutrients.calcium} mg · Iron ${food.nutrients.iron} mg · Vitamin C ${food.nutrients.vitamin_c} mg`
              )
            );
            const score = create('span', 'nutrition-food-score', `${food.nutrition_score} score`);
            item.append(copy, score);
            list.appendChild(item);
          });
          sources.replaceChildren(list);
        } else {
          sources.replaceChildren(create('p', 'nutrition-empty', 'No foods match the current profile exclusions.'));
        }
      }
      this.setText('nutritionDisclaimer', nutrition.disclaimer);
    } catch (error) {
      console.error('Unable to load astronaut nutrition monitoring', error);
      progressList.replaceChildren(
        Object.assign(document.createElement('p'), {
          className: 'nutrition-empty',
          textContent: 'Nutrition data could not be loaded. Check the mission API connection and try again.'
        })
      );
    }
  },

  // ==========================================
  // VIEW: ASTRONAUT PROFILE & RECOMMENDATION
  // ==========================================
  async renderAstronautView() {
    try {
      const [astro, rec] = await Promise.all([
        fetch(`${API_BASE}/api/astronaut`).then(r => r.json()),
        fetch(`${API_BASE}/api/recommend-food`, { method: 'POST' }).then(r => r.json())
      ]);

      this.data.astronaut = astro;

      // Fill form fields
      this.setValue('astroName', astro.name);
      this.setValue('astroRole', astro.role);
      this.setValue('astroAge', astro.age);
      this.setValue('astroMissionDays', astro.mission_days);
      this.setValue('astroPreferences', astro.preferences);
      this.setValue('astroDietary', astro.dietary_requirements);
      this.setValue('astroPriorities', astro.nutritional_priorities);
      this.setValue('astroAvoid', astro.avoid);

      // Render Meal Recommendation Card
      const recCard = document.getElementById('mealRecommendationCard');
      if (recCard) {
        recCard.innerHTML = `
          <div class="glass-card" style="border-left: 4px solid var(--cyan-neon); padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <span style="font-size: 0.72rem; color: var(--cyan-neon); letter-spacing: 1.2px; text-transform: uppercase;">
                  ${rec.mode === 'EMERGENCY_MISSION_RATION' ? '🚨 EMERGENCY SURVIVAL RATION' : "TODAY'S ORBITAL CHEF RECOMMENDATION"}
                </span>
                <h2 style="font-size: 1.45rem; font-weight: 700; margin-top: 4px;">${rec.meal_title}</h2>
              </div>
              <span class="plant-badge badge-healthy" style="font-size: 0.8rem;">Suitability: ${rec.suitability_score}/100</span>
            </div>

            <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">${rec.description}</p>

            <div style="margin-bottom: 16px;">
              <h4 style="font-size: 0.85rem; color: #fff; margin-bottom: 8px;">Meal Composition:</h4>
              <ul style="list-style: none; padding-left: 0; font-size: 0.85rem;">
                ${rec.ingredients.map(ing => `<li style="margin-bottom: 4px;">🌱 ${ing}</li>`).join('')}
              </ul>
            </div>

            <div style="background: rgba(0, 229, 255, 0.05); padding: 14px; border-radius: 8px; margin-bottom: 16px;">
              <h4 style="font-size: 0.85rem; color: var(--cyan-neon); margin-bottom: 8px;">Why this meal is recommended:</h4>
              <ul style="list-style: none; padding-left: 0; font-size: 0.82rem; color: #fff;">
                ${rec.reasons.map(r => `<li style="margin-bottom: 4px; color: var(--green-bio);">${r}</li>`).join('')}
              </ul>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-size: 0.78rem;">
              ${Object.entries(rec.nutrition_highlights).map(([k, v]) => `
                <div>
                  <span style="color: var(--text-muted);">${k}:</span>
                  <div style="font-weight: 600; color: #fff;">${v}</div>
                </div>
              `).join('')}
            </div>

            <div style="margin-top: 18px;">
              <h4 style="font-size: 0.85rem; margin-bottom: 8px;">Alternative Food Options:</h4>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${rec.alternatives.map(alt => `
                  <div class="glass-card" style="padding: 10px 14px; flex-grow: 1; font-size: 0.8rem;">
                    <strong>${alt.title}</strong>
                    <div style="color: var(--text-muted); font-size: 0.72rem;">${alt.calories} • ${alt.reason}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }
    } catch (e) {
      console.error(e);
    }
  },

  async saveAstronautProfile() {
    try {
      const payload = {
        name: this.getValue('astroName'),
        role: this.getValue('astroRole'),
        age: parseInt(this.getValue('astroAge')) || 38,
        mission_days: parseInt(this.getValue('astroMissionDays')) || 180,
        preferences: this.getValue('astroPreferences'),
        dietary_requirements: this.getValue('astroDietary'),
        nutritional_priorities: this.getValue('astroPriorities'),
        avoid: this.getValue('astroAvoid')
      };

      await fetch(`${API_BASE}/api/astronaut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      App.showToast('✅ Astronaut profile updated. Recalculating dietary optimization...', 'success');
      this.renderAstronautView();
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================
  // VIEW: EMERGENCY MISSION MODE
  // ==========================================
  async renderEmergencyView() {
    try {
      const em = await fetch(`${API_BASE}/api/emergency`).then(r => r.json());
      this.data.emergency = em;

      const panel = document.getElementById('emergencyStatusPanel');
      if (panel) {
        panel.innerHTML = `
          <div class="emergency-banner-alert ${em.is_active ? 'emergency-active-border' : ''}">
            <div>
              <span style="font-size: 0.75rem; color: var(--red-alert); letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700;">
                MISSION CRITICAL PROTOCOL STATUS
              </span>
              <h1 style="font-size: 1.8rem; font-weight: 800; color: #fff; margin-top: 4px;">
                ${em.is_active ? '🚨 EMERGENCY FOOD MODE ACTIVE' : '✅ NOMINAL BIO-SUPPORT MODE'}
              </h1>
              <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 6px;">
                <strong>Scenario:</strong> ${em.scenario} — ${em.reason}
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 2.4rem; font-family: var(--font-mono); font-weight: 800; color: ${em.is_active ? 'var(--red-alert)' : 'var(--green-bio)'};">
                ${em.remaining_food_days} Sols
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Calculated Ration Buffer for ${em.crew_size} Astronauts</div>
            </div>
          </div>

          <div class="dashboard-grid-2">
            <div class="glass-card">
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 14px;">Autonomous Emergency Protocols</h3>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${em.critical_actions.map(act => `
                  <div style="display: flex; align-items: flex-start; gap: 12px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border-left: 3px solid ${act.status === 'ACTIVE' || act.status === 'ENFORCED' ? 'var(--red-alert)' : 'var(--cyan-neon)'};">
                    <span style="font-size: 1.1rem;">${act.status === 'ACTIVE' || act.status === 'ENFORCED' ? '⚠️' : '🛡️'}</span>
                    <div style="flex-grow: 1;">
                      <div style="display: flex; justify-content: space-between;">
                        <strong style="font-size: 0.88rem; color: #fff;">${act.title}</strong>
                        <span class="plant-badge ${act.status === 'ACTIVE' || act.status === 'ENFORCED' ? 'badge-critical' : 'badge-healthy'}">${act.status}</span>
                      </div>
                      <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${act.detail}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="glass-card">
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 14px;">Emergency Mission Controls</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
                Simulate catastrophic bio-module anomalies for astronaut survival drill and hackathon demonstration.
              </p>

              ${em.is_active ? `
                <button class="btn-primary" style="width: 100%; justify-content: center; margin-bottom: 10px;" onclick="Dashboard.toggleEmergencyState(false)">
                  ✅ Stand Down Emergency (Restore Nominal Rations)
                </button>
              ` : `
                <button class="btn-outline-danger" style="width: 100%; justify-content: center; margin-bottom: 10px; font-weight: 700;" onclick="Dashboard.toggleEmergencyState(true)">
                  🚨 Simulate Critical Crop Loss & Water Shortage
                </button>
              `}

              <div style="background: rgba(0,0,0,0.3); padding: 14px; border-radius: 8px; margin-top: 14px; font-size: 0.8rem;">
                <strong style="color: var(--cyan-neon);">Ration Adjustment Policy:</strong>
                <ul style="padding-left: 18px; margin-top: 6px; color: var(--text-muted);">
                  <li>Hydroponic water diverted: -25%</li>
                  <li>Caloric intake: 2,100 kcal conserved</li>
                  <li>Spirulina protein ratio: +40%</li>
                  <li>Emergency microgreen germination: Activated</li>
                </ul>
              </div>
            </div>
          </div>
        `;
      }
    } catch (e) {
      console.error(e);
    }
  },

  async toggleEmergencyState(activate) {
    try {
      const formData = new FormData();
      formData.append('active', activate);
      formData.append('reason', activate ? 'Simulated hydroponic primary pump failure and crop loss.' : 'Nominal bio-regenerative life support restored.');

      await fetch(`${API_BASE}/api/emergency/toggle`, {
        method: 'POST',
        body: formData
      });

      App.showToast(activate ? '🚨 Emergency Mode Engaged!' : '✅ Emergency cleared. Nominal state restored.', activate ? 'danger' : 'success');
      await this.loadAll();
      this.renderEmergencyView();
    } catch (e) {
      console.error(e);
    }
  },

  // Helpers
  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  },
  setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  },
  getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  },
  setProgress(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }
};

window.Dashboard = Dashboard;
