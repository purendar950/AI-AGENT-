import { exec } from "node:child_process";
import type { AgentTool, ToolResult } from "../types.js";

export function createShellTool(workspace: string, timeout: number): AgentTool {
  return {
    name: "run_command",
    description: "Run a development command inside the workspace. Use for install, build, test, lint and diagnostics.",
    parameters: {
      type: "object",
      properties: { command: { type: "string", description: "Command to execute." } },
      required: ["command"]
    },
    execute: (args): Promise<ToolResult> => new Promise(resolve => {
      const command = String(args.command ?? "");
      if (!command.trim()) return resolve({ ok: false, output: "", error: "command is required" });
      exec(command, { cwd: workspace, timeout, maxBuffer: 1024 * 1024 * 8 }, (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join("\n");
        resolve(error ? { ok: false, output, error: error.message } : { ok: true, output });
      });
    }),
  };
}