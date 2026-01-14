import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  GitBranch, 
  Play, 
  Trash2, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Plus,
  Eye
} from 'lucide-react';

export default function Scenarios() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchScenarios();
    }
  }, [user]);

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScenarios(data || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return;
    
    try {
      setDeletingId(id);
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setScenarios(scenarios.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting scenario:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (scenario) => {
    navigate(`/dashboard/scenarios/${scenario.id}`);
  };

  const handleRun = (scenario) => {
    navigate(`/dashboard/analyze`, { 
      state: { 
        scenarioId: scenario.id,
        prefilledData: scenario.parameters 
      } 
    });
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pt-8 pb-16">
        <div className="text-center mb-12">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Alternate Endings
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
            Scenarios
          </h1>
          <p className="text-lg text-slate-400">
            Explore different pricing paths and see how each decision could play out.
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-8 pb-16">
      <div className="text-center mb-12">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          Alternate Endings
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
          Scenarios
        </h1>
        <p className="text-lg text-slate-400">
          Explore different pricing paths and see how each decision could play out.
        </p>
      </div>

      {scenarios.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GitBranch className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">No scenarios yet</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Create your first scenario to explore different pricing strategies and their potential outcomes.
          </p>
          <button
            onClick={() => navigate('/dashboard/analyze')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Scenario
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <GitBranch className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-white truncate">
                      {scenario.name || 'Untitled Scenario'}
                    </h3>
                    {scenario.expected_trend !== undefined && getTrendIcon(scenario.expected_trend)}
                  </div>
                  {scenario.description && (
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                      {scenario.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(scenario.created_at)}
                    </span>
                    {scenario.parameters?.price_change && (
                      <span className="px-2 py-0.5 bg-slate-700/50 rounded-full">
                        {scenario.parameters.price_change > 0 ? '+' : ''}{scenario.parameters.price_change}% price
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleView(scenario)}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                    title="View details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleRun(scenario)}
                    className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors"
                    title="Run scenario"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(scenario.id)}
                    disabled={deletingId === scenario.id}
                    className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
                    title="Delete scenario"
                  >
                    {deletingId === scenario.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
