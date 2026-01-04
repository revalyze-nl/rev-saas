import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  CreditCard, 
  Zap, 
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import apiClient from '../lib/apiClient'

// Placeholder data until backend is ready
const placeholderStats = {
  totalUsers: 0,
  activeSubscriptions: 0,
  totalAICreditsUsed: 0,
  errorCount: 0,
  recentUsers: [],
  usageChart: [],
}

function StatCard({ title, value, change, changeType, icon: Icon, color, href }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
    red: 'bg-red-500/10 text-red-400',
  }

  return (
    <Link 
      to={href} 
      className="bg-surface-800 border border-surface-700 rounded-xl p-5 hover:border-surface-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-surface-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              changeType === 'up' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {changeType === 'up' ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{change}% vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(placeholderStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getAdminStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
        setError(err.message)
        // Use placeholder data on error
        setStats(placeholderStats)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-surface-400 mt-1">Overview of your Revalyze platform</p>
      </div>

      {error && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          <strong>Note:</strong> Admin API endpoints not yet configured. Showing placeholder data.
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change={12}
          changeType="up"
          icon={Users}
          color="blue"
          href="/users"
        />
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions.toLocaleString()}
          change={8}
          changeType="up"
          icon={CreditCard}
          color="green"
          href="/subscriptions"
        />
        <StatCard
          title="AI Credits Used"
          value={stats.totalAICreditsUsed.toLocaleString()}
          change={24}
          changeType="up"
          icon={Zap}
          color="purple"
          href="/ai-usage"
        />
        <StatCard
          title="Errors (24h)"
          value={stats.errorCount.toLocaleString()}
          change={stats.errorCount > 0 ? 5 : undefined}
          changeType="down"
          icon={AlertTriangle}
          color="red"
          href="/error-logs"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage chart */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">User Signups</h3>
            <span className="text-sm text-surface-400">Last 30 days</span>
          </div>
          <div className="h-64">
            {stats.usageChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.usageChart}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorUsers)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-surface-500">
                <div className="text-center">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No data available yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Users</h3>
            <Link to="/users" className="text-sm text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          {stats.recentUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUsers.map((user, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-brand-400">
                        {user.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.email}</p>
                      <p className="text-xs text-surface-500">{user.plan || 'free'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-surface-500">{user.createdAt}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-surface-500">
              <div className="text-center">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No users yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System status */}
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'API', status: 'operational' },
            { name: 'Database', status: 'operational' },
            { name: 'Stripe', status: 'operational' },
            { name: 'OpenAI', status: 'operational' },
          ].map((service) => (
            <div key={service.name} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                service.status === 'operational' ? 'bg-emerald-400' : 'bg-red-400'
              }`} />
              <span className="text-sm text-surface-300">{service.name}</span>
              <span className={`text-xs ${
                service.status === 'operational' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

