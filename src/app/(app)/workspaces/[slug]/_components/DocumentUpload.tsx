'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createDocument } from '@/app/actions/documents'

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

const ACCEPT_ATTR = '.pdf,.txt,.md,.csv,.json,.docx,.doc'
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

export function DocumentUpload({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: string
  workspaceSlug: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFileName(file?.name ?? null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('File must be 50 MB or smaller.')
      return
    }
    if (ACCEPTED_MIME_TYPES.length && !ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError('Unsupported file type.')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
      const storagePath = `${workspaceId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file)

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      const result = await createDocument({
        workspaceId,
        workspaceSlug,
        name: file.name,
        storagePath,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      })

      if (result.error) {
        // Best-effort cleanup of the orphaned Storage object.
        await supabase.storage.from('documents').remove([storagePath])
        setError(result.error)
        return
      }

      // Reset form, then refresh the server component to show the new document.
      if (inputRef.current) inputRef.current.value = ''
      setFileName(null)
      router.refresh()
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label
        htmlFor="doc-file"
        className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
      >
        <span className="text-sm text-gray-500">
          {fileName ? (
            <span className="text-gray-900 font-medium">{fileName}</span>
          ) : (
            <>
              <span className="text-gray-900 font-medium">Choose a file</span>
              {' '}or drag it here
            </>
          )}
        </span>
        <input
          id="doc-file"
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!fileName || uploading}
        className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? 'Uploading…' : 'Upload document'}
      </button>
    </form>
  )
}
