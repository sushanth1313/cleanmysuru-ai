/**
 * CleanMysuru AI — Frontend API Service Layer
 * Connects frontend to the Node/Express backend at NEXT_PUBLIC_API_URL
 */

import { getErrorMessage } from './utils';

export function resolveApiBase(): string {
  let raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();

  // Defensively strip accidentally pasted MongoDB connection strings
  if (raw.includes('mongodb+srv://') || raw.includes('mongodb://')) {
    console.warn(
      '[cleanmysuru-ai] Detected MongoDB URI accidentally provided in NEXT_PUBLIC_API_URL. Stripping invalid database connection string.'
    );
    raw = raw.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '').trim();
  }

  // Strip trailing slashes
  raw = raw.replace(/\/+$/, '').trim();

  // If empty or invalid:
  if (!raw || !raw.startsWith('http')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // Production browser runtime default to active Render backend
      return 'https://cleanmysuru-ai.onrender.com/api';
    }
    return 'http://localhost:5000/api';
  }

  // Ensure /api suffix
  if (!raw.endsWith('/api')) {
    raw = `${raw}/api`;
  }

  return raw;
}

export const API_BASE = resolveApiBase();
export const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/* ── Structured API Errors ───────────────────────────────────────── */

export type ApiErrorCode =
  | 'NETWORK_FAILURE'
  | 'HTTP_ERROR'
  | 'AI_ANALYSIS_FAILED'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'BACKEND_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  details?: any;

  constructor(message: string, code: ApiErrorCode, status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('cleanmysuru-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err: any) {
    const isNetworkFailure =
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      (typeof err?.message === 'string' && (err.message.includes('fetch') || err.message.includes('Failed')));

    if (isNetworkFailure) {
      throw new ApiError(
        `Unable to reach backend server at ${API_BASE}. Please verify that the backend is active and CORS is configured.`,
        'NETWORK_FAILURE',
        0,
        { originalError: err?.message, url }
      );
    }
    throw err;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json();
  }

  let errorBody: any = null;
  try {
    errorBody = await res.json();
  } catch {
    try {
      errorBody = { message: await res.text() };
    } catch {
      errorBody = {};
    }
  }

  const backendCode = errorBody?.error?.code || errorBody?.code;
  const backendMsg = errorBody?.error?.message || errorBody?.message;

  if (res.status === 401 || res.status === 403) {
    throw new ApiError(backendMsg || 'Unauthorized', 'AUTH_ERROR', res.status, errorBody);
  }
  if (res.status === 409) {
    throw new ApiError(backendMsg || 'An account with this email already exists.', 'VALIDATION_ERROR', res.status, errorBody);
  }
  if (res.status === 400 || res.status === 422) {
    throw new ApiError(backendMsg || 'Validation Error', 'VALIDATION_ERROR', res.status, errorBody);
  }
  if (res.status === 503) {
    throw new ApiError(backendMsg || 'Service temporarily unavailable. Database is connecting.', 'BACKEND_UNAVAILABLE', res.status, errorBody);
  }
  if (res.status >= 500) {
    throw new ApiError(backendMsg || 'Server Error', 'HTTP_ERROR', res.status, errorBody);
  }
  throw new ApiError(backendMsg || `Request failed with status ${res.status}`, 'HTTP_ERROR', res.status, errorBody);
}

export function normalizeImagePath(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  const clean = imagePath.replace(/\\/g, '/');
  if (clean.startsWith('/uploads/')) {
    return `${BACKEND_ORIGIN}${clean}`;
  }
  if (clean.startsWith('uploads/')) {
    return `${BACKEND_ORIGIN}/${clean}`;
  }
  return `${BACKEND_ORIGIN}/uploads/${clean.replace(/^\//, '')}`;
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });
    return handleResponse<any>(res);
  },

  async register(userData: { name: string; email: string; password: string; phone?: string }) {
    const res = await apiFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData),
    });
    return handleResponse<any>(res);
  },

  async logout() {
    const res = await apiFetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async getMe() {
    const res = await apiFetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async updateProfile(profile: { name?: string; phone?: string }) {
    const res = await apiFetch(`${API_BASE}/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify(profile),
    });
    return handleResponse<any>(res);
  },

  async updatePassword(passwords: { currentPassword: string; newPassword: string }) {
    const res = await apiFetch(`${API_BASE}/auth/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify(passwords),
    });
    return handleResponse<any>(res);
  },

  // Canonical Complaints API
  async createComplaint(formData: FormData) {
    const res = await apiFetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      credentials: 'include',
      body: formData,
    });
    return handleResponse<any>(res);
  },

  async getComplaints(params: Record<string, string | number | boolean> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const url = `${API_BASE}/complaints?${searchParams.toString()}`;
    const res = await apiFetch(url, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  // Compatibility alias for existing getIncidents calls
  async getIncidents(params: Record<string, string | number | boolean> = {}) {
    return this.getComplaints(params);
  },

  async getComplaintById(id: string) {
    const res = await apiFetch(`${API_BASE}/complaints/${id}`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async getIncidentById(id: string) {
    return this.getComplaintById(id);
  },

  async getIncident(id: string) {
    return this.getComplaintById(id);
  },

  async updateComplaintStatus(id: string, status: string, notes?: string, assignedTo?: string) {
    const res = await apiFetch(`${API_BASE}/complaints/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({ status, notes, assignedTo }),
    });
    return handleResponse<any>(res);
  },

  // Admin completion evidence
  async markWorkDone(id: string, formData: FormData) {
    const res = await apiFetch(`${API_BASE}/complaints/${id}/work-done`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      credentials: 'include',
      body: formData,
    });
    return handleResponse<any>(res);
  },

  // Citizen confirms resolution
  async confirmResolution(id: string) {
    const res = await apiFetch(`${API_BASE}/complaints/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  // Citizen reopens complaint
  async reopenComplaint(id: string, reason: string) {
    const res = await apiFetch(`${API_BASE}/complaints/${id}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    return handleResponse<any>(res);
  },

  // Dashboards
  async getCitizenDashboard() {
    const res = await apiFetch(`${API_BASE}/dashboard/citizen`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async getAdminDashboard() {
    const res = await apiFetch(`${API_BASE}/dashboard/admin`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async getStatsSummary(isDemo: boolean = false) {
    try {
      const res = await this.getAdminDashboard();
      const m = res.data?.metrics || res.metrics || {};
      return {
        newComplaints: m.open || 0,
        pendingReview: m.needsReview || 0,
        inProgress: m.open || 0,
        cleaned: m.resolved || 0,
        reopened: m.reopened || 0,
        resolved: m.resolved || 0,
        total: m.total || 0,
        active: m.open || 0,
      };
    } catch {
      return {
        newComplaints: 0,
        pendingReview: 0,
        inProgress: 0,
        cleaned: 0,
        reopened: 0,
        resolved: 0,
        total: 0,
        active: 0,
      };
    }
  },

  // Map & Location Search
  async getMapComplaints(params: Record<string, string | number> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const res = await apiFetch(`${API_BASE}/map/complaints?${searchParams.toString()}`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async searchLocations(query: string) {
    if (!query || query.trim().length < 2) return { success: true, results: [] };
    const res = await apiFetch(`${API_BASE}/map/search?q=${encodeURIComponent(query.trim())}`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<{ success: boolean; count: number; results: Array<{ display_name: string; lat: number; lng: number; locality: string; city: string; state: string }> }>(res);
  },

  async reverseGeocode(lat: number, lng: number) {
    const res = await apiFetch(`${API_BASE}/map/reverse?lat=${lat}&lng=${lng}`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<{ success: boolean; display_name: string; locality: string; city: string; state: string; lat: number; lng: number }>(res);
  },

  // Notifications
  async getNotifications() {
    const res = await apiFetch(`${API_BASE}/notifications`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async markNotificationRead(id: string) {
    const res = await apiFetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async markNotificationAsRead(id: string) {
    return this.markNotificationRead(id);
  },

  async markAllNotificationsRead() {
    const res = await apiFetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async markAllNotificationsAsRead() {
    return this.markAllNotificationsRead();
  },

  // Admin Audit Logs & Health
  async getAuditLogs(params: Record<string, string | number> = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const res = await apiFetch(`${API_BASE}/admin/audit-logs?${searchParams.toString()}`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async getSystemHealth() {
    const res = await apiFetch(`${API_BASE}/admin/system-health`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },
};
