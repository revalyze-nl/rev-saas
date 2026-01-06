const History = () => {
  const history = [
    {
      id: 1,
      date: 'Jan 5, 2026',
      verdict: 'Increase prices by 15%',
      status: 'pending',
      confidence: 85,
    },
    {
      id: 2,
      date: 'Dec 28, 2025',
      verdict: 'Hold current prices',
      status: 'applied',
      confidence: 78,
      outcome: 'Revenue stable',
    },
    {
      id: 3,
      date: 'Dec 15, 2025',
      verdict: 'Increase prices by 8%',
      status: 'applied',
      confidence: 82,
      outcome: '+6% revenue, -2% churn',
    },
    {
      id: 4,
      date: 'Nov 30, 2025',
      verdict: 'Launch new tier at $149',
      status: 'ignored',
      confidence: 71,
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'applied':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
            Applied
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
            Pending
          </span>
        );
      case 'ignored':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded">
            Ignored
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-slate-400 mt-1">Past recommendations and outcomes</p>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-5 bg-slate-900/50 border border-slate-800/50 rounded-xl hover:bg-slate-900/70 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-slate-500">{item.date}</span>
                  {getStatusBadge(item.status)}
                </div>
                <p className="text-white font-medium">{item.verdict}</p>
                {item.outcome && (
                  <p className="text-sm text-emerald-400 mt-1">{item.outcome}</p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                      style={{ width: `${item.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400">{item.confidence}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
