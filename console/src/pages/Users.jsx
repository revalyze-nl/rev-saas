import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, MoreVertical, Eye, Trash2, Mail } from 'lucide-react'
import { format } from 'date-fns'
import apiClient from '../lib/apiClient'

const planColors = {
  free: 'bg-surface-600 text-surface-200',
  starter: 'bg-blue-500/20 text-blue-400',
  growth: 'bg-purple-500/20 text-purple-400',
  enterprise: 'bg-amber-500/20 text-amber-400',
  admin: 'bg-red-500/20 text-red-400',
}

const statusColors = {
  active: 'bg-emerald-500/20 text-emerald-400',
  past_due: 'bg-red-500/20 text-red-400',
  canceled: 'bg-surface-600 text-surface-300',
  trialing: 'bg-blue-500/20 text-blue-400',
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [page, planFilter])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (planFilter) params.plan = planFilter
      if (search) params.search = search
      
      const data = await apiClient.getUsers(params)
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch users:', err)
      // Demo data
      setUsers([
        { id: '1', email: 'demo@example.com', plan: 'growth', status: 'active', emailVerified: true, createdAt: new Date().toISOString() },
        { id: '2', email: 'test@example.com', plan: 'starter', status: 'active', emailVerified: true, createdAt: new Date().toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-surface-400 mt-1">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </form>
        
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">User</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Plan</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Verified</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Joined</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-surface-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto"></div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-brand-400">
                          {user.email?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{user.email}</p>
                        <p className="text-xs text-surface-500 font-mono">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${planColors[user.plan] || planColors.free}`}>
                      {user.plan || 'free'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusColors[user.status] || statusColors.active}`}>
                      {user.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.emailVerified ? (
                      <span className="text-emerald-400 text-sm">✓</span>
                    ) : (
                      <span className="text-red-400 text-sm">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-400">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/users/${user.id}`}
                        className="p-1.5 hover:bg-surface-700 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-surface-400" />
                      </Link>
                      <button
                        className="p-1.5 hover:bg-surface-700 rounded-lg transition-colors"
                        title="Send email"
                      >
                        <Mail className="w-4 h-4 text-surface-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
            <p className="text-sm text-surface-400">
              Page {page} of {Math.ceil(total / 20)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-surface-700 hover:bg-surface-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 text-sm bg-surface-700 hover:bg-surface-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



