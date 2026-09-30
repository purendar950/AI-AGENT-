# AI-AGENT

An autonomous coding agent designed to inspect repositories, plan changes, edit code, run tests, diagnose failures, and repair them automatically.

## Current architecture

- TypeScript + Node.js core
- OpenAI-compatible provider abstraction
- Tool engine for files, search, shell, Git and verification
- Iterative plan → execute → test → diagnose → repair loop
- Workspace boundaries and command timeouts
- CLI entry point
- Vitest test foundation

## Quick start

```bash
npm install
cp .env.example .env
npm run typecheck
npm test
npm start -- "Fix the failing tests in this repository"
```

Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` in `.env`.

## Roadmap

1. Core agent loop
2. Repository indexing and symbol-aware context
3. Git checkpoints and rollback
4. Browser/UI verification
5. Multi-agent planner/coder/debugger/reviewer roles
6. MCP support
7. GitHub issue → branch → PR → CI repair loop
8. Android embedded runtime and WebView UI

## Safety

The agent executes commands in the configured workspace and enforces timeouts. Production deployment, destructive commands, secrets, and unrestricted host access should remain behind explicit permission policies.
