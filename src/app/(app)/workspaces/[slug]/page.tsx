import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentUpload } from './_components/DocumentUpload'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function mimeLabel(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'text/markdown': 'MD',
    'text/csv': 'CSV',
    'application/json': 'JSON',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/msword': 'DOC',
  }
  return map[mime] ?? mime.split('/')[1]?.toUpperCase() ?? '—'
}

const statusStyles: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-500',
  processing: 'bg-yellow-50 text-yellow-700',
  ready:      'bg-green-50 text-green-700',
  error:      'bg-red-50 text-red-600',
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!workspace) notFound()

  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, mime_type, size_bytes, status, error_message, chunk_count, created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-10">

        {/* Header */}
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
          <p className="text-sm text-gray-400">/{workspace.slug}</p>
        </div>

        {/* Upload */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-700">Upload a document</h2>
          <DocumentUpload workspaceId={workspace.id} workspaceSlug={workspace.slug} />
          <p className="text-xs text-gray-400">
            PDF, TXT, MD, CSV, JSON — up to 50 MB
          </p>
        </section>

        {/* Document list */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-gray-700">
            Documents{documents && documents.length > 0 ? ` (${documents.length})` : ''}
          </h2>
          {!documents || documents.length === 0 ? (
            <p className="text-sm text-gray-400">No documents yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white overflow-hidden">
              {documents.map((doc) => {
                const chunks = doc.chunk_count ?? 0
                return (
                  <li key={doc.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md bg-gray-100 text-xs font-medium text-gray-600">
                        {mimeLabel(doc.mime_type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatBytes(doc.size_bytes)} ·{' '}
                          {new Date(doc.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {doc.status === 'ready' && chunks > 0 && (
                          <span className="text-xs text-gray-400">{chunks} chunk{chunks !== 1 ? 's' : ''}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusStyles[doc.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {doc.status}
                        </span>
                      </div>
                    </div>
                    {doc.status === 'error' && doc.error_message && (
                      <p className="text-xs text-red-500 pl-[52px]">{doc.error_message}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

      </div>
    </div>
  )
}
