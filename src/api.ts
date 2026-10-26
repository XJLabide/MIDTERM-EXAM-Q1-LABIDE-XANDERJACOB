import type { NewQueueEntry, QueueEntry } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with status ${response.status}.`)
  }

  return payload as T
}

export function getQueue(): Promise<QueueEntry[]> {
  return request<QueueEntry[]>('/api/queue')
}

export function getQueueEntry(id: number): Promise<QueueEntry> {
  return request<QueueEntry>(`/api/queue/${id}`)
}

export function createQueueEntry(entry: NewQueueEntry): Promise<QueueEntry> {
  return request<QueueEntry>('/api/queue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  })
}

export function deleteQueueEntry(id: number): Promise<{ message: string; deleted: QueueEntry }> {
  return request<{ message: string; deleted: QueueEntry }>(`/api/queue/${id}`, {
    method: 'DELETE',
  })
}
