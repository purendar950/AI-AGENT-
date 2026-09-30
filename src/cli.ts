import "dotenv/config";
import path from "node:path";
import { OpenAICompatibleProvider } from "./llm/openai-compatible.js";
import { CodingAgent } from "./agent.js";
import { createFileTools } from "./tools/files.js";
import { createShellTool } from "./tools/shell.js";
import { createGitTools } from "./tools/git.js";

const task = process.argv.slice(2).join(" ").trim();
if (!task) {
  console.error('Usage: npm start -- "Fix the failing tests"');
  process.exit(1);
}

const apiKey = process.env.AI_API_KEY;
const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
const model = process.env.AI_MODEL;
if (!apiKey || !model) {
  console.error("Set AI_API_KEY and AI_MODEL in .env");
  process.exit(1);
}

const workspace = path.resolve(process.env.AGENT_WORKSPACE || ".");
const provider = new OpenAICompatibleProvider(baseUrl, apiKey, model);
const tools = [
  ...createFileTools(workspace),
  createShellTool(workspace, Number(process.env.AGENT_TIMEOUT_MS || 120000)),
  ...createGitTools(workspace),
];

const agent = new CodingAgent(provider, tools, {
  maxIterations: Number(process.env.AI_MAX_ITERATIONS || 8),
  commandTimeoutMs: Number(process.env.AGENT_TIMEOUT_MS || 120000),
  workspaceRoot: workspace,
});

const result = await agent.run(task);
console.log(JSON.stringify(result, null, 2));
if (result.phase === "failed") process.exit(2);
