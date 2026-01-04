import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import apiClient from '../lib/apiClient'

export default function AIUsage() {
  const [usage, setUsage] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ 
    totalCreditsUsed: 0, 
    averagePerUser: 0, 
    topUsers: [],
    dailyUsage: [] 
  })
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    fetchUsage()
  }, [period])

  const fetchUsage = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getAIUsage({ period })
      setUsage(data.usage || [])
      setStats(data.stats || stats)
    } catch (err) {
      console.error('Failed to fetch AI usage:', err)
      // Demo data
      setUsage([
        { userId: 'u1', email: 'demo@example.com', plan: 'growth', used: 15, limit: 20 },
        { userId: 'u2', email: 'test@example.com', plan: 'starter', used: 3, limit: 5 },
        { userId: 'u3', email: 'user@example.com', plan: 'growth', used: 8, limit: 20 },
      ])
      setStats({
        totalCreditsUsed: 26,
        averagePerUser: 8.7,
        topUsers: [
          { email: 'demo@example.com', used: 15 },
          { email: 'user@example.com', used: 8 },
        ],
        dailyUsage: [
          { date: 'Dec 28', credits: 4 },
          { date: 'Dec 29', credits: 6 },
          { date: 'Dec 30', credits: 3 },
          { date: 'Dec 31', credits: 5 },
          { date: 'Jan 1', credits: 2 },
          { date: 'Jan 2', credits: 4 },
          { date: 'Jan 3', credits: 2 },
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Usage</h1>
          <p className="text-surface-400 mt-1">Monitor AI credit consumption</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm"
        >
          <option value="week">Last 7 days</option>
          <option value="month">This month</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-surface-400 text-sm">Total Credits Used</p>
              <p className="text-2xl font-bold text-white">{stats.totalCreditsUsed}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-surface-400 text-sm">Average per User</p>
              <p className="text-2xl font-bold text-white">{stats.averagePerUser.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
          <p className="text-surface-400 text-sm mb-2">Top Users</p>
          <div className="space-y-1">
            {stats.topUsers.slice(0, 3).map((user, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white truncate">{user.email}</span>
                <span className="text-purple-400 font-mono">{user.used}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Daily Usage</h3>
        <div className="h-64">
          {stats.dailyUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyUsage}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="credits" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-surface-500">
              No usage data available
            </div>
          )}
        </div>
      </div>

      {/* Usage table */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-700">
          <h3 className="font-semibold text-white">User Breakdown</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-700">
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">User</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Plan</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Used / Limit</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Usage</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto"></div>
                </td>
              </tr>
            ) : usage.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                  No usage data
                </td>
              </tr>
            ) : (
              usage.map((u, i) => (
                <tr key={i} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                  <td className="px-4 py-3">
                    <Link to={`/users/${u.userId}`} className="text-white hover:text-brand-400">
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-surface-300 capitalize">{u.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-white">{u.used}</span>
                    <span className="text-surface-500"> / {u.limit}</span>
                  </td>
                  <td className="px-4 py-3 w-48">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-surface-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            u.used / u.limit > 0.9 ? 'bg-red-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.min(100, (u.used / u.limit) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-surface-500">
                        {Math.round((u.used / u.limit) * 100)}%
                      </span>
                    </div>
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


