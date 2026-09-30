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
import { createIndexTools } from "./tools/index.js";
import { createVerificationTools } from "./tools/verification.js";
import { StateStore } from "./state.js";
import { MCPStdioClient } from "./mcp.js";

const task = process.argv.slice(2).join(" ").trim();
if (!task) { console.error('Usage: npm start -- "Fix the failing tests"'); process.exit(1); }

const apiKey = process.env.AI_API_KEY;
const model = process.env.AI_MODEL;
if (!apiKey || !model) { console.error("Set AI_API_KEY and AI_MODEL in .env"); process.exit(1); }

const workspace = path.resolve(process.env.AGENT_WORKSPACE || ".");
const timeout = Number(process.env.AGENT_TIMEOUT_MS || 120000);
const policy = process.env.AGENT_COMMAND_POLICY === "permissive" ? "permissive" : "strict";
const provider = new OpenAICompatibleProvider(process.env.AI_BASE_URL || "https://api.openai.com/v1", apiKey, model);

const tools = [
  ...createFileTools(workspace), createPatchTool(workspace), createRepositoryTool(workspace),
  createShellTool(workspace, timeout, policy), ...createGitTools(workspace),
  createBrowserTool(workspace, timeout), ...createIndexTools(workspace),
  ...createVerificationTools(workspace, timeout)
];

const mcpClients:MCPStdioClient[]=[];
if(process.env.MCP_SERVERS){
  try{
    const configs=JSON.parse(process.env.MCP_SERVERS);
    if(!Array.isArray(configs)) throw new Error("MCP_SERVERS must be a JSON array");
    for(const config of configs){
      const client=new MCPStdioClient(config);
      try{ tools.push(...await client.listTools()); mcpClients.push(client); }
      catch(error){ await client.close(); console.error("MCP server unavailable:",String(error)); }
    }
  }catch(error){ console.error("Invalid MCP_SERVERS:",String(error)); }
}

const agent = new CodingAgent(provider, tools, {
  maxIterations:Number(process.env.AI_MAX_ITERATIONS || 20),
  maxToolCalls:Number(process.env.AI_MAX_TOOL_CALLS || 120),
  commandTimeoutMs:timeout, workspaceRoot:workspace, commandPolicy:policy
});
const result=await agent.run(task);
await new StateStore(workspace).save(result);
for(const client of mcpClients) await client.close();
console.log(JSON.stringify(result,null,2));
if(result.phase==="failed") process.exit(2);
