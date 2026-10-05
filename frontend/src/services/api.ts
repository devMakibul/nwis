/**
 * Axios API client — configured with base URL and auth token injection.
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Inject JWT token from localStorage
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("nwis-auth");
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Handle 401 globally — clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("nwis-auth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
