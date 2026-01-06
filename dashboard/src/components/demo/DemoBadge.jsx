import { useDemo } from '../../context/DemoContext';

/**
 * DemoBadge - A subtle badge to indicate demo data
 * Use this next to page titles on key pages when in demo mode
 */
export default function DemoBadge({ className = '' }) {
  const { isDemoMode } = useDemo();

  if (!isDemoMode) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium text-slate-400 bg-slate-700/50 border border-slate-600/50 rounded ${className}`}
    >
      Demo
    </span>
  );
}
