import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function isAnonymousAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  let path = url.replace(/^https?:\/\/[^/]+/, "");
  const q = path.indexOf("?");
  if (q !== -1) path = path.slice(0, q);
  return (
    path.endsWith("/api/v1/auth/login") ||
    path.endsWith("/api/v1/auth/refresh") ||
    path.endsWith("/api/v1/tenant")
  );
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    const reqUrl = config.url ?? "";
    const skipAuth =
      isAnonymousAuthRequest(reqUrl) ||
      (config.baseURL && isAnonymousAuthRequest(`${config.baseURL}${reqUrl}`));
    if (token && !skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.clear();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
