// Background Service Worker - Handles API communication
console.log('[ClearSeller] Background service worker loaded');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'importProduct') {
    handleProductImport(request.product, request.analysis)
      .then(sendResponse)
      .catch(error => {
        console.error('[ClearSeller] Import error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['apiUrl', 'autoDetect'], (settings) => {
      sendResponse({
        apiUrl: settings.apiUrl || CONFIG.API_BASE_URL,
        autoDetect: settings.autoDetect !== false
      });
    });
    return true;
  }

  if (request.action === 'saveSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Import product to ClearSeller via API
 */
async function handleProductImport(productData, analysisData) {
  try {
    // Get API URL from settings
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl || CONFIG.API_BASE_URL;

    // Get session token (assumes user is logged in on the web app)
    const authToken = await getAuthToken(apiUrl);

    // Prepare import payload
    const payload = {
      title: productData.title,
      price: productData.price,
      images: productData.images,
      description: productData.description,
      supplierUrl: productData.supplierUrl,
      supplierPrice: productData.supplierPrice,
      shippingTime: productData.shippingTime,
      rating: productData.rating,
      reviewCount: productData.reviewCount,
      source: productData.source,
      productType: productData.productType
    };

    // Add viral scoring if available
    if (analysisData) {
      payload.viralScore = analysisData.totalScore;
      payload.viralPotential = analysisData.potential;
      payload.viralReasons = analysisData.reasons;
    }

    console.log('[ClearSeller] Importing product:', payload);

    // Make API call
    const response = await fetch(`${apiUrl}/api/products/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Cookie': authToken })
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Import failed: ${response.status}`);
    }

    // Save to import history
    await saveToHistory(productData, data.product);

    // Update stats
    await updateStats('imports');

    return {
      success: true,
      product: data.product
    };

  } catch (error) {
    console.error('[ClearSeller] Import failed:', error);

    // Check if it's an auth error
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: 'Please log in to ClearSeller first. Open the extension popup to authenticate.'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to import product. Please try again.'
    };
  }
}

/**
 * Get auth token from cookies
 */
async function getAuthToken(apiUrl) {
  try {
    const url = new URL(apiUrl);
    const cookies = await chrome.cookies.getAll({ domain: url.hostname });

    // Look for next-auth session token
    const sessionCookie = cookies.find(c =>
      c.name.includes('next-auth.session-token') ||
      c.name.includes('__Secure-next-auth.session-token')
    );

    if (sessionCookie) {
      return `${sessionCookie.name}=${sessionCookie.value}`;
    }

    return null;
  } catch (error) {
    console.error('[ClearSeller] Error getting auth token:', error);
    return null;
  }
}

/**
 * Save imported product to local history
 */
async function saveToHistory(productData, importedProduct) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['importHistory'], (result) => {
      const history = result.importHistory || [];

      history.unshift({
        ...productData,
        importedAt: new Date().toISOString(),
        importedId: importedProduct?.id,
        platform: productData.source
      });

      // Keep only last 100 imports
      const trimmedHistory = history.slice(0, 100);

      chrome.storage.local.set({ importHistory: trimmedHistory }, () => {
        resolve();
      });
    });
  });
}

/**
 * Update extension statistics
 */
async function updateStats(type) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || {
        imports: 0,
        winnersFound: 0,
        totalValue: 0
      };

      if (type === 'imports') {
        stats.imports += 1;
      } else if (type === 'winner') {
        stats.winnersFound += 1;
      }

      stats.lastUpdated = new Date().toISOString();

      chrome.storage.local.set({ stats }, () => {
        resolve();
      });
    });
  });
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[ClearSeller] Extension installed');

    // Set default settings
    chrome.storage.sync.set({
      apiUrl: CONFIG.API_BASE_URL,
      autoDetect: true,
      showFloatingWidget: true
    });

    // Initialize stats
    chrome.storage.local.set({
      stats: {
        imports: 0,
        winnersFound: 0,
        totalValue: 0,
        installedAt: new Date().toISOString()
      },
      importHistory: []
    });

    // Open welcome page
    chrome.tabs.create({
      url: `${CONFIG.API_BASE_URL}/dashboard?welcome=extension`
    });
  }
});

/**
 * Context menu for quick import
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clearseller-import',
    title: 'Import to ClearSeller',
    contexts: ['page', 'link'],
    documentUrlPatterns: [
      'https://*.aliexpress.com/*',
      'https://*.amazon.com/*',
      'https://*.temu.com/*'
    ]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clearseller-import') {
    // Send message to content script to trigger import
    chrome.tabs.sendMessage(tab.id, {
      action: 'triggerImport'
    });
  }
});

/**
 * Badge notifications
 */
function updateBadge(text, color = '#ef4444') {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Listen for winning products detected
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'winnerDetected') {
    updateBadge('🔥', '#ef4444');
    updateStats('winner');

    // Clear badge after 5 seconds
    setTimeout(() => {
      updateBadge('', '#ef4444');
    }, 5000);
  }
});
