import axios from "axios";
import { useAuthStore } from "../stores/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      auth.logout();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message;
  }
  return "Error inesperado";
}
