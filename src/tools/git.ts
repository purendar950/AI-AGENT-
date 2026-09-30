import { exec } from "node:child_process";
import type { AgentTool, ToolResult } from "../types.js";

export function createGitTools(workspace: string): AgentTool[] {
  const run = (command: string): Promise<ToolResult> => new Promise(resolve => {
    exec(command, { cwd: workspace, timeout: 30000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      const output = [stdout, stderr].filter(Boolean).join("\n");
      resolve(error ? { ok: false, output, error: error.message } : { ok: true, output });
    });
  });
  return [
    { name:"git_status", description:"Show Git working tree status.", parameters:{type:"object",properties:{}}, execute:()=>run("git status --short --branch") },
    { name:"git_diff", description:"Show current Git diff, staged and unstaged.", parameters:{type:"object",properties:{}}, execute:()=>run("git diff -- && git diff --cached --") },
    { name:"git_create_checkpoint", description:"Commit current changes as a local checkpoint before risky work.", parameters:{type:"object",properties:{message:{type:"string"}},required:["message"]}, execute:({message})=>run("git add -A && git commit -m "+shellQuote(String(message))) },
    { name:"git_log", description:"Show recent commits.", parameters:{type:"object",properties:{count:{type:"integer"}}}, execute:({count=10})=>run(`git log --oneline -n ${Math.max(1,Math.min(50,Number(count)))}`) }
  ];
}
function shellQuote(value:string){ return "'" + value.replace(/'/g,"'\\''") + "'"; }
