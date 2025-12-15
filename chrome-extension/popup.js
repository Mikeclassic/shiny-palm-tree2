// Popup JavaScript
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadHistory();
  loadSettings();
  setupEventListeners();
});

// Tab switching
function setupEventListeners() {
  // Tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Dashboard buttons
  document.getElementById('open-dashboard')?.addEventListener('click', () => {
    chrome.storage.sync.get(['apiUrl'], (result) => {
      const apiUrl = result.apiUrl || 'http://localhost:3000';
      chrome.tabs.create({ url: `${apiUrl}/dashboard` });
    });
  });

  document.getElementById('refresh-stats')?.addEventListener('click', () => {
    loadStats();
    loadHistory();
  });

  // Settings form
  document.getElementById('settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });

  // Toggle switches
  document.getElementById('auto-detect-toggle')?.addEventListener('click', function() {
    this.classList.toggle('active');
  });

  document.getElementById('widget-toggle')?.addEventListener('click', function() {
    this.classList.toggle('active');
  });
}

function switchTab(tabName) {
  // Update buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(tabName).classList.add('active');

  // Reload data if needed
  if (tabName === 'history') {
    loadHistory();
  }
}

// Load statistics
function loadStats() {
  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || { imports: 0, winnersFound: 0, totalValue: 0 };

    document.getElementById('imports-count').textContent = stats.imports || 0;
    document.getElementById('winners-count').textContent = stats.winnersFound || 0;
    document.getElementById('value-count').textContent = `$${(stats.totalValue || 0).toFixed(0)}`;
  });
}

// Load import history
function loadHistory() {
  chrome.storage.local.get(['importHistory'], (result) => {
    const history = result.importHistory || [];
    const historyList = document.getElementById('history-list');

    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <div class="empty-text">No imports yet.<br>Visit AliExpress, Amazon, or Temu to start importing!</div>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.slice(0, 10).map(item => {
      const date = new Date(item.importedAt);
      const timeAgo = getTimeAgo(date);
      const isWinner = item.viralScore >= 70;

      return `
        <div class="history-item">
          <div class="history-title">
            ${item.title}
            ${isWinner ? '<span class="winner-badge">WINNER</span>' : ''}
          </div>
          <div class="history-meta">
            <span>${item.platform.toUpperCase()}</span>
            <span>•</span>
            <span>$${item.supplierPrice.toFixed(2)}</span>
            <span>•</span>
            <span>${timeAgo}</span>
          </div>
        </div>
      `;
    }).join('');
  });
}

// Load settings
function loadSettings() {
  chrome.storage.sync.get(['apiUrl', 'autoDetect', 'showFloatingWidget'], (result) => {
    document.getElementById('api-url').value = result.apiUrl || 'http://localhost:3000';

    if (result.autoDetect !== false) {
      document.getElementById('auto-detect-toggle').classList.add('active');
    } else {
      document.getElementById('auto-detect-toggle').classList.remove('active');
    }

    if (result.showFloatingWidget !== false) {
      document.getElementById('widget-toggle').classList.add('active');
    } else {
      document.getElementById('widget-toggle').classList.remove('active');
    }
  });
}

// Save settings
function saveSettings() {
  const apiUrl = document.getElementById('api-url').value;
  const autoDetect = document.getElementById('auto-detect-toggle').classList.contains('active');
  const showWidget = document.getElementById('widget-toggle').classList.contains('active');

  chrome.storage.sync.set({
    apiUrl,
    autoDetect,
    showFloatingWidget: showWidget
  }, () => {
    // Show success feedback
    const submitBtn = document.querySelector('#settings-form button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '✓ Saved!';
    submitBtn.style.background = '#10b981';

    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.style.background = '';
    }, 2000);
  });
}

// Utility function to format time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
