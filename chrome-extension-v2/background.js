// Background Service Worker - Handles API communication

// Define CONFIG directly in background worker
const CONFIG = {
  API_BASE_URL: 'https://clearseller.com',
  WINNING_PRODUCT_CRITERIA: {
    minReviews: 500,
    minRating: 4.3,
    minOrders: 1000,
    maxPrice: 50,
    minProfitMargin: 30,
    weights: {
      reviews: 0.3,
      rating: 0.2,
      orders: 0.25,
      profit: 0.25
    }
  }
};

console.log('========================================');
console.log('🔥🔥🔥 NEW VERSION V2 FRESH LOADED 🔥🔥🔥');
console.log('[ClearSeller] Background service worker loaded - v1.0.3 - TIMESTAMP:', new Date().toISOString());
console.log('[Background] CONFIG.API_BASE_URL:', CONFIG.API_BASE_URL);
console.log('🔥🔥🔥 NEW VERSION V2 FRESH LOADED 🔥🔥🔥');
console.log('========================================');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Message received:', request.action);

  if (request.action === 'importProduct') {
    console.log('[Background] Handling product import...');
    console.log('[Background] Product data:', request.product);
    console.log('[Background] Analysis data:', request.analysis);

    handleProductImport(request.product, request.analysis)
      .then(result => {
        console.log('[Background] Import successful, sending response:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('[Background] Import error caught:', error);
        const errorResponse = { success: false, error: error.message };
        console.log('[Background] Sending error response:', errorResponse);
        sendResponse(errorResponse);
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

  if (request.action === 'winnerDetected') {
    console.log('[Background] Winner detected!');
    updateBadge('🔥', '#ef4444');
    updateStats('winner');

    // Clear badge after 5 seconds
    setTimeout(() => {
      updateBadge('', '#ef4444');
    }, 5000);
  }
});

/**
 * Import product to ClearSeller via API
 */
async function handleProductImport(productData, analysisData) {
  console.log('[Background] handleProductImport called');

  try {
    // Get API URL from settings
    console.log('[Background] Getting settings...');
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl || CONFIG.API_BASE_URL;
    console.log('[Background] API URL:', apiUrl);

    // Get session token (assumes user is logged in on the web app)
    console.log('[Background] Getting auth token...');
    const authToken = await getAuthToken(apiUrl);
    console.log('[Background] Auth token:', authToken ? 'Found' : 'Not found');

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

    console.log('[Background] Payload prepared:', payload);
    console.log('[Background] Making API call to:', `${apiUrl}/api/products/import`);

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

    console.log('[Background] API response status:', response.status);
    console.log('[Background] API response ok:', response.ok);

    const data = await response.json();
    console.log('[Background] API response data:', data);

    if (!response.ok) {
      throw new Error(data.error || `Import failed: ${response.status}`);
    }

    // Save to import history
    console.log('[Background] Saving to history...');
    await saveToHistory(productData, data.product);

    // Update stats
    console.log('[Background] Updating stats...');
    await updateStats('imports');

    console.log('[Background] Import completed successfully');
    return {
      success: true,
      product: data.product
    };

  } catch (error) {
    console.error('[Background] Import failed with error:', error);
    console.error('[Background] Error stack:', error.stack);

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
    console.log('[Background] getAuthToken - parsing URL:', apiUrl);
    const url = new URL(apiUrl);
    console.log('[Background] getAuthToken - hostname:', url.hostname);

    console.log('[Background] getAuthToken - getting cookies...');
    const cookies = await chrome.cookies.getAll({ domain: url.hostname });
    console.log('[Background] getAuthToken - found cookies:', cookies.length);
    console.log('[Background] getAuthToken - cookie names:', cookies.map(c => c.name));

    // Look for next-auth session token
    const sessionCookie = cookies.find(c =>
      c.name.includes('next-auth.session-token') ||
      c.name.includes('__Secure-next-auth.session-token')
    );

    if (sessionCookie) {
      console.log('[Background] getAuthToken - session cookie found:', sessionCookie.name);
      return `${sessionCookie.name}=${sessionCookie.value}`;
    }

    console.log('[Background] getAuthToken - no session cookie found');
    return null;
  } catch (error) {
    console.error('[Background] Error getting auth token:', error);
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
  console.log('[Background] Extension installed/updated, reason:', details.reason);

  if (details.reason === 'install') {
    console.log('[Background] First time install - initializing settings');

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
 * Badge notifications
 */
function updateBadge(text, color = '#ef4444') {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

console.log('[Background] All functions defined, service worker ready');
