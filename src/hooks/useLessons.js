import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/apiClient'
import { getUserIdentity } from '../lib/userIdentity'

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function toQuery(filters = {}) {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === '') return
    query.set(key, String(value))
  })
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

export function useLessons() {
  const { user } = useAuth()
  const identity = useMemo(() => getUserIdentity(user), [user])

  return {
    identity,
    async listLessons(filters = {}) {
      return apiRequest(`/api/lessons${toQuery(filters)}`, { method: 'GET', identity })
    },
    async getLesson(id) {
      return apiRequest(`/api/lessons?id=${encodeURIComponent(id)}`, { method: 'GET', identity })
    },
    async uploadText(payload) {
      return apiRequest('/api/lessons?action=upload-text', {
        method: 'POST',
        identity,
        body: payload,
      })
    },
    async uploadFile(file) {
      const fileBase64 = await fileToBase64(file)
      return apiRequest('/api/lessons?action=upload-file', {
        method: 'POST',
        identity,
        body: {
          file_name: file.name,
          file_type: file.type?.includes('pdf') || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
          file_base64: fileBase64,
        },
      })
    },
    async processAi(payload) {
      return apiRequest('/api/lessons?action=process-ai', {
        method: 'POST',
        identity,
        body: payload,
      })
    },
    async createLesson(payload) {
      return apiRequest('/api/lessons', {
        method: 'POST',
        identity,
        body: payload,
      })
    },
    async updateLesson(id, patch) {
      return apiRequest(`/api/lessons?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        identity,
        body: patch,
      })
    },
    async deleteLesson(id) {
      return apiRequest(`/api/lessons?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        identity,
      })
    },
    async completeLesson(id) {
      return apiRequest('/api/lessons?action=complete', {
        method: 'POST',
        identity,
        body: { lesson_id: id },
      })
    },
    async reprocessLesson(id, rawText) {
      return apiRequest('/api/lessons?action=reprocess', {
        method: 'POST',
        identity,
        body: { lesson_id: id, raw_text: rawText },
      })
    },
    async saveVocabulary(id, itemIds = []) {
      return apiRequest('/api/lessons?action=save-vocabulary', {
        method: 'POST',
        identity,
        body: { lesson_id: id, item_ids: itemIds },
      })
    },
    async saveGrammar(id, itemIds = []) {
      return apiRequest('/api/lessons?action=save-grammar', {
        method: 'POST',
        identity,
        body: { lesson_id: id, item_ids: itemIds },
      })
    },
    async saveKanji(id, itemIds = []) {
      return apiRequest('/api/lessons?action=save-kanji', {
        method: 'POST',
        identity,
        body: { lesson_id: id, item_ids: itemIds },
      })
    },
    async generateReviewSession(id) {
      return apiRequest('/api/lessons?action=generate-review', {
        method: 'POST',
        identity,
        body: { lesson_id: id },
      })
    },
  }
}
