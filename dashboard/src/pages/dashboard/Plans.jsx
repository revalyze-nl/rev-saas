import { useState } from 'react';
import { usePlans } from '../../context/PlansContext';

const Plans = () => {
  const { plans, addPlan, removePlan, updatePlan, isLoading, error, clearError } = usePlans();
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    currency: 'USD',
    interval: 'monthly',
    description: '',
    stripePriceId: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  
  // Edit mode state
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Clear API error when user starts typing
    if (error) {
      clearError();
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    }

    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(formData.price) || Number(formData.price) < 0) {
      newErrors.price = 'Price must be a non-negative number';
    }

    if (!formData.interval) {
      newErrors.interval = 'Billing interval is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const result = await addPlan({
      name: formData.name.trim(),
      price: formData.price,
      currency: formData.currency,
      interval: formData.interval,
      description: formData.description.trim(),
      stripePriceId: formData.stripePriceId.trim()
    });

    setIsSubmitting(false);

    if (result.success) {
      // Reset form
      setFormData({
        name: '',
        price: '',
        currency: 'USD',
        interval: 'monthly',
        description: '',
        stripePriceId: ''
      });
      setErrors({});
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Are you sure you want to remove this plan?')) {
      return;
    }

    setRemovingId(id);
    await removePlan(id);
    setRemovingId(null);
  };

  const formatPrice = (price, currency, interval) => {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);

    return `${formattedPrice} / ${interval === 'monthly' ? 'month' : 'year'}`;
  };

  // Edit handlers
  const handleStartEdit = (plan) => {
    setEditingPlanId(plan.id);
    setEditData({
      name: plan.name,
      price: plan.price,
      currency: plan.currency || 'USD',
      interval: plan.interval || 'monthly',
      stripePriceId: plan.stripePriceId || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setEditData({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = async (planId) => {
    setIsUpdating(true);
    const result = await updatePlan(planId, editData);
    setIsUpdating(false);
    
    if (result.success) {
      setEditingPlanId(null);
      setEditData({});
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          My Pricing
        </h1>
        <p className="text-slate-400">
          Define your current SaaS plans and prices. Revalyze will use these as the baseline for pricing analysis.
        </p>
      </div>

      {/* API Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <p className="text-red-400">{error}</p>
          <button 
            onClick={clearError}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Add Plan Form */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          Add New Plan
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Plan Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-300 mb-2">
                Plan Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-xl bg-slate-900/50 border ${
                  errors.name ? 'border-red-500' : 'border-slate-700'
                } text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50`}
                placeholder="e.g., Starter, Pro, Business"
              />
              {errors.name && (
                <p className="text-sm text-red-400 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Price and Currency */}
            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-slate-300 mb-2">
                Price
              </label>
              <div className="flex gap-2">
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-24 px-3 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none pr-8 disabled:opacity-50"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1rem'
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="TRY">TRY</option>
                </select>
                <input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border ${
                    errors.price ? 'border-red-500' : 'border-slate-700'
                  } text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50`}
                  placeholder="29.99"
                />
              </div>
              {errors.price && (
                <p className="text-sm text-red-400 mt-1">{errors.price}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Billing Interval */}
            <div>
              <label htmlFor="interval" className="block text-sm font-semibold text-slate-300 mb-2">
                Billing Interval
              </label>
              <select
                id="interval"
                name="interval"
                value={formData.interval}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none pr-10 disabled:opacity-50"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.5rem'
                }}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Description (optional) */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-slate-300 mb-2">
                Description <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                id="description"
                name="description"
                type="text"
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                placeholder="Brief description of what's included"
              />
            </div>
          </div>

          {/* Stripe Price ID (optional) */}
          <div>
            <label htmlFor="stripePriceId" className="block text-sm font-semibold text-slate-300 mb-2">
              Stripe Price ID <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              id="stripePriceId"
              name="stripePriceId"
              type="text"
              value={formData.stripePriceId}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 font-mono text-sm"
              placeholder="price_..."
            />
            <p className="mt-1 text-xs text-slate-500">
              Used to sync customers and MRR from Stripe. Find this in your Stripe Dashboard &gt; Products.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 hover:scale-105 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding...
              </span>
            ) : (
              'Add Plan'
            )}
          </button>
        </form>
      </div>

      {/* Plans List */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">
            Your Plans ({plans.length})
          </h3>
        </div>

        {isLoading ? (
          /* Loading State */
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
              </svg>
            </div>
            <p className="text-slate-400 text-lg">
              You haven't defined any plans yet.
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Add at least one plan to get meaningful pricing suggestions.
            </p>
          </div>
        ) : (
          /* Plans Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-slate-800/30 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all group ${
                  removingId === plan.id || (editingPlanId === plan.id && isUpdating) ? 'opacity-50' : ''
                }`}
              >
                {editingPlanId === plan.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <input
                      name="name"
                      type="text"
                      value={editData.name}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white text-sm focus:border-blue-500 outline-none"
                      placeholder="Plan name"
                    />
                    <div className="flex gap-2">
                      <select
                        name="currency"
                        value={editData.currency}
                        onChange={handleEditChange}
                        className="w-20 px-2 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white text-sm focus:border-blue-500 outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="TRY">TRY</option>
                      </select>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editData.price}
                        onChange={handleEditChange}
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white text-sm focus:border-blue-500 outline-none"
                        placeholder="Price"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Stripe Price ID</label>
                      <input
                        name="stripePriceId"
                        type="text"
                        value={editData.stripePriceId}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white text-sm font-mono focus:border-blue-500 outline-none"
                        placeholder="price_..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSaveEdit(plan.id)}
                        disabled={isUpdating}
                        className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">
                          {plan.name}
                        </h4>
                        <div className="text-2xl font-bold text-blue-400">
                          {formatPrice(plan.price, plan.currency, plan.interval)}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(plan)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Edit plan"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemove(plan.id)}
                          disabled={removingId === plan.id}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                          title="Remove plan"
                        >
                          {removingId === plan.id ? (
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {plan.description && (
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {plan.description}
                      </p>
                    )}

                    {plan.stripePriceId ? (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                          </svg>
                          <span className="text-xs text-slate-500 font-mono truncate" title={plan.stripePriceId}>
                            {plan.stripePriceId}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <button
                          onClick={() => handleStartEdit(plan)}
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Add Stripe Price ID for sync
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
