import { createAdminClient } from '@/lib/supabase/admin'

// ─── Limits ───────────────────────────────────────────────────────────────────

// Conservative interim cap for plain-text/Markdown files. Even with the Route
// Handler's extended maxDuration, large plaintext files risk in-memory chunk
// explosion (a 50 MB file → ~50 000 chunks × strings) and long batch-insert
// chains. Raise this incrementally once real large-file processing is validated
// end-to-end with memory and timing measurements.
const MAX_PLAINTEXT_BYTES = 10 * 1024 * 1024 // 10 MB — interim, not a proven ceiling

// Rows sent per Supabase insert call. Keeps each request body well under
// PostgREST's body-size limit even for documents near the size ceiling.
const CHUNK_INSERT_BATCH = 500

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Supabase PostgrestError is a plain object, not an Error instance.
// This helper extracts a useful message from either.
function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Processing failed'
}

// ─── Text extraction ──────────────────────────────────────────────────────────

function extractPlainText(buf: Buffer): string {
  return buf.toString('utf-8')
}

function extractCsvText(buf: Buffer): string {
  const lines = buf.toString('utf-8').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return lines.join('\n')

  const headers = parseCSVRow(lines[0])
  return lines
    .slice(1)
    .map((line) => {
      const vals = parseCSVRow(line)
      return headers.map((h, i) => `${h}: ${vals[i] ?? ''}`).join(' | ')
    })
    .join('\n')
}

function parseCSVRow(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  fields.push(cur.trim())
  return fields
}

function extractJsonText(buf: Buffer): string {
  const raw = buf.toString('utf-8')
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => JSON.stringify(item, null, 2)).join('\n\n')
    }
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

async function extractPdfText(buf: Buffer): Promise<string> {
  // pdf-parse v2 is class-based: new PDFParse({ data }) then .getText().
  // Dynamic import + serverExternalPackages keeps it out of the Next.js bundle.
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buf })
  const result = await parser.getText()
  return result.text
}

async function extractText(buf: Buffer, mimeType: string): Promise<string> {
  switch (mimeType) {
    case 'text/plain':
    case 'text/markdown':
      if (buf.length > MAX_PLAINTEXT_BYTES) {
        throw new Error(
          `Text file too large to process safely ` +
          `(${(buf.length / 1024 / 1024).toFixed(1)} MB; ` +
          `maximum is ${(MAX_PLAINTEXT_BYTES / 1024 / 1024).toFixed(0)} MB).`,
        )
      }
      return extractPlainText(buf)
    case 'text/csv':
      return extractCsvText(buf)
    case 'application/json':
      return extractJsonText(buf)
    case 'application/pdf':
      return extractPdfText(buf)
    default:
      throw new Error(
        `Unsupported MIME type for text extraction: ${mimeType}. ` +
          'DOCX/DOC parsing will be added in a future update.',
      )
  }
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

const MAX_CHUNK_CHARS = 1000
const MIN_CHUNK_CHARS = 60

function chunkText(text: string): string[] {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= MIN_CHUNK_CHARS)

  const chunks: string[] = []

  for (const para of paragraphs) {
    if (para.length <= MAX_CHUNK_CHARS) {
      chunks.push(para)
      continue
    }
    // Paragraph too long — split by single newlines first, then by hard limit.
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean)
    let cur = ''
    for (const line of lines) {
      const joined = cur ? `${cur}\n${line}` : line
      if (joined.length > MAX_CHUNK_CHARS) {
        if (cur) chunks.push(cur)
        // If a single line is still over the limit, slice it.
        if (line.length > MAX_CHUNK_CHARS) {
          for (let i = 0; i < line.length; i += MAX_CHUNK_CHARS) {
            const slice = line.slice(i, i + MAX_CHUNK_CHARS).trim()
            if (slice.length >= MIN_CHUNK_CHARS) chunks.push(slice)
          }
          cur = ''
        } else {
          cur = line
        }
      } else {
        cur = joined
      }
    }
    if (cur.length >= MIN_CHUNK_CHARS) chunks.push(cur)
  }

  // Fallback: paragraph splitting found nothing (e.g. the whole document is
  // shorter than MIN_CHUNK_CHARS, or has no blank lines). Hard-slice the full
  // text so we always emit at least one chunk for any non-empty input.
  if (chunks.length === 0) {
    const whole = text.replace(/\r\n/g, '\n').trim()
    for (let i = 0; i < whole.length; i += MAX_CHUNK_CHARS) {
      const slice = whole.slice(i, i + MAX_CHUNK_CHARS).trim()
      if (slice) chunks.push(slice)
    }
  }

  return chunks
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function processDocument(documentId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('id, workspace_id, storage_path, mime_type, status')
    .eq('id', documentId)
    .single()

  if (!doc || doc.status !== 'pending') {
    console.log('[processDocument] skip — not found or not pending', { documentId, status: doc?.status })
    return
  }

  try {
    console.log('[processDocument] marking processing', documentId)
    const { error: processingErr } = await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)
    if (processingErr) throw processingErr

    const { data: fileBlob, error: dlError } = await supabase.storage
      .from('documents')
      .download(doc.storage_path)

    if (dlError || !fileBlob) throw dlError ?? new Error('Storage download returned no data')

    const buf = Buffer.from(await fileBlob.arrayBuffer())
    console.log('[processDocument] downloaded', buf.length, 'bytes', doc.storage_path)

    const text = await extractText(buf, doc.mime_type)
    if (!text.trim()) throw new Error('No readable text found in document')
    console.log('[processDocument] text extracted', text.length, 'chars')

    const chunks = chunkText(text)
    if (chunks.length === 0) throw new Error('Chunker produced no output')
    console.log('[processDocument] chunks created', chunks.length)

    // Insert in batches — builds each batch's rows inline to avoid allocating
    // a single large array for the full chunk set.
    const totalBatches = Math.ceil(chunks.length / CHUNK_INSERT_BATCH)
    for (let b = 0; b < chunks.length; b += CHUNK_INSERT_BATCH) {
      const batchNum = Math.floor(b / CHUNK_INSERT_BATCH) + 1
      const batchChunks = chunks.slice(b, b + CHUNK_INSERT_BATCH)
      console.log(`[processDocument] inserting batch ${batchNum}/${totalBatches} (${batchChunks.length} rows)`)
      const batchRows = batchChunks.map((content, j) => ({
        document_id:  doc.id,
        workspace_id: doc.workspace_id,
        chunk_index:  b + j,
        content,
        token_count: Math.ceil(content.length / 4),
      }))
      const { error: insertError } = await supabase.from('document_chunks').insert(batchRows)
      if (insertError) throw insertError
    }
    console.log('[processDocument] all chunks inserted', chunks.length, 'total')

    console.log('[processDocument] setting ready')
    const { error: readyErr } = await supabase
      .from('documents')
      .update({ status: 'ready', error_message: null, chunk_count: chunks.length })
      .eq('id', documentId)
    if (readyErr) throw readyErr
    console.log('[processDocument] done — ready')
  } catch (err) {
    console.error('[processDocument] caught error', err)
    const { error: delErr } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)
    if (delErr) console.error('[processDocument] failed to delete partial chunks', delErr)

    const { error: errStatusErr } = await supabase
      .from('documents')
      .update({
        status: 'error',
        chunk_count: 0,
        error_message: errMsg(err),
      })
      .eq('id', documentId)
    if (errStatusErr) console.error('[processDocument] failed to set error status', errStatusErr)
    else console.log('[processDocument] done — error')
  }
}
