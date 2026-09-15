import axios from 'axios';

/**
 * Base Axios Client for AeroTwin-UAV Backend (FastAPI)
 * Configured with VITE_API_BASE_URL and development fallback to http://localhost:8000
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for future authentication or request logging
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log network/backend connection issues gracefully in development
    if (error.code === 'ERR_NETWORK') {
      console.warn('[AeroTwin API] Backend server unreachable at:', API_BASE_URL);
    }
    return Promise.reject(error);
  }
);

export default api;
