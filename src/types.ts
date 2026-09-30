export type AgentPhase =
  | "understanding" | "planning" | "executing" | "testing"
  | "debugging" | "reviewing" | "completed" | "failed";

export interface AgentConfig {
  maxIterations: number;
  commandTimeoutMs: number;
  workspaceRoot: string;
}

export interface AgentState {
  task: string;
  phase: AgentPhase;
  iteration: number;
  plan: string[];
  filesChanged: string[];
  lastError?: string;
  history: Array<{ role: string; content: string }>;
}

export interface ToolResult {
  ok: boolean;
  output: string;
  error?: string;
  data?: unknown;
}

export interface AgentTool {
  name: string;
  description: string;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
}

export interface LLMProvider {
  chat(messages: LLMMessage[], tools: AgentTool[]): Promise<LLMResponse>;
}