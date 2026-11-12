import type {
  ArticleRecord,
  AssessmentRecord,
  AuditLogRecord,
  ChatTurn,
  ContactMessageRecord,
  ImageMetadata,
  ModelVersionRecord,
  PatientContext,
  UserPublic,
} from '../shared/types';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  getHealth: () =>
    requestJson<{ status: string; modelMode: string; geminiConfigured: boolean; timestamp: string }>(
      '/api/health'
    ),

  getMe: () => requestJson<{ user: UserPublic | null }>('/api/auth/me'),

  register: (payload: { email: string; password: string; displayName: string }) =>
    requestJson<{ user: UserPublic }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    requestJson<{ user: UserPublic }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  googleLogin: (idToken: string) =>
    requestJson<{ user: UserPublic }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  logout: () => requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  updateProfile: (payload: {
    displayName: string;
    ageRange?: string;
    defaultRetentionDays: number;
    allowImageStorage: boolean;
  }) =>
    requestJson<{ profile: UserPublic }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  uploadAssessmentImage: (
    file: File,
    consentAccepted: boolean,
    onProgress?: (pct: number) => void
  ): Promise<{ imageId: string; imageMetadata: ImageMetadata }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('consentAccepted', String(consentAccepted));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/assessment/upload');
      xhr.withCredentials = true;

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error || `Upload failed (${xhr.status})`));
          }
        } catch {
          reject(new Error('Unexpected response from upload server.'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during image upload.'));
      xhr.send(formData);
    });
  },

  analyzeAssessment: (payload: {
    imageId: string;
    consentAccepted: boolean;
    storeImageAfterAssessment: boolean;
    patientContext: PatientContext;
  }) =>
    requestJson<{ assessment: AssessmentRecord }>('/api/assessment/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getHistory: () => requestJson<{ assessments: AssessmentRecord[] }>('/api/assessment/history'),

  getAssessment: (id: string) =>
    requestJson<{ assessment: AssessmentRecord }>(`/api/assessment/${encodeURIComponent(id)}`),

  deleteAssessmentImage: (id: string) =>
    requestJson<{ assessment: AssessmentRecord }>(
      `/api/assessment/${encodeURIComponent(id)}/image`,
      { method: 'DELETE' }
    ),

  deleteAssessment: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/assessment/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getArticles: () => requestJson<{ articles: ArticleRecord[] }>('/api/articles'),

  sendChat: (messages: ChatTurn[]) =>
    requestJson<{ reply: string; error?: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),

  submitContact: (payload: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) =>
    requestJson<{ message: ContactMessageRecord }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdminDashboard: () =>
    requestJson<{
      summary: {
        totalUsers: number;
        totalAssessments: number;
        demonstrationAssessments: number;
        activeModelMode: string;
        activeProvider: {
          id: string;
          name: string;
          version: string;
          isClinicallyValidated: boolean;
        };
        geminiConfigured: boolean;
        systemStatus: string;
      };
      modelVersions: ModelVersionRecord[];
      users: Array<{
        id: string;
        displayName: string;
        email: string;
        role: 'patient' | 'admin';
        authProvider: 'local' | 'google';
        createdAt: string;
      }>;
      articles: ArticleRecord[];
      errorLogs: AuditLogRecord[];
      recentAuditLogs: AuditLogRecord[];
      contactMessages: ContactMessageRecord[];
    }>('/api/admin/dashboard'),

  updateUserRole: (userId: string, role: 'patient' | 'admin') =>
    requestJson<{ user: UserPublic }>(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  createArticle: (payload: {
    title: string;
    category: string;
    readTime: string;
    summary: string;
    content: string;
    medicalSource: string;
  }) =>
    requestJson<{ article: ArticleRecord }>('/api/admin/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteArticle: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/admin/articles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
