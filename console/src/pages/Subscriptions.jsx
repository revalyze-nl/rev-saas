import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import apiClient from '../lib/apiClient'

const statusConfig = {
  active: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  trialing: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  past_due: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  canceled: { icon: XCircle, color: 'text-surface-400', bg: 'bg-surface-600' },
  unpaid: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [stats, setStats] = useState({ active: 0, pastDue: 0, canceled: 0, mrr: 0 })

  useEffect(() => {
    fetchSubscriptions()
  }, [statusFilter])

  const fetchSubscriptions = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      
      const data = await apiClient.getSubscriptions(params)
      setSubscriptions(data.subscriptions || [])
      setStats(data.stats || stats)
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
      // Demo data
      setSubscriptions([
        { 
          id: '1', 
          userId: 'u1',
          userEmail: 'demo@example.com', 
          plan: 'growth', 
          status: 'active', 
          currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false
        },
        { 
          id: '2', 
          userId: 'u2',
          userEmail: 'test@example.com', 
          plan: 'starter', 
          status: 'past_due', 
          currentPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false
        },
      ])
      setStats({ active: 1, pastDue: 1, canceled: 0, mrr: 127 })
    } finally {
      setLoading(false)
    }
  }

  const StatusIcon = ({ status }) => {
    const config = statusConfig[status] || statusConfig.canceled
    const Icon = config.icon
    return <Icon className={`w-4 h-4 ${config.color}`} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-surface-400 mt-1">Manage billing and subscriptions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
          <p className="text-surface-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
          <p className="text-surface-400 text-sm">Past Due</p>
          <p className="text-2xl font-bold text-red-400">{stats.pastDue}</p>
        </div>
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
          <p className="text-surface-400 text-sm">Canceled</p>
          <p className="text-2xl font-bold text-surface-400">{stats.canceled}</p>
        </div>
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
          <p className="text-surface-400 text-sm">MRR</p>
          <p className="text-2xl font-bold text-white">€{stats.mrr}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'active', 'past_due', 'canceled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-brand-500 text-white'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            {status === '' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">User</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Plan</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Period End</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Cancel?</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto"></div>
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                  <td className="px-4 py-3">
                    <Link to={`/users/${sub.userId}`} className="text-white hover:text-brand-400">
                      {sub.userEmail}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white capitalize">{sub.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={sub.status} />
                      <span className={`text-sm ${statusConfig[sub.status]?.color || 'text-surface-400'}`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-400">
                    {sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {sub.cancelAtPeriodEnd ? (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                        Scheduled
                      </span>
                    ) : (
                      <span className="text-surface-500">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

