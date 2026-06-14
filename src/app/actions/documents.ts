'use server'

import { after } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createDocumentSchema = z.object({
  workspaceId:   z.uuid(),
  workspaceSlug: z.string().min(1),
  name:          z.string().min(1).max(500),
  storagePath:   z.string().min(1),
  mimeType:      z.string().min(1),
  sizeBytes:     z.number().int().positive(),
})

export type CreateDocumentParams = z.infer<typeof createDocumentSchema>

export async function createDocument(
  params: CreateDocumentParams,
): Promise<{ error?: string }> {
  const parsed = createDocumentSchema.safeParse(params)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { workspaceId, name, storagePath, mimeType, sizeBytes } = parsed.data

  const { data: doc, error: insertError } = await supabase
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      uploaded_by:  user.id,
      name,
      storage_path: storagePath,
      mime_type:    mimeType,
      size_bytes:   sizeBytes,
      status:       'pending',
    })
    .select('id')
    .single()

  if (insertError || !doc) return { error: insertError?.message ?? 'Insert failed' }

  // Trigger the processing route after the response is sent.
  // The route handler owns maxDuration and runs independently of this request.
  // In production a Supabase Database Webhook also fires on INSERT, providing a
  // reliability backstop. Both calls are safe — processDocument is idempotent.
  const docId = doc.id
  after(async () => {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const secret = process.env.PROCESS_WEBHOOK_SECRET
    try {
      const res = await fetch(`${base}/api/jobs/process-document`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ documentId: docId }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('[createDocument] processing route returned', res.status, text, { docId })
      }
    } catch (err) {
      console.error('[createDocument] failed to reach processing route', { docId, err })
    }
  })

  return {}
}
