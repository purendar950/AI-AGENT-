import type { AgentTool, LLMProvider, LLMResponse } from "./types.js";

export type AgentRole = "planner" | "coder" | "debugger" | "reviewer";

const prompts: Record<AgentRole,string> = {
 planner:"Analyze the task and repository evidence. Produce a concise implementation plan, risks, affected files, and verification commands. Do not edit files.",
 coder:"Implement the approved plan using the available tools. Prefer minimal, reversible changes. Verify your work.",
 debugger:"Diagnose the concrete failing command or test. Reproduce it, identify the root cause, repair it, and rerun verification.",
 reviewer:"Review the current diff and verification results for correctness, regressions, security problems, missing tests, and accidental changes. Make corrections when needed."
};

export async function roleCall(provider:LLMProvider, role:AgentRole, task:string, tools:AgentTool[]):Promise<LLMResponse>{
  return provider.chat([
    {role:"system",content:prompts[role]},
    {role:"user",content:task}
  ],tools);
}
