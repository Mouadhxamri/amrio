'use client'

import { useActionState } from 'react'
import { createWorkspace, type CreateWorkspaceState } from '@/app/actions/workspaces'

const initialState: CreateWorkspaceState = {}

export default function NewWorkspacePage() {
  const [state, action, pending] = useActionState(createWorkspace, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 p-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">Create your workspace</h1>
          <p className="text-sm text-gray-500">Give your team a name to get started.</p>
        </div>
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Workspace name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              placeholder="Acme Support"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
      </div>
    </div>
  )
}
