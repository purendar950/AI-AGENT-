export type AgentPhase =
  | "understanding" | "planning" | "executing" | "testing"
  | "debugging" | "reviewing" | "completed" | "failed";

export interface AgentConfig {
  maxIterations: number;
  maxToolCalls: number;
  commandTimeoutMs: number;
  workspaceRoot: string;
  commandPolicy: "strict" | "permissive";
}

export interface AgentState {
  task: string;
  phase: AgentPhase;
  iteration: number;
  toolCalls: number;
  plan: string[];
  filesChanged: string[];
  verification: {
    attempted: boolean;
    passed: boolean;
    commands: string[];
    failures: string[];
  };
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
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
}

export interface LLMProvider {
  chat(messages: LLMMessage[], tools: AgentTool[]): Promise<LLMResponse>;
}
