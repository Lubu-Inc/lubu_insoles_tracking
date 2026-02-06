// ─── Insole Tracker API Client ──────────────────────────────────────────────
//
// Configure your Google Apps Script deployment URL below.
// After deploying your Apps Script, paste the URL here.
//

const API = {
  // ══════════════════════════════════════════════════════════════════════════
  // PASTE YOUR GOOGLE APPS SCRIPT URL HERE:
  BASE_URL: 'https://script.google.com/a/macros/lubu.ai/s/AKfycbwgJJbWsqF8lS-FHyseqZdWnhGaoTmWYFImhxsoM_IaBg8toIa7B2d4uJAnUAd2pWyq/exec',
  // ══════════════════════════════════════════════════════════════════════════

  isConfigured() {
    return Boolean(API.BASE_URL);
  },

  // ── GET request ────────────────────────────────────────────────────────────
  async get(action, params = {}) {
    if (!API.isConfigured()) {
      throw new Error('API not configured. Set your Apps Script URL in js/api.js');
    }

    const url = new URL(API.BASE_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Unknown API error');
    }

    return result;
  },

  // ── POST request with GET fallback (Apps Script CORS workaround) ────────
  async post(action, data) {
    if (!API.isConfigured()) {
      throw new Error('API not configured. Set your Apps Script URL in js/api.js');
    }

    // Try POST first
    try {
      const response = await fetch(API.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, data, id: data?.id }),
        redirect: 'follow',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success !== undefined) return result;
      }
    } catch (_) {
      // POST failed (likely CORS redirect), fall through to GET
    }

    // GET fallback — encode data as URL parameter
    const url = new URL(API.BASE_URL);
    url.searchParams.set('action', action);
    if (data) url.searchParams.set('data', JSON.stringify(data));
    if (data?.id) url.searchParams.set('id', data.id);

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Unknown API error');
    }

    return result;
  },

  // ── High-level methods ─────────────────────────────────────────────────────

  async fetchInsoles() {
    return API.get('getInsoles');
  },

  async fetchHistory(insoleId) {
    return API.get('getHistory', { insoleId });
  },

  async addInsole(insoleData) {
    return API.post('addInsole', insoleData);
  },

  async updateInsole(insoleData) {
    return API.post('updateInsole', insoleData);
  },

  async deleteInsole(id) {
    return API.post('deleteInsole', { id });
  },
};
