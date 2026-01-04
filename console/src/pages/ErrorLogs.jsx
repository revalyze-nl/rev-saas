import { useState, useEffect } from 'react'
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import apiClient from '../lib/apiClient'

const levelConfig = {
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
}

export default function ErrorLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    fetchLogs()
  }, [levelFilter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = {}
      if (levelFilter) params.level = levelFilter
      
      const data = await apiClient.getErrorLogs(params)
      setLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to fetch logs:', err)
      // Demo data
      setLogs([
        { 
          id: '1', 
          level: 'error', 
          message: 'OpenAI API rate limit exceeded', 
          path: '/api/analysis/generate',
          userId: 'u123',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          stack: 'Error: Rate limit exceeded\n    at OpenAIService.call (/app/service/ai.go:45)\n    at AnalysisHandler.generate (/app/handler/analysis.go:123)'
        },
        { 
          id: '2', 
          level: 'warning', 
          message: 'Stripe webhook signature verification failed', 
          path: '/api/billing/webhook',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        { 
          id: '3', 
          level: 'error', 
          message: 'MongoDB connection timeout', 
          path: '/api/users',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          stack: 'Error: Connection timeout after 30000ms'
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const LevelBadge = ({ level }) => {
    const config = levelConfig[level] || levelConfig.info
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {level}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Error Logs</h1>
          <p className="text-surface-400 mt-1">Monitor application errors and warnings</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white text-sm rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'error', 'warning', 'info'].map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(level)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              levelFilter === level
                ? 'bg-brand-500 text-white'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            {level === '' ? 'All' : level}
          </button>
        ))}
      </div>

      {/* Logs list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-surface-500 mx-auto mb-2" />
            <p className="text-surface-400">No logs found</p>
          </div>
        ) : (
          logs.map((log) => (
            <div 
              key={log.id}
              className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-700/50"
              >
                <div className="flex items-center gap-4">
                  <LevelBadge level={log.level} />
                  <span className="text-white text-sm">{log.message}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-surface-500 text-xs font-mono">{log.path}</span>
                  <span className="text-surface-500 text-xs">
                    {log.timestamp ? format(new Date(log.timestamp), 'MMM d, HH:mm') : '-'}
                  </span>
                  {expandedId === log.id ? (
                    <ChevronUp className="w-4 h-4 text-surface-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-surface-400" />
                  )}
                </div>
              </button>
              
              {expandedId === log.id && (
                <div className="px-4 pb-4 border-t border-surface-700">
                  <div className="mt-3 space-y-2">
                    {log.userId && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-surface-400">User:</span>
                        <span className="text-white font-mono">{log.userId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-surface-400">Timestamp:</span>
                      <span className="text-white">
                        {log.timestamp ? format(new Date(log.timestamp), 'PPpp') : '-'}
                      </span>
                    </div>
                    {log.stack && (
                      <div>
                        <span className="text-surface-400 text-sm">Stack trace:</span>
                        <pre className="mt-1 p-3 bg-surface-900 rounded-lg text-xs text-surface-300 font-mono overflow-x-auto">
                          {log.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}



