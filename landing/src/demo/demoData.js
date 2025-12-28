// Demo Data - Static data for interactive demo mode
// This file contains realistic SaaS metrics, plans, competitors, and AI insights
// No backend or OpenAI calls are made when using this data

export const DEMO_COMPANY = {
  name: "Acme SaaS",
  website: "https://acme-saas.com",
  mrrRange: "$50k-$100k",
  activeCustomers: 847,
  churnRate: 3.2,
  arpu: 129
};

export const DEMO_PLANS = [
  {
    id: "plan-1",
    planName: "Starter",
    price: 29,
    currency: "USD",
    billingPeriod: "monthly",
    features: [
      { name: "5 team members", included: true },
      { name: "10GB storage", included: true },
      { name: "Basic analytics", included: true },
      { name: "Email support", included: true },
      { name: "API access", included: false },
      { name: "Custom integrations", included: false }
    ],
    activeCustomers: 312,
    createdAt: "2024-01-15T10:00:00Z"
  },
  {
    id: "plan-2",
    planName: "Professional",
    price: 79,
    currency: "USD",
    billingPeriod: "monthly",
    features: [
      { name: "25 team members", included: true },
      { name: "100GB storage", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Priority support", included: true },
      { name: "API access", included: true },
      { name: "Custom integrations", included: false }
    ],
    activeCustomers: 423,
    createdAt: "2024-01-15T10:00:00Z"
  },
  {
    id: "plan-3",
    planName: "Enterprise",
    price: 199,
    currency: "USD",
    billingPeriod: "monthly",
    features: [
      { name: "Unlimited team members", included: true },
      { name: "Unlimited storage", included: true },
      { name: "Custom analytics", included: true },
      { name: "Dedicated support", included: true },
      { name: "Full API access", included: true },
      { name: "Custom integrations", included: true }
    ],
    activeCustomers: 112,
    createdAt: "2024-01-15T10:00:00Z"
  }
];

export const DEMO_COMPETITORS = [
  {
    id: "comp-1",
    name: "RivalTech",
    url: "https://rivaltech.io",
    plans: [
      { name: "Basic", price: 19, period: "monthly" },
      { name: "Pro", price: 59, period: "monthly" },
      { name: "Business", price: 149, period: "monthly" }
    ],
    positioning: "Budget-friendly alternative",
    lastUpdated: "2024-12-20T10:00:00Z"
  },
  {
    id: "comp-2",
    name: "CloudFlow",
    url: "https://cloudflow.com",
    plans: [
      { name: "Starter", price: 39, period: "monthly" },
      { name: "Growth", price: 99, period: "monthly" },
      { name: "Scale", price: 249, period: "monthly" }
    ],
    positioning: "Premium enterprise focus",
    lastUpdated: "2024-12-18T10:00:00Z"
  },
  {
    id: "comp-3",
    name: "DataSync Pro",
    url: "https://datasyncpro.io",
    plans: [
      { name: "Individual", price: 15, period: "monthly" },
      { name: "Team", price: 49, period: "monthly" },
      { name: "Enterprise", price: 179, period: "monthly" }
    ],
    positioning: "Developer-first approach",
    lastUpdated: "2024-12-22T10:00:00Z"
  },
  {
    id: "comp-4",
    name: "StreamBase",
    url: "https://streambase.co",
    plans: [
      { name: "Free", price: 0, period: "monthly" },
      { name: "Plus", price: 29, period: "monthly" },
      { name: "Pro", price: 89, period: "monthly" }
    ],
    positioning: "Freemium model leader",
    lastUpdated: "2024-12-21T10:00:00Z"
  }
];

export const DEMO_ANALYSIS = {
  id: "analysis-demo-1",
  createdAt: "2024-12-28T10:00:00Z",
  status: "completed",
  
  // Market positioning
  marketPosition: "mid-market",
  pricePercentile: 62,
  competitorCount: 4,
  
  // Key metrics
  metrics: {
    averageMarketPrice: 72,
    yourAveragePrice: 102,
    priceGap: "+41%",
    valueScore: 78,
    competitiveness: "Strong"
  },
  
  // AI Insights (static, professional text)
  insights: {
    summary: "Your pricing strategy positions Acme SaaS in the upper-mid market segment. With an average price point 41% above market median, your value proposition must clearly communicate premium features and support quality to justify the premium.",
    
    strengths: [
      "Strong feature differentiation in the Professional tier with 25 team members vs. competitor average of 15",
      "Enterprise plan pricing is competitive at $199 compared to CloudFlow's $249",
      "Clear tier progression with logical feature unlocks between plans"
    ],
    
    weaknesses: [
      "Starter plan at $29 may face pressure from freemium competitors like StreamBase",
      "No free tier limits acquisition funnel compared to 2 of 4 competitors offering free plans",
      "API access gated to Professional+ may deter developer-focused buyers"
    ],
    
    opportunities: [
      "Consider a limited free tier to compete with StreamBase's freemium model",
      "Annual billing discount could increase LTV by 15-20%",
      "Usage-based pricing component could capture more value from power users"
    ],
    
    suggestedActions: [
      {
        title: "Introduce Annual Billing",
        description: "Offer 20% discount for annual commitment to improve cash flow and reduce churn",
        impact: "High",
        effort: "Low"
      },
      {
        title: "Add Entry-Level Tier",
        description: "Create a $15/month tier with limited features to compete in the budget segment",
        impact: "Medium",
        effort: "Medium"
      },
      {
        title: "Unlock API at Starter",
        description: "Move API access to Starter tier to attract developer-focused customers",
        impact: "Medium",
        effort: "Low"
      }
    ]
  },
  
  // Risk analysis
  riskAnalysis: {
    overall: "Moderate",
    factors: [
      { name: "Price Sensitivity", level: "Medium", description: "Market shows moderate price sensitivity with budget alternatives available" },
      { name: "Feature Parity", level: "Low", description: "Your feature set exceeds most competitors at each tier" },
      { name: "Competitive Pressure", level: "Medium", description: "Active competitor pricing updates suggest dynamic market" }
    ]
  },
  
  // Chart data
  pricePositioningData: [
    { name: "RivalTech Basic", price: 19, isUser: false },
    { name: "DataSync Individual", price: 15, isUser: false },
    { name: "Your Starter", price: 29, isUser: true },
    { name: "StreamBase Plus", price: 29, isUser: false },
    { name: "DataSync Team", price: 49, isUser: false },
    { name: "RivalTech Pro", price: 59, isUser: false },
    { name: "Your Professional", price: 79, isUser: true },
    { name: "StreamBase Pro", price: 89, isUser: false },
    { name: "CloudFlow Growth", price: 99, isUser: false },
    { name: "RivalTech Business", price: 149, isUser: false },
    { name: "DataSync Enterprise", price: 179, isUser: false },
    { name: "Your Enterprise", price: 199, isUser: true },
    { name: "CloudFlow Scale", price: 249, isUser: false }
  ],
  
  valueVsPriceData: [
    { name: "DataSync Individual", price: 15, valueScore: 35, isUser: false },
    { name: "RivalTech Basic", price: 19, valueScore: 42, isUser: false },
    { name: "Your Starter", price: 29, valueScore: 68, isUser: true },
    { name: "StreamBase Plus", price: 29, valueScore: 45, isUser: false },
    { name: "DataSync Team", price: 49, valueScore: 58, isUser: false },
    { name: "RivalTech Pro", price: 59, valueScore: 62, isUser: false },
    { name: "Your Professional", price: 79, valueScore: 82, isUser: true },
    { name: "StreamBase Pro", price: 89, valueScore: 65, isUser: false },
    { name: "CloudFlow Growth", price: 99, valueScore: 72, isUser: false },
    { name: "RivalTech Business", price: 149, valueScore: 75, isUser: false },
    { name: "DataSync Enterprise", price: 179, valueScore: 78, isUser: false },
    { name: "Your Enterprise", price: 199, valueScore: 92, isUser: true },
    { name: "CloudFlow Scale", price: 249, valueScore: 85, isUser: false }
  ]
};

export const DEMO_SIMULATION = {
  id: "sim-demo-1",
  createdAt: "2024-12-28T11:00:00Z",
  planName: "Professional",
  currentPrice: 79,
  newPrice: 99,
  currency: "USD",
  activeCustomers: 423,
  
  // Before vs After
  beforeAfter: {
    currentMRR: 33417,
    projectedMRR: 39303,
    mrrChange: "+17.6%",
    currentARR: 401004,
    projectedARR: 471636,
    arrChange: "+17.6%",
    estimatedChurn: 8.2,
    customersAfter: 388
  },
  
  // Scenarios
  scenarios: [
    {
      name: "Conservative",
      description: "Higher price sensitivity, more customer loss",
      projectedARR: 436800,
      customerLoss: 12.5,
      customersAfter: 370,
      recommended: false
    },
    {
      name: "Base",
      description: "Balanced projection using typical market responses",
      projectedARR: 471636,
      customerLoss: 8.2,
      customersAfter: 388,
      recommended: true
    },
    {
      name: "Aggressive",
      description: "Lower price sensitivity, minimal customer loss",
      projectedARR: 498960,
      customerLoss: 4.8,
      customersAfter: 403,
      recommended: false
    }
  ],
  
  // AI Analysis
  analysis: {
    summary: "Increasing the Professional plan from $79 to $99 represents a 25% price increase. Based on market analysis and your competitive positioning, this increase is within acceptable range but will likely result in some customer churn.",
    
    recommendation: "Proceed with the price increase using a grandfather clause for existing customers. Implement the new pricing for new signups immediately, and transition existing customers after 60-90 days with advance notice.",
    
    keyFactors: [
      "Your Professional tier offers more value than competitors at similar price points",
      "CloudFlow charges $99 for comparable features, validating your new price point",
      "Current customers have shown low price sensitivity historically"
    ],
    
    risks: [
      "Budget-conscious customers may downgrade to Starter or churn",
      "Competitors may use this as opportunity to poach price-sensitive customers",
      "Sales cycle may lengthen as prospects evaluate alternatives"
    ],
    
    sensitivityLevel: "Moderate"
  }
};

export const DEMO_METRICS = {
  mrr: 109200,
  mrrGrowth: 12.5,
  arr: 1310400,
  arpu: 129,
  arpuGrowth: 8.2,
  churnRate: 3.2,
  churnChange: -0.5,
  activeCustomers: 847,
  customerGrowth: 5.8,
  ltv: 4838,
  cac: 312,
  ltvCacRatio: 15.5
};

export const DEMO_USER = {
  id: "demo-user",
  fullName: "Demo User",
  email: "demo@example.com",
  plan: "growth",
  credits: {
    used: 5,
    total: 20,
    remaining: 15
  }
};

// Demo mode constants
export const DEMO_MODE_BANNER = {
  text: "Demo mode - sample data only",
  ctaText: "Run real analysis",
  ctaLink: "/register"
};

