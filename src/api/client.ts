const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function clearToken(): void {
  localStorage.removeItem('token')
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request<{ token: string }>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  uploadPdfs: (files: File[], topicId?: string) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    if (topicId) form.append('topic_id', topicId)
    return request<{ results: Array<{ file: string; status: string; docId?: string; error?: string }> }>(
      '/documents/upload',
      { method: 'POST', body: form }
    )
  },

  getDocuments: (topicId?: string) =>
    request<DocumentRow[]>(`/documents${topicId ? `?topic_id=${topicId}` : ''}`),

  getJobStats: () =>
    request<Record<string, number>>('/jobs/stats'),

  getDocument: (id: string) =>
    request<unknown>(`/documents/${id}`),

  getDomainBySlug: (slug: string) =>
    request<unknown>(`/domains/${slug}`),

  getDomains: () =>
    request<unknown[]>('/domains'),

  retryDocument: (id: string) =>
    request<{ok: boolean}>(`/documents/${id}/retry`, { method: 'POST' }),

  getTopics: () =>
    request<Topic[]>('/topics'),
}

export interface DocumentRow {
  id: string
  title: string | null
  year: number | null
  journal: string | null
  file_name: string
  n_grade: string | null
  validation_status: string | null
  job_status: string | null
  job_error: string | null
  attempt_count: number | null
  domains: string[]
}

export interface Topic {
  id: string
  slug: string
  label: string
}
