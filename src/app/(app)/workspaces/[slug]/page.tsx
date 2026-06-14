import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // RLS ensures this query returns null if the authenticated user is not a member.
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!workspace) notFound()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
        <p className="text-sm text-gray-400">/{workspace.slug}</p>
      </div>
    </div>
  )
}
