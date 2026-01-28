(function () {
  const API_BASE = '/api/proxy';

  const safeGet = (key) => {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null && value !== undefined) return value;
    } catch {
      // ignore
    }
    try {
      if (window.top && window.top !== window) {
        return window.top.localStorage.getItem(key);
      }
    } catch {
      // ignore
    }
    return null;
  };

  const safeSet = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
    try {
      if (window.top && window.top !== window) {
        window.top.localStorage.setItem(key, value);
      }
    } catch {
      // ignore
    }
  };

  const safeRemove = (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    try {
      if (window.top && window.top !== window) {
        window.top.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  };

  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = safeGet('edro_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const refreshAccessToken = async () => {
    const refreshToken = safeGet('edro_refresh');
    const userRaw = safeGet('edro_user');
    if (!refreshToken || !userRaw) return false;

    let user;
    try {
      user = JSON.parse(userRaw);
    } catch {
      return false;
    }
    if (!user?.id) return false;

    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, refreshToken }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    if (data?.accessToken) safeSet('edro_token', data.accessToken);
    if (data?.refreshToken) safeSet('edro_refresh', data.refreshToken);
    if (data?.user) safeSet('edro_user', JSON.stringify(data.user));
    return true;
  };

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request(path, options);
      }
      if (window.top) window.top.location.href = '/login';
    }

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      throw new Error(text || `Unexpected response ${response.status}`);
    }
    return text ? JSON.parse(text) : {};
  };

  const getClientId = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get('clientId');
      if (queryId) return queryId;
    } catch {
      // ignore
    }

    try {
      const topPath = window.top?.location?.pathname || window.location.pathname;
      const match = topPath.match(/\/clients\/([^/?#]+)/);
      if (match) return match[1];
    } catch {
      // ignore
    }

    return safeGet('edro_client_id');
  };

  const setClientId = (clientId) => {
    if (!clientId) return;
    safeSet('edro_client_id', clientId);
  };

  const readJson = (key, fallback) => {
    const raw = safeGet(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const syncStudioContext = async () => {
    const contextKey = 'edro_studio_context';
    const context = readJson(contextKey, {});
    let changed = false;

    try {
      const params = new URLSearchParams(window.location.search);
      const map = {
        client: 'client',
        clientId: 'clientId',
        segment: 'segment',
        location: 'location',
        date: 'date',
        event: 'event',
        score: 'score',
        tier: 'tier',
        tags: 'tags',
        categories: 'categories',
        why: 'why',
        source: 'source',
        objective: 'objective',
        message: 'message',
        tone: 'tone',
        notes: 'notes',
      };

      Object.keys(map).forEach((key) => {
        const value = params.get(key);
        if (!value) return;
        const targetKey = map[key];
        if (context[targetKey] !== value) {
          context[targetKey] = value;
          changed = true;
        }
      });

      const productionType = params.get('productionType') || params.get('production_type');
      if (productionType) {
        safeSet('edro_studio_production_type', productionType);
      }
    } catch {
      // ignore
    }

    if (context.clientId) {
      safeSet('edro_client_id', context.clientId);
    }

    if (changed) {
      safeSet(contextKey, JSON.stringify(context));
    }

    if ((!context || Object.keys(context).length === 0) && window.EdroStudio?.request) {
      const briefingId = safeGet('edro_briefing_id');
      if (briefingId) {
        try {
          const response = await window.EdroStudio.request(`/edro/briefings/${briefingId}`, { method: 'GET' });
          const briefing = response?.data?.briefing || response?.briefing;
          const payload = briefing?.payload || {};
          const merged = { ...payload };
          if (briefing?.client_name) merged.client = briefing.client_name;
          if (briefing?.client_id) merged.clientId = briefing.client_id;
          if (briefing?.title && !merged.event) merged.event = briefing.title;
          safeSet(contextKey, JSON.stringify(merged));
        } catch {
          // ignore
        }
      }
    }
  };

  const syncStudioInventory = () => {
    const formatsKey = 'edro_selected_formats_by_platform';
    const inventoryKey = 'edro_selected_inventory';
    const platformsKey = 'edro_selected_platforms';
    const legacyKey = 'edro_selected_formats';

    const formatsByPlatform = readJson(formatsKey, {});
    const inventory = readJson(inventoryKey, []);

    const rebuildInventory = (source) => {
      const items = [];
      Object.keys(source || {}).forEach((platform) => {
        const formats = source[platform] || [];
        formats.forEach((format) => {
          if (!format) return;
          items.push({
            id: `${String(platform).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(format)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')}-1`,
            platform,
            platformId: platform,
            format,
            index: 1,
            total: 1,
          });
        });
      });
      safeSet(inventoryKey, JSON.stringify(items));
      safeSet(platformsKey, JSON.stringify(Object.keys(source || {})));
      if (!safeGet('edro_active_platform')) {
        const first = Object.keys(source || {})[0];
        if (first) safeSet('edro_active_platform', first);
      }
    };

    if ((!inventory || !inventory.length) && formatsByPlatform && Object.keys(formatsByPlatform).length) {
      rebuildInventory(formatsByPlatform);
      return;
    }

    if ((!formatsByPlatform || !Object.keys(formatsByPlatform).length)) {
      const legacy = readJson(legacyKey, []);
      if (Array.isArray(legacy) && legacy.length) {
        const next = {};
        legacy.forEach((item) => {
          if (!item) return;
          let platform = '';
          let format = '';
          if (typeof item === 'string') {
            const parts = item.split(':');
            if (parts.length > 1) {
              platform = parts[0].trim();
              format = parts.slice(1).join(':').trim();
            } else {
              format = item.trim();
            }
          } else if (typeof item === 'object') {
            platform = item.platform || item.platformId || '';
            format = item.format || item.name || '';
          }
          if (!platform) platform = 'Instagram';
          if (!format) return;
          if (!next[platform]) next[platform] = [];
          next[platform].push(format);
        });
        if (Object.keys(next).length) {
          safeSet(formatsKey, JSON.stringify(next));
          rebuildInventory(next);
        }
      }
    }
  };

  window.EdroStudio = {
    request,
    getClientId,
    setClientId,
    getToken: () => safeGet('edro_token'),
    setToken: (token) => safeSet('edro_token', token),
    clearSession: () => {
      safeRemove('edro_token');
      safeRemove('edro_refresh');
      safeRemove('edro_user');
    },
  };

  Promise.resolve()
    .then(syncStudioContext)
    .then(syncStudioInventory)
    .catch(() => {});
})();
