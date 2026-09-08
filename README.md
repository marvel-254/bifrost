# Bifröst

A lightweight, OpenAI-compatible AI model gateway and intelligent router.

> One API. Many models. Intelligent routing.

## Quick Start

```bash
pnpm install
pnpm dev
```

## Structure

```text
bifrost/
├── apps/
│   ├── api/          # API gateway (Vercel serverless)
│   └── web/          # Dashboard
├── packages/
│   ├── router/       # Routing engine
│   ├── providers/    # Provider adapters
│   ├── models/       # Model registry
│   └── shared/       # Shared types/util
├── database/
│   ├── schema/       # Schema definitions
│   └── migrations/   # SQL migrations
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
```

## Documentation

See [PLAN.md](PLAN.md) for the product roadmap and [AGENTS.md](AGENTS.md) for agent execution rules.

## License

MIT
