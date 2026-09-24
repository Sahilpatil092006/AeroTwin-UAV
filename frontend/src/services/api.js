import axios from 'axios';

/**
 * Base Axios Client for AeroTwin-UAV Backend (FastAPI)
 * Configured with VITE_API_BASE_URL and development fallback to http://localhost:8000
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.warn('[AeroTwin API] Backend server unreachable at:', API_BASE_URL);
    }
    return Promise.reject(error);
  }
);

/**
 * Health API Service
 */
export const healthApi = {
  check: async () => {
    const res = await api.get('/api/health');
    return res.data;
  },
};

/**
 * Simulation API Service
 */
export const simulationApi = {
  start: async (params) => {
    const res = await api.post('/api/simulation/start', params);
    return res.data;
  },
  injectFault: async (params) => {
    const res = await api.post('/api/simulation/fault', params);
    return res.data;
  },
  getCurrent: async () => {
    const res = await api.get('/api/simulation/current');
    return res.data;
  },
};

/**
 * Digital Twin API Service
 */
export const digitalTwinApi = {
  getStatus: async () => {
    const res = await api.get('/api/digital-twin/status');
    return res.data;
  },
  getHealth: async () => {
    const res = await api.get('/api/digital-twin/health');
    return res.data;
  },
  getDeviation: async () => {
    const res = await api.get('/api/digital-twin/deviation');
    return res.data;
  },
};

/**
 * AI Inference API Service
 */
export const aiApi = {
  predict: async (telemetry) => {
    const res = await api.post('/api/ai/predict', telemetry);
    return res.data;
  },
  anomaly: async (telemetry) => {
    const res = await api.post('/api/ai/anomaly', telemetry);
    return res.data;
  },
  rul: async (telemetry) => {
    const res = await api.post('/api/ai/rul', telemetry);
    return res.data;
  },
  getExplanation: async () => {
    const res = await api.get('/api/ai/explanation');
    return res.data;
  },
};

/**
 * Mission Decision API Service
 */
export const missionApi = {
  getRisk: async (params = {}) => {
    const res = await api.get('/api/mission/risk', { params });
    return res.data;
  },
  evaluateWhatIf: async (scenarioData = {}) => {
    try {
      const res = await api.post('/api/mission/what-if', scenarioData);
      return res.data;
    } catch (err) {
      if (typeof fetch !== 'undefined') {
        const fallbackUrl = `${API_BASE_URL || 'http://localhost:8000'}/api/mission/what-if`;
        try {
          const fallbackRes = await fetch(fallbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(scenarioData),
          });
          if (fallbackRes.ok) {
            return await fallbackRes.json();
          }
        } catch (fetchErr) {
          console.warn('[missionApi.evaluateWhatIf] Fallback fetch failed:', fetchErr.message);
        }
      }
      throw err;
    }
  },
};

/**
 * Emergency Return-to-Base (RTB) API Service
 */
export const rtbApi = {
  getStatus: async (uavId = 'UAV-001') => {
    const cleanId = (uavId || 'UAV-001').trim().toUpperCase();
    try {
      const res = await api.get('/api/rtb/status', { params: { uav_id: cleanId } });
      return res.data;
    } catch (err) {
      if (typeof fetch !== 'undefined') {
        try {
          const fallbackRes = await fetch(`/api/rtb/status?uav_id=${encodeURIComponent(cleanId)}`, {
            headers: { Accept: 'application/json' },
          });
          if (fallbackRes.ok) {
            return await fallbackRes.json();
          }
        } catch (fetchErr) {
          console.debug('[rtbApi] Proxy fetch fallback failed:', fetchErr.message);
        }
      }
      throw err;
    }
  },
};

/**
 * Multi-UAV & Fleet API Service
 */
export const fleetApi = {
  getAllUavStates: async () => {
    try {
      const res = await api.get('/api/uav/all');
      return res.data;
    } catch (err) {
      if (typeof fetch !== 'undefined') {
        const fallbackUrl = `${API_BASE_URL || 'http://localhost:8000'}/api/uav/all`;
        try {
          const fallbackRes = await fetch(fallbackUrl, {
            headers: { Accept: 'application/json' },
          });
          if (fallbackRes.ok) {
            return await fallbackRes.json();
          }
        } catch (fetchErr) {
          console.warn('[fleetApi] Fallback fetch also failed:', fetchErr.message);
        }
      }
      throw err;
    }
  },
  getUavState: async (uavId = 'UAV-001') => {
    const res = await api.get(`/api/uav/${uavId}/state`);
    return res.data;
  },
  listUavs: async () => {
    const res = await api.get('/api/uav/list');
    return res.data;
  },
};

/**
 * Reports & Flight History API Service
 */
export const reportsApi = {
  getHistory: async (uavId = 'UAV-001', limit = 100) => {
    try {
      const res = await api.get(`/api/reports/${uavId}/history?limit=${limit}`);
      return res.data;
    } catch (err) {
      if (typeof fetch !== 'undefined') {
        const fallbackUrl = `${API_BASE_URL || 'http://localhost:8000'}/api/reports/${uavId}/history?limit=${limit}`;
        try {
          const fallbackRes = await fetch(fallbackUrl, {
            headers: { Accept: 'application/json' },
          });
          if (fallbackRes.ok) {
            return await fallbackRes.json();
          }
        } catch (fetchErr) {
          console.debug('[reportsApi] Fallback fetch failed:', fetchErr.message);
        }
      }
      throw err;
    }
  },
  getSummary: async (uavId = 'UAV-001') => {
    try {
      const res = await api.get(`/api/reports/${uavId}/summary`);
      return res.data;
    } catch (err) {
      if (typeof fetch !== 'undefined') {
        const fallbackUrl = `${API_BASE_URL || 'http://localhost:8000'}/api/reports/${uavId}/summary`;
        try {
          const fallbackRes = await fetch(fallbackUrl, {
            headers: { Accept: 'application/json' },
          });
          if (fallbackRes.ok) {
            return await fallbackRes.json();
          }
        } catch (fetchErr) {
          console.debug('[reportsApi] Fallback fetch failed:', fetchErr.message);
        }
      }
      throw err;
    }
  },
};

export default api;


