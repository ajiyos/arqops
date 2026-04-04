import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const platformApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

platformApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("platformAccessToken");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

platformApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("platformRefreshToken");
        if (!refreshToken) throw new Error("No platform refresh token");

        const { data } = await axios.post(`${API_BASE_URL}/api/v1/platform/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        localStorage.setItem("platformAccessToken", newAccessToken);
        localStorage.setItem("platformRefreshToken", data.data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return platformApi(originalRequest);
      } catch {
        localStorage.removeItem("platformAccessToken");
        localStorage.removeItem("platformRefreshToken");
        localStorage.removeItem("platformUser");
        if (typeof window !== "undefined") {
          window.location.href = "/site-admin/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default platformApi;
