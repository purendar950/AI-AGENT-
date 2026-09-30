import { exec } from "node:child_process";
import type { AgentTool, ToolResult } from "../types.js";

export function createGitTools(workspace: string): AgentTool[] {
  const run = (command: string): Promise<ToolResult> => new Promise(resolve => {
    exec(command, { cwd: workspace, timeout: 30000, maxBuffer: 1024 * 1024 * 4 }, (error, stdout, stderr) => {
      const output = [stdout, stderr].filter(Boolean).join("\n");
      resolve(error ? { ok: false, output, error: error.message } : { ok: true, output });
    });
  });
  return [
    { name: "git_status", description: "Show Git working tree status.", execute: () => run("git status --short --branch") },
    { name: "git_diff", description: "Show the current Git diff.", execute: () => run("git diff --") },
  ];
}