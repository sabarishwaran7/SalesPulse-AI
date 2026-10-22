import {
  Conversation,
  DashboardAnalytics,
  ImportDiffPreview,
  ActionRecommendation
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; database: string; has_groq_api_key: boolean }>('/health'),

  // Analytics
  getDashboardAnalytics: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<DashboardAnalytics>(`/analytics/dashboard?${query}`);
  },

  // Conversations
  listConversations: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{
      items: Conversation[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>(`/conversations?${query}`);
  },

  getConversationDetails: (id: number) =>
    request<Conversation>(`/conversations/${id}`),

  updateTranscript: (id: number, transcript: string) =>
    request<{ success: boolean; message: string; completeness_score: number }>(
      `/conversations/${id}/transcript`,
      {
        method: 'POST',
        body: JSON.stringify({ transcript }),
      }
    ),

  updateConversation: (id: number, data: Partial<Conversation>) =>
    request<{ success: boolean; message: string }>(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteConversation: (id: number) =>
    request<{ success: boolean; message: string }>(`/conversations/${id}`, {
      method: 'DELETE',
    }),

  // Smart Import
  previewImport: async (file: File): Promise<ImportDiffPreview> => {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API_BASE}/imports/preview`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return response.json();
  },

  commitImport: (jobId: number, action: 'commit' | 'cancel', conflictResolutions: Record<string, string> = {}) =>
    request<{ success: boolean; message: string }>(`/imports/commit`, {
      method: 'POST',
      body: JSON.stringify({
        job_id: jobId,
        action,
        conflict_resolutions: conflictResolutions,
      }),
    }),

  getImportHistory: () => request<any[]>('/imports/history'),

  getImportErrors: (jobId: number) => request<any[]>(`/imports/${jobId}/errors`),

  // AI Review Center
  getAIReviewQueue: () => request<any[]>('/ai-review/queue'),

  reviewAIConversation: (
    id: number,
    payload: {
      review_action: 'approve' | 'correct';
      purposes_to_add?: string[];
      purposes_to_remove?: string[];
      edited_summary?: string;
      notes?: string;
    }
  ) =>
    request<{ success: boolean; message: string }>(`/ai-review/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reanalyzeConversation: (id: number) =>
    request<{ success: boolean; message: string }>(`/ai-review/${id}/reanalyze`, {
      method: 'POST',
    }),

  // Actions
  listActions: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<ActionRecommendation[]>(`/actions?${query}`);
  },

  updateActionStatus: (id: number, status: string) =>
    request<{ success: boolean }>(`/actions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Settings & Data Seed
  getSettings: () => request<any>('/settings'),

  updateSettings: (data: { groq_api_key?: string; groq_model?: string; confidence_threshold?: number }) =>
    request<{ success: boolean; message: string }>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  seedSampleData: () =>
    request<{ success: boolean; message: string }>('/settings/seed-sample-data', {
      method: 'POST',
    }),

  // Export URL helper
  getExportUrl: (reportType: string, format: 'csv' | 'xlsx', filters: Record<string, string> = {}) => {
    const params = new URLSearchParams({ report_type: reportType, format, ...filters });
    return `${API_BASE}/reports/export?${params.toString()}`;
  },
};
