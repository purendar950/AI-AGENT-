# AI-AGENT Architecture

## Runtime layers

1. **CLI / UI** — accepts a task and streams state.
2. **Agent Core** — maintains task state and the autonomous loop.
3. **LLM Provider** — OpenAI-compatible today; adapters can be added later.
4. **Tool Engine** — files, shell, Git, browser, MCP and verification tools.
5. **Workspace** — isolated project directory with future checkpoints/snapshots.
6. **Verification** — tests, typecheck, lint, build and browser checks.

## Autonomous loop

```
Task
  -> inspect
  -> plan
  -> edit
  -> execute
  -> verify
  -> diagnose failure
  -> repair
  -> verify again
  -> review
  -> complete
```

The loop is bounded by `AI_MAX_ITERATIONS` to prevent runaway execution.

## Provider contract

All model access goes through `LLMProvider`. The first implementation uses the OpenAI-compatible Chat Completions API, so custom base URLs and compatible providers work without changing the agent core.

## Security direction

The current file tools enforce workspace path boundaries and shell execution has a timeout. Future releases should add command allow/deny policies, secret redaction, approval gates, network controls, and stronger OS/container isolation before unattended use.

## Roadmap

- Repository indexer + tree-sitter
- Checkpoints and rollback
- Dedicated planner/coder/debugger/reviewer roles
- Browser verification with Playwright
- MCP client
- GitHub issue/PR/CI automation
- SQLite task/session persistence
- Android runtime + WebView
