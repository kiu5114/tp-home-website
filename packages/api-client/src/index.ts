/**
 * 共享请求层（开发技术文档 §6.4、§9.4；UI/UX §7.1 SEED 兜底）。
 *
 * - 统一响应信封解包：后端返回 {code,message,data}，成功取 data。
 * - 401 自动用 refresh 换 access；refresh 失效则清 token 跳登录。
 * - 403 抛出无权限。
 * - safeGet：后端不可达时返回本地兜底数据（SEED 兜底，离线友好）。
 *
 * 基址通过 VITE_API_BASE 注入（dev 默认 http://127.0.0.1:8000，避 Windows localhost→IPv6）。
 */
import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";

const ACCESS_KEY = "tp_access_token";
const REFRESH_KEY = "tp_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}
export function getTokens(): { access: string | null; refresh: string | null } {
  return { access: localStorage.getItem(ACCESS_KEY), refresh: localStorage.getItem(REFRESH_KEY) };
}
export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const http: AxiosInstance = axios.create({ baseURL: API_BASE, withCredentials: false });

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

async function doRefresh(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;
  try {
    const resp = await axios.post(`${API_BASE}/api/admin/refresh`, { refresh_token: refresh });
    const data = resp.data?.data;
    if (data?.access_token) {
      setTokens(data.access_token, refresh);
      return data.access_token;
    }
  } catch {
    clearTokens();
  }
  return null;
}

function redirectLogin(): void {
  if (typeof location !== "undefined" && location.pathname.startsWith("/admin") && !location.pathname.includes("/login")) {
    location.href = "/admin/login";
  }
}

http.interceptors.response.use(
  async (resp: AxiosResponse) => {
    const body = resp.data;
    if (body && typeof body === "object" && "code" in body) {
      if (body.code === 0) return body.data;
      if (body.code === 401) {
        const token = await doRefresh();
        if (token) {
          resp.config.headers.set("Authorization", `Bearer ${token}`);
          return http(resp.config);
        }
        clearTokens();
        redirectLogin();
        throw new Error(body.message || "未授权");
      }
      if (body.code === 403) throw new Error(body.message || "无权限");
      throw new Error(body.message || "请求失败");
    }
    return body;
  },
  (error) => {
    throw error;
  }
);

export const api = {
  get: <T = any>(url: string, params?: Record<string, any>): Promise<T> =>
    http.get(url, { params }).then((r: any) => r),
  post: <T = any>(url: string, data?: any): Promise<T> => http.post(url, data).then((r: any) => r),
  put: <T = any>(url: string, data?: any): Promise<T> => http.put(url, data).then((r: any) => r),
  del: <T = any>(url: string): Promise<T> => http.delete(url).then((r: any) => r),
  /** multipart 文件上传：Content-Type 由浏览器自动设置 boundary。 */
  upload: <T = any>(url: string, file: File, field = "file"): Promise<T> => {
    const fd = new FormData();
    fd.append(field, file);
    return http.post(url, fd).then((r: any) => r);
  },
};

/** SEED 兜底：请求失败时返回本地静态数据（离线可用，UI/UX §7.1）。 */
export async function safeGet<T = any>(url: string, params?: Record<string, any>, fallback?: T): Promise<T> {
  try {
    return await api.get<T>(url, params);
  } catch {
    if (fallback !== undefined) return fallback;
    throw new Error("网络异常");
  }
}

export { API_BASE };
export default api;
