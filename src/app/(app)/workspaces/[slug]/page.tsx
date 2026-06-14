export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">Workspace: {slug}</h1>
        <p className="text-sm text-gray-500">Full workspace view coming in Step 3.</p>
      </div>
    </div>
  )
}
