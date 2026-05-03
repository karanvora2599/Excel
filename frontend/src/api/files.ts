import api from './client'
import type { UploadedFile } from '../types'

export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<UploadedFile>('/files/upload', form)
  return data
}

export async function listFiles(): Promise<UploadedFile[]> {
  const { data } = await api.get<UploadedFile[]>('/files')
  return data
}

export async function getFilePreview(fileId: string, sheet: string) {
  const { data } = await api.get(`/files/${fileId}/sheets/${encodeURIComponent(sheet)}/preview`)
  return data as { sheet: string; row_count: number; schema: unknown[]; preview: Record<string, unknown>[] }
}

export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/files/${fileId}`)
}
