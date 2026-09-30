import { exec } from "node:child_process";
import type { AgentTool, ToolResult } from "../types.js";

const BLOCKED = [
  /(^|[;&|\s])rm\s+-rf\s+\//i,
  /(^|[;&|\s])mkfs\b/i,
  /(^|[;&|\s])shutdown\b/i,
  /(^|[;&|\s])reboot\b/i,
  /(^|[;&|\s])dd\s+if=/i,
  /(^|[;&|\s])chmod\s+777\b/i,
  /(^|[;&|\s])curl\b.*\|\s*(sh|bash)/i,
  /(^|[;&|\s])wget\b.*\|\s*(sh|bash)/i,
  />\s*\/etc\//i,
];

export function createShellTool(workspace: string, timeout: number, policy: "strict" | "permissive" = "strict"): AgentTool {
  return {
    name: "run_command",
    description: "Run a development command inside the workspace. Use for install, build, test, lint and diagnostics. Commands are executed only in the configured workspace.",
    parameters: {
      type: "object",
      properties: { command: { type: "string", description: "Development command to execute." } },
      required: ["command"]
    },
    execute: (args): Promise<ToolResult> => new Promise(resolve => {
      const command = String(args.command ?? "").trim();
      if (!command) return resolve({ ok: false, output: "", error: "command is required" });
      if (policy === "strict" && BLOCKED.some(re => re.test(command))) {
        return resolve({ ok: false, output: "", error: "Command blocked by safety policy." });
      }
      exec(command, { cwd: workspace, timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join("\n").slice(-100_000);
        resolve(error ? { ok: false, output, error: error.message } : { ok: true, output });
      });
    }),
  };
}
