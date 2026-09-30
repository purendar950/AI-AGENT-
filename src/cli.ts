import "dotenv/config";
import path from "node:path";
import { OpenAICompatibleProvider } from "./llm/openai-compatible.js";
import { CodingAgent } from "./agent.js";
import { createFileTools } from "./tools/files.js";
import { createPatchTool } from "./tools/patch.js";
import { createRepositoryTool } from "./tools/repository.js";
import { createShellTool } from "./tools/shell.js";
import { createGitTools } from "./tools/git.js";
import { createBrowserTool } from "./tools/browser.js";
import { StateStore } from "./state.js";

const task = process.argv.slice(2).join(" ").trim();
if (!task) {
  console.error('Usage: npm start -- "Fix the failing tests"');
  process.exit(1);
}

const apiKey = process.env.AI_API_KEY;
const model = process.env.AI_MODEL;
if (!apiKey || !model) {
  console.error("Set AI_API_KEY and AI_MODEL in .env");
  process.exit(1);
}

const workspace = path.resolve(process.env.AGENT_WORKSPACE || ".");
const timeout = Number(process.env.AGENT_TIMEOUT_MS || 120000);
const policy = process.env.AGENT_COMMAND_POLICY === "permissive" ? "permissive" : "strict";
const provider = new OpenAICompatibleProvider(
  process.env.AI_BASE_URL || "https://api.openai.com/v1",
  apiKey,
  model,
);

const tools = [
  ...createFileTools(workspace),
  createPatchTool(workspace),
  createRepositoryTool(workspace),
  createShellTool(workspace, timeout, policy),
  ...createGitTools(workspace),
  createBrowserTool(workspace, timeout),
];

const agent = new CodingAgent(provider, tools, {
  maxIterations: Number(process.env.AI_MAX_ITERATIONS || 12),
  maxToolCalls: Number(process.env.AI_MAX_TOOL_CALLS || 80),
  commandTimeoutMs: timeout,
  workspaceRoot: workspace,
  commandPolicy: policy,
});

const result = await agent.run(task);
await new StateStore(workspace).save(result);
console.log(JSON.stringify(result, null, 2));
if (result.phase === "failed") process.exit(2);
