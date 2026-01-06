const Verdict = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Main Verdict Card */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-8">
        <div className="text-center space-y-6">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">Analysis Complete</span>
          </div>

          {/* Main Verdict */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">
              Increase your prices by 15%
            </h1>
            <p className="text-lg text-slate-400">
              You're underpriced compared to 8 of 12 competitors
            </p>
          </div>

          {/* Confidence Score */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-slate-500">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
              </div>
              <span className="text-sm font-medium text-white">85%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Supporting Info */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-slate-900/30 border border-slate-800/30 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-white">$79</p>
          <p className="text-sm text-slate-500 mt-1">Your current price</p>
        </div>
        <div className="bg-slate-900/30 border border-slate-800/30 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-emerald-400">$91</p>
          <p className="text-sm text-slate-500 mt-1">Recommended price</p>
        </div>
        <div className="bg-slate-900/30 border border-slate-800/30 rounded-xl p-5 text-center">
          <p className="text-2xl font-bold text-white">$95</p>
          <p className="text-sm text-slate-500 mt-1">Market average</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8 text-center">
        <button className="px-8 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
          Apply Recommendation
        </button>
        <p className="text-xs text-slate-600 mt-3">
          Last updated 2 hours ago
        </p>
      </div>
    </div>
  );
};

export default Verdict;
