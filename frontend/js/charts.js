// Space2Plate - Chart.js Visualizations Controller

let healthDistChart = null;
let growthPredictionChart = null;
let resourceSavingChart = null;
let envTelemetryChart = null;
let foodRadarChart = null;

// Common chart styling for dark futuristic theme
Chart.defaults.color = '#8e9db5';
Chart.defaults.font.family = "'Inter', sans-serif";

function initCharts() {
  initHealthDistChart();
  initGrowthPredictionChart();
  initResourceSavingChart();
  initEnvTelemetryChart();
  initFoodRadarChart();
}

// 1. Health Distribution Doughnut Chart
function initHealthDistChart() {
  const ctx = document.getElementById('chartHealthDist');
  if (!ctx) return;

  healthDistChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Optimal Healthy', 'Mild Stress', 'Critical Risk'],
      datasets: [{
        data: [4, 1, 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(239, 68, 68, 0.85)'
        ],
        borderColor: '#070a13',
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 14 }
        }
      },
      cutout: '72%'
    }
  });
}

function updateHealthDistChart(healthy, stress, critical) {
  if (!healthDistChart) return;
  healthDistChart.data.datasets[0].data = [healthy, stress, critical];
  healthDistChart.update();
}

// 2. Growth Prediction & Trajectory Curve
function initGrowthPredictionChart() {
  const ctx = document.getElementById('chartGrowthPrediction');
  if (!ctx) return;

  const labels = ['Day -6', 'Day -4', 'Day -2', 'Today (Sol 142)', 'Day +2', 'Day +4', 'Harvest'];
  const historical = [58, 68, 76, 85, null, null, null];
  const projected = [null, null, null, 85, 91, 96, 100];

  growthPredictionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Historical Growth (%)',
          data: historical,
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0, 229, 255, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#00e5ff'
        },
        {
          label: 'Projected Trajectory (AI Model)',
          data: projected,
          borderColor: '#a855f7',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#a855f7'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 40,
          max: 105,
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      },
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function updateGrowthPredictionChart(plantName, trajectory) {
  if (!growthPredictionChart || !trajectory || trajectory.length === 0) return;
  const labels = trajectory.map(t => t.day);
  const hist = [];
  const proj = [];

  let lastHistVal = null;
  trajectory.forEach(t => {
    if (t.type === 'Historical') {
      hist.push(t.growth);
      proj.push(null);
      lastHistVal = t.growth;
    } else {
      if (lastHistVal !== null) {
        // connect the projection point
        proj[hist.length - 1] = lastHistVal;
        lastHistVal = null;
      }
      hist.push(null);
      proj.push(t.growth);
    }
  });

  growthPredictionChart.data.labels = labels;
  growthPredictionChart.data.datasets[0].label = `${plantName} Actual Growth (%)`;
  growthPredictionChart.data.datasets[0].data = hist;
  growthPredictionChart.data.datasets[1].data = proj;
  growthPredictionChart.update();
}

// 3. Resource Savings Bar Chart
function initResourceSavingChart() {
  const ctx = document.getElementById('chartResourceSaving');
  if (!ctx) return;

  resourceSavingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Lettuce-01', 'Tomato-03', 'Radish-02', 'Peas-01', 'Spinach-04'],
      datasets: [
        {
          label: 'Current Water (ml/day)',
          data: [420, 310, 380, 405, 395],
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 4
        },
        {
          label: 'AI-Optimized Water (ml/day)',
          data: [386, 356, 342, 364, 363],
          backgroundColor: 'rgba(0, 229, 255, 0.85)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: {
          grid: { display: false }
        }
      },
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function updateResourceChart(optimizations) {
  if (!resourceSavingChart || !optimizations) return;
  const labels = optimizations.map(o => o.plant_name);
  const current = optimizations.map(o => o.current_water_ml);
  const optimized = optimizations.map(o => o.optimized_water_ml);

  resourceSavingChart.data.labels = labels;
  resourceSavingChart.data.datasets[0].data = current;
  resourceSavingChart.data.datasets[1].data = optimized;
  resourceSavingChart.update();
}

// 4. Environmental Sensor History
function initEnvTelemetryChart() {
  const ctx = document.getElementById('chartEnvTelemetry');
  if (!ctx) return;

  const times = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  envTelemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: times,
      datasets: [
        {
          label: 'Temp (°C)',
          data: [21.8, 22.0, 22.6, 22.9, 22.4, 22.3],
          borderColor: '#f59e0b',
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Humidity (%)',
          data: [62, 64, 65, 63, 66, 65],
          borderColor: '#00e5ff',
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          min: 15,
          max: 30,
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y1: {
          type: 'linear',
          position: 'right',
          min: 40,
          max: 90,
          grid: { display: false }
        }
      }
    }
  });
}

// 5. Space Food Suitability Radar
function initFoodRadarChart() {
  const ctx = document.getElementById('chartFoodRadar');
  if (!ctx) return;

  foodRadarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Nutrition', 'Shelf Life', 'Storage Ease', 'Zero Crumb Safety', 'Microgravity Digestibility'],
      datasets: [
        {
          label: 'Fresh Space Spinach',
          data: [96, 75, 82, 92, 90],
          backgroundColor: 'rgba(16, 185, 129, 0.25)',
          borderColor: '#10b981',
          pointBackgroundColor: '#10b981'
        },
        {
          label: 'Spirulina Bio-Gel',
          data: [98, 95, 92, 99, 88],
          backgroundColor: 'rgba(0, 229, 255, 0.2)',
          borderColor: '#00e5ff',
          pointBackgroundColor: '#00e5ff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.08)' },
          pointLabels: { color: '#8e9db5', font: { size: 10 } },
          suggestedMin: 50,
          suggestedMax: 100
        }
      }
    }
  });
}
