// Content script - Injects UI into product pages
(function() {
  'use strict';

  let importButton = null;
  let floatingWidget = null;
  let currentProductData = null;
  let analysisData = null;

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[ClearSeller] Extension loaded');

    // Check if we're on a product page
    if (window.productScraper && window.productScraper.isProductPage()) {
      console.log('[ClearSeller] Product page detected');

      // Wait a bit for dynamic content to load
      setTimeout(() => {
        scrapeAndAnalyze();
      }, 2000);
    }
  }

  function scrapeAndAnalyze() {
    try {
      // Scrape product data
      currentProductData = window.productScraper.scrapeProduct();

      if (!currentProductData) {
        console.error('[ClearSeller] Failed to scrape product data');
        return;
      }

      console.log('[ClearSeller] Product scraped:', currentProductData);

      // Analyze winning potential
      if (window.winningDetector) {
        analysisData = window.winningDetector.analyzeProduct(currentProductData);
        console.log('[ClearSeller] Analysis:', analysisData);
      }

      // Inject UI
      createFloatingWidget();
      createImportButton();

    } catch (error) {
      console.error('[ClearSeller] Error in scrape and analyze:', error);
    }
  }

  function createFloatingWidget() {
    // Remove existing widget
    if (floatingWidget) {
      floatingWidget.remove();
    }

    // Create floating widget showing winning score
    floatingWidget = document.createElement('div');
    floatingWidget.id = 'clearseller-widget';
    floatingWidget.className = 'clearseller-floating-widget';

    const score = analysisData ? analysisData.totalScore : 0;
    const emoji = analysisData ? window.winningDetector.getScoreEmoji(score) : '📊';
    const color = analysisData ? window.winningDetector.getScoreColor(score) : '#6b7280';

    floatingWidget.innerHTML = `
      <div class="clearseller-widget-content">
        <div class="clearseller-widget-header" style="background: ${color}">
          <span class="clearseller-emoji">${emoji}</span>
          <span class="clearseller-score">${score}</span>
          <span class="clearseller-label">Winning Score</span>
        </div>
        <div class="clearseller-widget-body">
          <div class="clearseller-potential ${analysisData?.potential || 'low'}">
            ${analysisData?.isWinner ? '🏆 WINNER' : analysisData?.potential.toUpperCase() || 'ANALYZING...'}
          </div>
          <div class="clearseller-stats">
            <div class="stat">
              <span class="stat-label">Reviews</span>
              <span class="stat-value">${formatNumber(currentProductData?.reviewCount || 0)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Rating</span>
              <span class="stat-value">${currentProductData?.rating || 0}/5</span>
            </div>
            <div class="stat">
              <span class="stat-label">Orders</span>
              <span class="stat-value">${formatNumber(currentProductData?.orderCount || 0)}</span>
            </div>
          </div>
          <button class="clearseller-details-btn" id="clearseller-show-details">
            View Analysis
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(floatingWidget);

    // Add click handler for details
    document.getElementById('clearseller-show-details')?.addEventListener('click', showDetailedAnalysis);

    // Make widget draggable
    makeWidgetDraggable();
  }

  function createImportButton() {
    // Remove existing button
    if (importButton) {
      importButton.remove();
    }

    // Create import button
    importButton = document.createElement('button');
    importButton.id = 'clearseller-import-btn';
    importButton.className = 'clearseller-import-button';
    importButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Import to ClearSeller</span>
    `;

    importButton.addEventListener('click', handleImport);

    // Try to insert near product title or price
    const insertLocations = [
      document.querySelector('.product-title'),
      document.querySelector('h1'),
      document.querySelector('.price'),
      document.querySelector('#productTitle'),
      document.body
    ];

    for (const location of insertLocations) {
      if (location) {
        location.parentNode.insertBefore(importButton, location.nextSibling);
        break;
      }
    }
  }

  function handleImport() {
    if (!currentProductData) {
      alert('Failed to extract product data. Please refresh and try again.');
      return;
    }

    // Update button state
    importButton.disabled = true;
    importButton.innerHTML = `
      <svg class="clearseller-spinner" width="20" height="20" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
        <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
      <span>Importing...</span>
    `;

    // Send to background script for API call
    chrome.runtime.sendMessage({
      action: 'importProduct',
      product: currentProductData,
      analysis: analysisData
    }, (response) => {
      if (response.success) {
        importButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Imported Successfully!</span>
        `;
        importButton.style.background = '#10b981';

        // Show success notification
        showNotification('Product imported successfully!', 'success');
      } else {
        importButton.disabled = false;
        importButton.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Import to ClearSeller</span>
        `;

        showNotification(response.error || 'Import failed', 'error');
      }
    });
  }

  function showDetailedAnalysis() {
    if (!analysisData) return;

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'clearseller-modal-overlay';
    modal.innerHTML = `
      <div class="clearseller-modal">
        <div class="clearseller-modal-header">
          <h2>🔍 Product Analysis</h2>
          <button class="clearseller-modal-close">&times;</button>
        </div>
        <div class="clearseller-modal-body">
          <div class="clearseller-score-display">
            <div class="score-circle" style="border-color: ${window.winningDetector.getScoreColor(analysisData.totalScore)}">
              <span class="score-number">${analysisData.totalScore}</span>
              <span class="score-max">/100</span>
            </div>
            <div class="score-label">
              ${analysisData.isWinner ? '🏆 WINNING PRODUCT' : analysisData.potential.toUpperCase() + ' POTENTIAL'}
            </div>
          </div>

          <div class="clearseller-breakdown">
            <h3>Score Breakdown</h3>
            ${createScoreBar('Reviews', analysisData.breakdown.reviewScore)}
            ${createScoreBar('Rating', analysisData.breakdown.ratingScore)}
            ${createScoreBar('Orders', analysisData.breakdown.orderScore)}
            ${createScoreBar('Profit', analysisData.breakdown.profitScore)}
          </div>

          <div class="clearseller-reasons">
            <h3>Analysis</h3>
            ${analysisData.reasons.map(reason => `
              <div class="reason-item">${reason}</div>
            `).join('')}
          </div>

          ${analysisData.warnings.length > 0 ? `
            <div class="clearseller-warnings">
              <h3>⚠️ Warnings</h3>
              ${analysisData.warnings.map(warning => `
                <div class="warning-item">${warning}</div>
              `).join('')}
            </div>
          ` : ''}

          <button class="clearseller-import-from-modal" id="clearseller-import-from-modal">
            Import This Product
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.clearseller-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.clearseller-modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('clearseller-modal-overlay')) {
        modal.remove();
      }
    });
    document.getElementById('clearseller-import-from-modal')?.addEventListener('click', () => {
      modal.remove();
      handleImport();
    });
  }

  function createScoreBar(label, score) {
    const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    return `
      <div class="score-bar-container">
        <div class="score-bar-label">${label}</div>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width: ${score}%; background: ${color}"></div>
        </div>
        <div class="score-bar-value">${score}</div>
      </div>
    `;
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `clearseller-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function makeWidgetDraggable() {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    const header = floatingWidget.querySelector('.clearseller-widget-header');

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - floatingWidget.offsetLeft;
      initialY = e.clientY - floatingWidget.offsetTop;
      isDragging = true;
    }

    function drag(e) {
      if (!isDragging) return;

      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      floatingWidget.style.left = currentX + 'px';
      floatingWidget.style.top = currentY + 'px';
      floatingWidget.style.right = 'auto';
      floatingWidget.style.bottom = 'auto';
    }

    function dragEnd() {
      isDragging = false;
    }
  }

  function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
})();
