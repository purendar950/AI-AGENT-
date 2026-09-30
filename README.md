# AI Agent

Autonomous coding agent for real repository work: inspect, plan, edit, test, diagnose, repair, and review.

## Capabilities

- OpenAI-compatible provider with configurable API key, base URL, and model.
- Safe repository file operations and targeted patches.
- Git status, diff, history, and checkpoints.
- Explicit test, typecheck, build, and full CI verification tools.
- Lightweight source symbol indexing and search.
- Browser smoke checks with Playwright.
- Persistent execution state in .agent/state.json.
- Local dashboard on 127.0.0.1:8787.
- MCP stdio client with initialization and tool discovery.
- Strict shell policy, timeouts, and destructive-command blocking.
- GitHub Actions workflow for issue/manual task → agent → branch → pull request.

## Local setup

Install Node.js 22+, copy .env.example to .env, and configure:

    AI_API_KEY=
    AI_BASE_URL=https://api.openai.com/v1
    AI_MODEL=

Then:

    npm install
    npm start -- "Fix the failing tests and verify the build"

Dashboard:

    npm run server

## MCP

MCP_SERVERS accepts a JSON array of trusted stdio server configurations. Discovered tools are exposed to the agent with an mcp_ prefix.

Example:

    MCP_SERVERS=[{"name":"example","command":"npx","args":["-y","your-mcp-server"]}]

MCP servers execute with the same OS permissions as the agent, so only configure trusted servers.

## GitHub autonomous repair

The workflow at .github/workflows/agent-repair.yml supports:

1. Add the ai-fix label to an issue, or manually dispatch a task.
2. GitHub Actions checks out the repository and installs dependencies.
3. The coding agent inspects, edits, tests, diagnoses failures, and repairs them.
4. If changes exist, the workflow creates an ai-agent/* branch and pull request.
5. Normal CI remains the gate; the workflow does not auto-merge.

Required repository secrets:

- AI_API_KEY
- AI_MODEL
- Optional AI_BASE_URL

## Development

    npm run typecheck
    npm test
    npm run build

## Architecture

    CLI / Dashboard / GitHub Actions
                 |
             CodingAgent
                 |
       OpenAI-compatible LLM
                 |
             Tool Engine
       / Files / Patch / Search
       / Repository / Symbols
       / Shell / Verification
       / Git / Browser
       / MCP stdio
                 |
              Workspace
                 |
       Test -> Diagnose -> Repair -> Review

## Security

Workspace paths are constrained, shell commands have timeouts, strict mode blocks destructive patterns, browser checks accept only HTTP(S), and secrets are kept in environment variables.

Android packaging, remote authentication, semantic/vector retrieval, and richer multi-agent planning remain optional product extensions rather than prerequisites for the core autonomous coding runtime.
