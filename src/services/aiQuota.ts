import axios from 'axios'
import { api } from './api'

export interface AiQuota {
  unlimited: boolean
  remainingGenerations: number
  remainingRefinements: number
  generationsLimit: number
  refinementsLimit: number
}

export async function fetchAiQuota(): Promise<AiQuota> {
  return (await api.get<AiQuota>('/api/Projects/ai-quota')).data
}

/** Code métier renvoyé par l'API IA (AI_QUOTA_EXCEEDED, AI_SERVICE_BUSY…) et quota à jour éventuel. */
export function readAiError(error: unknown): { code: string | null; quota: AiQuota | null } {
  if (!axios.isAxiosError<{ code?: string; Code?: string; quota?: AiQuota; Quota?: AiQuota }>(error)) return { code: null, quota: null }
  const data = error.response?.data
  return { code: data?.code ?? data?.Code ?? null, quota: data?.quota ?? data?.Quota ?? null }
}
