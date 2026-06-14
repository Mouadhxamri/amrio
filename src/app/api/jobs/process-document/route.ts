import { type NextRequest, NextResponse } from 'next/server'
import { processDocument } from '@/lib/documents/process'

// Allow up to 5 minutes. On Vercel Pro set maxDuration in vercel.json or here;
// on the free tier this is capped at the platform default.
export const maxDuration = 300
export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.PROCESS_WEBHOOK_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let documentId: string | undefined
  try {
    const body = await request.json()
    // Accept both a direct call ({ documentId }) and a Supabase Database
    // Webhook payload ({ type, record: { id } }).
    documentId = body?.documentId ?? body?.record?.id
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!documentId || typeof documentId !== 'string') {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
  }

  await processDocument(documentId)
  return NextResponse.json({ ok: true })
}
