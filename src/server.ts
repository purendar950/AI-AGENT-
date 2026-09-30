import "dotenv/config";
import http from "node:http";
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

const workspace = path.resolve(process.env.AGENT_WORKSPACE || ".");
const port = Number(process.env.AGENT_PORT || 8787);
const apiKey = process.env.AI_API_KEY;
const model = process.env.AI_MODEL;
if (!apiKey || !model) throw new Error("Set AI_API_KEY and AI_MODEL.");
const timeout = Number(process.env.AGENT_TIMEOUT_MS || 120000);
const provider = new OpenAICompatibleProvider(process.env.AI_BASE_URL || "https://api.openai.com/v1", apiKey, model);
const makeAgent = () => new CodingAgent(provider, [
  ...createFileTools(workspace), createPatchTool(workspace), createRepositoryTool(workspace),
  createShellTool(workspace, timeout, process.env.AGENT_COMMAND_POLICY === "permissive" ? "permissive" : "strict"),
  ...createGitTools(workspace), createBrowserTool(workspace, timeout),
], { maxIterations:Number(process.env.AI_MAX_ITERATIONS||12), maxToolCalls:Number(process.env.AI_MAX_TOOL_CALLS||80), commandTimeoutMs:timeout, workspaceRoot:workspace, commandPolicy:"strict" });

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AI Agent</title><style>
body{font:16px system-ui;margin:0;background:#0b1020;color:#eef}main{max-width:1000px;margin:auto;padding:28px}textarea{width:100%;min-height:140px;background:#121a30;color:#fff;border:1px solid #334;border-radius:12px;padding:14px;box-sizing:border-box}button{margin-top:12px;padding:12px 20px;border:0;border-radius:10px;cursor:pointer}pre{white-space:pre-wrap;background:#080c17;padding:16px;border-radius:12px;overflow:auto}
</style></head><body><main><h1>AI Coding Agent</h1><p>Autonomous inspect → edit → test → repair loop.</p><textarea id="task" placeholder="Describe the change you want..."></textarea><br><button onclick="run()">Run agent</button><pre id="out">Ready.</pre><script>
async function run(){const task=document.getElementById('task').value;const out=document.getElementById('out');out.textContent='Running...';const r=await fetch('/api/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({task})});out.textContent=JSON.stringify(await r.json(),null,2)}
</script></main></body></html>`;

const server=http.createServer(async(req,res)=>{
  if(req.method==="GET"&&req.url==="/"){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});return res.end(html);}
  if(req.method==="GET"&&req.url==="/api/state"){const s=await new StateStore(workspace).load();res.writeHead(200,{"content-type":"application/json"});return res.end(JSON.stringify(s));}
  if(req.method==="POST"&&req.url==="/api/run"){
    let body="";for await(const chunk of req) body+=chunk;
    try{const task=JSON.parse(body).task;if(!task)throw new Error("task is required");const result=await makeAgent().run(String(task));await new StateStore(workspace).save(result);res.writeHead(200,{"content-type":"application/json"});return res.end(JSON.stringify(result));}
    catch(e){res.writeHead(400,{"content-type":"application/json"});return res.end(JSON.stringify({error:String(e)}));}
  }
  res.writeHead(404);res.end("Not found");
});
server.listen(port,"127.0.0.1",()=>console.log(`AI Agent UI: http://localhost:${port}`));
