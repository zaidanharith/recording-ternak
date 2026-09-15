import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("rt_token") : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Requests made with responseType: "blob" (file downloads) still get their
    // error body typed as a Blob, so error.response.data.message is unreadable
    // unless we parse it back out here — otherwise every failure looks generic.
    if (error.response?.data instanceof Blob && error.response.data.type.includes("json")) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // leave error.response.data as-is if it wasn't actually JSON
      }
    }

    if (
      typeof window !== "undefined" &&
      error.response?.status === 401 &&
      window.location.pathname !== "/"
    ) {
      localStorage.removeItem("rt_token");
      localStorage.removeItem("rt_admin");
      window.location.href = "/";
    }

    return Promise.reject(error);
  },
);
