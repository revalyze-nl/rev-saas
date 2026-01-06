import { useState } from 'react';
import { useDemo } from '../../context/DemoContext';

export default function DemoBanner() {
  const { showBanner, dismissBanner, replaceDemoData, isReplacing } = useDemo();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!showBanner) return null;

  const handleReplace = async () => {
    const result = await replaceDemoData();
    if (!result.success) {
      alert('Failed to replace demo data. Please try again.');
    }
    setShowConfirmModal(false);
  };

  return (
    <>
      {/* Banner */}
      <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {/* AlertCircle icon */}
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <span className="font-medium text-amber-400">Demo Mode:</span>{' '}
              You are viewing sample data. You can replace it with your real data at any time.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-3 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors"
            >
              Replace with my real data
            </button>
            <button
              onClick={dismissBanner}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Dismiss for this session"
            >
              {/* X icon */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">
              Replace demo data?
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              This will remove sample data and start guided setup with your own pricing and metrics.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isReplacing}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Keep demo
              </button>
              <button
                onClick={handleReplace}
                disabled={isReplacing}
                className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isReplacing ? 'Replacing...' : 'Replace now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
