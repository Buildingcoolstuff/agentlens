/**
 * AgentLens Background Service Worker (background.ts)
 *
 * Handles fetching raw SSR HTML without CORS restrictions and coordinates
 * communication between popup and active content tabs.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('AgentLens MV3 Background Worker initialized.');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_RAW_HTML') {
    fetch(message.url, {
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentLens-CrawlerBot/1.0; +https://agentlens.dev)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
      .then(async (res) => {
        const text = await res.text();
        sendResponse({ success: true, html: text, status: res.status });
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'FETCH_ROBOTS') {
    fetch(message.url, {
      headers: { 'User-Agent': 'AgentLens-AuditBot/1.0' },
    })
      .then(async (res) => {
        if (!res.ok) {
          sendResponse({ success: false, status: res.status });
          return;
        }
        const text = await res.text();
        sendResponse({ success: true, robotsTxt: text });
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });

    return true;
  }
});
