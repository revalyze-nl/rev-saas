import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Calendar, CreditCard, Zap, Shield, Trash2, Save, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import apiClient from '../lib/apiClient'

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    fetchUser()
  }, [id])

  const fetchUser = async () => {
    try {
      const data = await apiClient.getUser(id)
      setUser(data)
      setFormData({
        plan: data.plan || 'free',
        role: data.role || 'user',
      })
    } catch (err) {
      console.error('Failed to fetch user:', err)
      // Demo data
      setUser({
        id,
        email: 'demo@example.com',
        plan: 'growth',
        role: 'user',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        subscription: {
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        aiCredits: {
          used: 12,
          limit: 20,
        },
      })
      setFormData({ plan: 'growth', role: 'user' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.updateUser(id, formData)
      setUser({ ...user, ...formData })
      setEditMode(false)
    } catch (err) {
      console.error('Failed to update user:', err)
      alert('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    try {
      await apiClient.deleteUser(id)
      navigate('/users')
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert('Failed to delete user')
    }
  }

  const handleActivate = async () => {
    if (!confirm('Are you sure you want to manually activate this user? This will mark their email as verified.')) {
      return
    }
    setActivating(true)
    try {
      await apiClient.activateUser(id)
      setUser({ ...user, emailVerified: true })
    } catch (err) {
      console.error('Failed to activate user:', err)
      alert('Failed to activate user')
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-400">User not found</p>
        <Link to="/users" className="text-brand-400 hover:underline mt-2 inline-block">
          ← Back to users
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/users"
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-surface-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.email}</h1>
            <p className="text-surface-400 font-mono text-sm">{user.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-sm text-surface-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white text-sm font-medium rounded-lg"
              >
                Edit user
              </button>
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Delete user"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Email</label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-surface-500" />
                  <span className="text-white">{user.email}</span>
                  {user.emailVerified ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                      Verified
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                      Unverified
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Joined</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-surface-500" />
                  <span className="text-white">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : '-'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Plan</label>
                {editMode ? (
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="px-3 py-1.5 bg-surface-700 border border-surface-600 rounded text-white text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-surface-500" />
                    <span className="text-white capitalize">{user.plan || 'Free'}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Role</label>
                {editMode ? (
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="px-3 py-1.5 bg-surface-700 border border-surface-600 rounded text-white text-sm"
                  >
                    <option value="user">User</option>
                    <option value="investor">Investor</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-surface-500" />
                    <span className="text-white capitalize">{user.role || 'User'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Subscription</h3>
            {user.subscription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-surface-400">Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.subscription.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {user.subscription.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-400">Current period ends</span>
                  <span className="text-white">
                    {user.subscription.currentPeriodEnd 
                      ? format(new Date(user.subscription.currentPeriodEnd), 'MMM d, yyyy')
                      : '-'
                    }
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-surface-500">No active subscription</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Credits */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              AI Credits
            </h3>
            {user.aiCredits ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-surface-400">Used this month</span>
                  <span className="text-white font-mono">
                    {user.aiCredits.used} / {user.aiCredits.limit}
                  </span>
                </div>
                <div className="w-full bg-surface-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${(user.aiCredits.used / user.aiCredits.limit) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-surface-500">No usage data</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {!user.emailVerified && (
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {activating ? 'Activating...' : 'Activate User'}
                </button>
              )}
              <button className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 rounded-lg transition-colors">
                Reset AI credits
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 rounded-lg transition-colors">
                Resend verification email
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 rounded-lg transition-colors">
                View in Stripe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



