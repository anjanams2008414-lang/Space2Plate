// Space2Plate - Core App & Navigation Controller

const API_BASE = (window.location.protocol.startsWith('http')) 
  ? window.location.origin 
  : 'http://127.0.0.1:8000';

const App = {
  activePage: 'dashboard',
  isEmergencyActive: false,
  ws: null,

  init() {
    this.setupLogin();
    this.setupNavigation();
    this.setupMobileMenu();
    this.setupDemoMode();
    this.setupCrewCompanion();
    this.connectTelemetryWebSocket();

    // Initial data load
    Dashboard.loadAll();

    // Periodic telemetry update fallback
    setInterval(() => {
      Dashboard.fetchLiveTelemetry();
    }, 4000);
  },

  setupLogin() {
    const form = document.getElementById('loginForm');
    const screen = document.getElementById('loginScreen');
    const nameInput = document.getElementById('crewName');
    if (!form || !screen || !nameInput) return;

    nameInput.focus();
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const crewName = nameInput.value.trim();
      if (!crewName) {
        nameInput.setCustomValidity('Please enter your astronaut name.');
        nameInput.reportValidity();
        nameInput.addEventListener('input', () => nameInput.setCustomValidity(''), { once: true });
        return;
      }

      const displayName = document.getElementById('crewNameDisplay');
      if (displayName) displayName.textContent = crewName;
      Dashboard.renderMissionHero();

      document.getElementById('loginLaunchRocket')?.classList.add('is-launching');
      screen.classList.add('is-launching');
      window.setTimeout(() => {
        screen.remove();
        document.getElementById('loginLaunchRocket')?.remove();
        document.body.classList.remove('login-required');
        document.querySelector('.app-container')?.setAttribute('aria-hidden', 'false');
        document.querySelector('.page-title')?.focus();
      }, 1150);
    });
  },

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');
        this.switchPage(targetPage);
      });
    });
  },

  switchPage(pageId) {
    this.activePage = pageId;
    this.updateCrewTip();

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-page') === pageId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update page views
    document.querySelectorAll('.page-view').forEach(view => {
      if (view.id === `page-${pageId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    document.querySelector('.sidebar').classList.remove('open');

    // Trigger page-specific data refreshes
    if (pageId === 'plants') Dashboard.renderPlantsView();
    if (pageId === 'prediction') Dashboard.renderPredictionView();
    if (pageId === 'resources') Dashboard.renderResourcesView();
    if (pageId === 'harvest') Dashboard.renderHarvestView();
    if (pageId === 'astronaut') Dashboard.renderAstronautView();
    if (pageId === 'nutrition') Dashboard.renderNutritionView();
    if (pageId === 'emergency') Dashboard.renderEmergencyView();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setupCrewCompanion() {
    const companion = document.querySelector('.crew-astronaut');
    const dismiss = document.getElementById('dismissCrewAstronaut');
    const reopen = document.getElementById('showCrewAstronaut');
    if (!companion || !dismiss || !reopen) return;

    let dismissed = false;
    let pinnedOpen = false;
    dismiss.addEventListener('click', () => {
      dismissed = true;
      pinnedOpen = false;
      companion.classList.remove('is-tucked');
      companion.classList.add('is-dismissed');
      reopen.classList.add('is-visible');
    });
    reopen.addEventListener('click', () => {
      dismissed = false;
      pinnedOpen = true;
      companion.classList.remove('is-tucked');
      companion.classList.remove('is-dismissed');
      reopen.classList.remove('is-visible');
    });

    const digitalTwin = document.querySelector('.digital-twin');
    const nutritionPage = document.getElementById('page-nutrition');
    if ((digitalTwin || nutritionPage) && 'IntersectionObserver' in window) {
      let greenhouseVisible = false;
      let nutritionVisible = false;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const isVisible = entry.isIntersecting;
          if (entry.target === digitalTwin) greenhouseVisible = isVisible;
          if (entry.target === nutritionPage) nutritionVisible = isVisible;
          if (!isVisible) pinnedOpen = false;
        });
        const pageHasOverlay = (this.activePage === 'greenhouse' && greenhouseVisible)
          || (this.activePage === 'nutrition' && nutritionVisible);
        const tuckCompanion = pageHasOverlay && !dismissed && !pinnedOpen;
        companion.classList.toggle('is-tucked', tuckCompanion);
        reopen.classList.toggle('is-visible', dismissed || tuckCompanion);
      }, { threshold: 0.12 });
      if (digitalTwin) observer.observe(digitalTwin);
      if (nutritionPage) observer.observe(nutritionPage);
    }
  },

  updateCrewTip() {
    const title = document.getElementById('crewTipTitle');
    const message = document.getElementById('crewTipMessage');
    if (!title || !message) return;

    const stats = Dashboard.data.dashboard?.stats;
    const emergency = Dashboard.data.dashboard?.mission?.emergency_mode;
    const tips = {
      dashboard: ['Mission guide', 'Your greenhouse and food reserves at a glance.'],
      plants: ['Crop watch', 'Check the amber and red health bars first.'],
      greenhouse: ['Habitat systems', 'Explore live crop health, environmental telemetry, and resource flow.'],
      'ai-analysis': ['Leaf scan tip', 'Use a clear, well-lit leaf photo for the best scan.'],
      prediction: ['Growth forecast', 'Watch the risk trend to catch crop stress early.'],
      resources: ['Resource watch', 'Small water savings add up across every grow cycle.'],
      harvest: ['Harvest tip', 'Pick mature crops promptly to protect freshness.'],
      astronaut: ['Crew nutrition', 'Match the meal plan to your current nutrition priorities.'],
      nutrition: ['Crew wellness', 'Review nutrient gaps and refresh the menu after changing food preferences.'],
      emergency: ['Survival protocol', 'Review food reserves and active conservation steps.'],
      settings: ['Habitat systems', 'Keep chamber readings within their safe operating ranges.']
    };
    const [tipTitle, tipMessage] = tips[this.activePage] || tips.dashboard;
    title.textContent = emergency ? 'Mission alert' : tipTitle;
    message.textContent = emergency
      ? `Crew reserve: ${stats?.food_stock_days_remaining ?? '—'} sols. Review emergency protocols.`
      : this.activePage === 'dashboard' && Number(stats?.plants_at_risk || 0) > 0
        ? `${stats.plants_at_risk} crop${stats.plants_at_risk === 1 ? '' : 's'} ${stats.plants_at_risk === 1 ? 'needs' : 'need'} attention today.`
        : tipMessage;
  },

  setupMobileMenu() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  },

  setupDemoMode() {
    document.getElementById('btnDemo1')?.addEventListener('click', () => this.runDemoStep(1));
    document.getElementById('btnDemo2')?.addEventListener('click', () => this.runDemoStep(2));
    document.getElementById('btnDemo3')?.addEventListener('click', () => this.runDemoStep(3));
    document.getElementById('btnDemoReset')?.addEventListener('click', () => this.runDemoStep(0));
  },

  async runDemoStep(step) {
    try {
      if (step === 1) {
        // SCENARIO 1: NORMAL MISSION
        await fetch(`${API_BASE}/api/demo/reset`, { method: 'POST' });
        this.showToast('✅ Scenario 1: Nominal Space Mission active. All bio-crops healthy.', 'success');
        this.switchPage('dashboard');
        await Dashboard.loadAll();
      } else if (step === 2) {
        // SCENARIO 2: PLANT STRESS (Tomato-03)
        await fetch(`${API_BASE}/api/demo/stress`, { method: 'POST' });
        this.showToast('⚠️ Scenario 2: Stress detected on Tomato-03! Failure risk rose to 78%.', 'warning');
        this.switchPage('plants');
        await Dashboard.loadAll();
        setTimeout(() => {
          Dashboard.openPlantModal('TOM-03');
        }, 300);
      } else if (step === 3) {
        // SCENARIO 3: EMERGENCY MISSION MODE
        await fetch(`${API_BASE}/api/demo/emergency`, { method: 'POST' });
        this.showToast('🚨 Scenario 3: EMERGENCY MODE ENGAGED! Crew rations restricted to 18 days.', 'danger');
        this.switchPage('emergency');
        await Dashboard.loadAll();
      } else if (step === 0) {
        // RESET
        await fetch(`${API_BASE}/api/demo/reset`, { method: 'POST' });
        this.showToast('🔄 Demo reset to default pristine state.', 'info');
        this.switchPage('dashboard');
        await Dashboard.loadAll();
      }
    } catch (err) {
      console.error('Demo step failed', err);
      this.showToast('Action sent to local prototype.', 'info');
    }
  },

  connectTelemetryWebSocket() {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = (window.location.protocol.startsWith('http'))
        ? `${wsProtocol}//${window.location.host}/ws/telemetry`
        : 'ws://127.0.0.1:8000/ws/telemetry';

      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TELEMETRY_TICK') {
            Dashboard.updateTelemetryUI(msg.telemetry);
          }
        } catch (e) {}
      };

      this.ws.onerror = () => {
        // Fallback gracefully to HTTP polling
      };
    } catch (e) {}
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.position = 'fixed';
      container.style.bottom = '24px';
      container.style.right = '24px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'glass-card';
    toast.style.padding = '12px 20px';
    toast.style.minWidth = '280px';
    toast.style.fontSize = '0.85rem';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.animation = 'fadeIn 0.25s ease forwards';

    if (type === 'danger') {
      toast.style.borderColor = 'var(--red-alert)';
      toast.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
    } else if (type === 'warning') {
      toast.style.borderColor = 'var(--amber-warn)';
    } else if (type === 'success') {
      toast.style.borderColor = 'var(--green-bio)';
    } else {
      toast.style.borderColor = 'var(--cyan-neon)';
    }

    toast.innerHTML = `<div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
