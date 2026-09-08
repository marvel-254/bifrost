// Demo data — clearly labeled illustrative values, NOT production metrics
// Replace with real backend telemetry when available

export const demoMetrics = {
  requests: 12847,
  tokens: 4219800,
  cost: 184.32,
  cacheHits: 8934,
  avgLatency: 842,
  uptime: 99.97,
  compressionRate: 31.2,
  fallbackRate: 2.1,
  activeRoutes: 342,
  requestsPerMin: 47,
  tokensPerMin: 15420,
  optimizerScore: 94,
} as const;

export const demoProviders = [
  { name: 'OpenAI', pct: 31 },
  { name: 'Anthropic', pct: 25 },
  { name: 'Google', pct: 23 },
  { name: 'Groq', pct: 12 },
  { name: 'Free tier', pct: 9 },
];

export const demoProvidersProposed = [
  { name: 'OpenAI', pct: 28 },
  { name: 'Anthropic', pct: 22 },
  { name: 'Google', pct: 25 },
  { name: 'Groq', pct: 15 },
  { name: 'Free tier', pct: 10 },
];

export const demoRoutingCandidates = [
  { name: 'Claude Sonnet 4', provider: 'Anthropic', score: 82, capability: 95, quality: 92, latency: 78, cost: 65, health: 98 },
  { name: 'GPT-4o', provider: 'OpenAI', score: 76, capability: 90, quality: 88, latency: 82, cost: 55, health: 95 },
  { name: 'Gemini 2.5 Flash', provider: 'Google', score: 71, capability: 85, quality: 80, latency: 90, cost: 85, health: 92 },
  { name: 'Llama 3.3 70B', provider: 'Groq', score: 68, capability: 78, quality: 75, latency: 95, cost: 95, health: 88 },
];

export const demoRouteDecision = {
  winner: 'Claude Sonnet 4',
  provider: 'Anthropic',
  score: 82,
  factors: [
    { label: 'Capability match', value: '+22', pct: 88 },
    { label: 'Historical quality', value: '+18', pct: 72 },
    { label: 'Provider health', value: '+15', pct: 60 },
    { label: 'Latency prediction', value: '+12', pct: 48 },
    { label: 'Quota availability', value: '+8', pct: 32 },
    { label: 'Cost', value: '-3', pct: 12 },
  ],
};

export const demoOptimizerScore = {
  total: 94,
  breakdown: [
    { label: 'Cost efficiency', value: 92 },
    { label: 'Token efficiency', value: 97 },
    { label: 'Latency', value: 89 },
    { label: 'Reliability', value: 99 },
    { label: 'Route quality', value: 94 },
  ],
};

export const demoSimulator = {
  current: {
    label: 'Current Policy',
    cost: 4821,
    latency: 1.42,
    failureRate: 3.2,
    tokens: 48.2,
    providers: demoProviders,
  },
  proposed: {
    label: 'Proposed Policy',
    cost: 3604,
    latency: 1.17,
    failureRate: 1.8,
    tokens: 34.7,
    providers: demoProvidersProposed,
  },
};

export const demoTrace = [
  { step: 'Request', status: 'ok', latency: '0ms' },
  { step: 'Authentication', status: 'ok', latency: '2ms' },
  { step: 'Tenant Resolution', status: 'ok', latency: '1ms' },
  { step: 'Policy', status: 'ok', latency: '3ms' },
  { step: 'Classification', status: 'ok', latency: '12ms' },
  { step: 'Compression', status: 'ok', latency: '45ms' },
  { step: 'Cache', status: 'miss', latency: '8ms' },
  { step: 'Capability Filtering', status: 'ok', latency: '2ms' },
  { step: 'Route Scoring', status: 'ok', latency: '15ms' },
  { step: 'Provider', status: 'ok', latency: '680ms' },
  { step: 'Validation', status: 'ok', latency: '18ms' },
  { step: 'Response', status: 'ok', latency: '0ms' },
];

export const demoQuota = [
  { provider: 'Provider A', account: 'Account 1', remaining: 72 },
  { provider: 'Provider A', account: 'Account 2', remaining: 41 },
  { provider: 'Provider B', account: 'Account 1', remaining: 89 },
  { provider: 'Provider C', account: 'Free tier', remaining: 18 },
];

export const demoPolicy = {
  name: 'Production Coding',
  when: [
    { key: 'tag', value: 'coding' },
    { key: 'environment', value: 'production' },
  ],
  require: ['tools', 'structured output', 'EU residency'],
  limit: [
    { key: 'max cost', value: '$0.03' },
    { key: 'max latency', value: '2000ms' },
  ],
  prefer: ['quality = high'],
  fallback: 'automatic',
};
