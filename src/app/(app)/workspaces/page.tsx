import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function WorkspacesPage() {
  const supabase = await createClient()

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Workspaces</h1>
          <Link
            href="/workspaces/new"
            className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
          >
            New workspace
          </Link>
        </div>

        {!workspaces || workspaces.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-500 text-sm">You don&apos;t have any workspaces yet.</p>
            <Link
              href="/workspaces/new"
              className="text-sm text-gray-900 font-medium hover:underline"
            >
              Create your first workspace →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white overflow-hidden">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/workspaces/${ws.slug}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-gray-900">{ws.name}</p>
                    <p className="text-xs text-gray-400">/{ws.slug}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(ws.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  )
}
