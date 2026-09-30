# AI-AGENT

A self-hosted autonomous software-engineering agent. Give it a repository task and it can inspect the codebase, plan work, edit files, execute development commands, run verification, diagnose failures, repair them, review Git changes, and persist its run state.

## Architecture

```
CLI / Local Web UI
       |
   Agent Core
       |
  OpenAI-compatible LLM
       |
  Tool Engine
  |  |  |  |  |  |
files patch shell repo git browser
       |
   Workspace
       |
test / build / lint / UI verification
       |
diagnose -> repair -> verify
```

## Included now

- OpenAI-compatible provider with custom `AI_BASE_URL`
- Model selection through `AI_MODEL`
- Iterative autonomous tool loop with bounded iterations/tool calls
- Repository structure inspection
- Safe workspace file reads/writes/search
- Exact `apply_patch` editing
- Shell execution with strict safety blocks and timeouts
- Git status, diff, checkpoints and history
- Browser smoke testing through Playwright
- Persistent `.agent/state.json` run state
- Local web dashboard at `localhost:8787`
- GitHub Actions typecheck/test/build pipeline
- Vitest foundation tests

## Quick start

```bash
npm install
cp .env.example .env
# edit AI_API_KEY, AI_BASE_URL and AI_MODEL
npm run typecheck
npm test
npm start -- "Fix the failing tests in this repository"
```

For the dashboard:

```bash
npm run server
# open http://localhost:8787
```

For browser verification, install Playwright's browser once if needed:

```npx playwright install chromium```

## Provider configuration

Any provider exposing an OpenAI-compatible `/chat/completions` endpoint can be used:

- OpenAI
- compatible hosted providers
- local gateways
- self-hosted inference servers

Set:

```
AI_API_KEY=...
AI_BASE_URL=https://your-provider.example/v1
AI_MODEL=your-model
```

## Safety

The agent is intentionally bounded. Commands run inside the configured workspace, dangerous command patterns are blocked in strict mode, tool calls and iterations have limits, and the agent is instructed not to expose secrets. Review or checkpoint changes before allowing autonomous work on important repositories.

## Roadmap

The core coding agent is implemented. Remaining platform work is intentionally separated from the coding engine:

1. GitHub-native issue → branch → PR → CI repair automation
2. MCP server/client adapters
3. Rich multi-agent planner/coder/debugger/reviewer roles
4. Tree-sitter symbol indexing and semantic retrieval
5. Android embedded runtime/WebView packaging
6. Authentication, permissions and remote multi-user deployment
