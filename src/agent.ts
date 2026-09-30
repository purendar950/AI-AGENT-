import type { AgentConfig, AgentState, AgentTool, LLMMessage, LLMProvider } from "./types.js";

const SYSTEM = `You are an autonomous software engineering agent.
Inspect before editing. Make small, reversible changes.
Use tools to understand the repository, implement the task, and verify it.
Never claim completion without verification. When a command fails, diagnose the concrete error and repair it.
A task is complete only after relevant verification has passed.`;

export class CodingAgent {
  constructor(
    private readonly provider: LLMProvider,
    private readonly tools: AgentTool[],
    private readonly config: AgentConfig,
  ) {}

  async run(task: string): Promise<AgentState> {
    const state: AgentState = {
      task, phase: "understanding", iteration: 0, plan: [], filesChanged: [], history: [],
    };

    const messages: LLMMessage[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: task },
    ];
    let verified = false;

    for (let i = 1; i <= this.config.maxIterations; i++) {
      state.iteration = i;
      state.phase = state.lastError ? "debugging" : (i === 1 ? "understanding" : "executing");

      const response = await this.provider.chat(messages, this.tools);
      messages.push({
        role: "assistant",
        content: response.content || "",
        toolCalls: response.toolCalls,
      });
      if (response.content) state.history.push({ role: "assistant", content: response.content });

      if (!response.toolCalls?.length) {
        if (verified && /\b(completed|done|finished)\b/i.test(response.content)) {
          state.phase = "completed";
          return state;
        }
        messages.push({
          role: "user",
          content: "Continue working. Use the available tools to implement and verify the task; do not stop with a status message.",
        });
        continue;
      }

      for (const call of response.toolCalls) {
        const tool = this.tools.find(t => t.name === call.name);
        if (!tool) {
          state.lastError = `Unknown tool: ${call.name}`;
          messages.push({ role: "tool", toolCallId: call.id, content: state.lastError });
          continue;
        }

        const result = await tool.execute(call.arguments);
        state.lastError = result.ok ? undefined : result.error;
        if (result.ok && ["run_command"].includes(call.name) &&
            /(?:test|build|typecheck|lint|check)/i.test(String(call.arguments.command ?? ""))) {
          verified = true;
          state.phase = "testing";
        }
        messages.push({
          role: "tool",
          toolCallId: call.id,
          content: JSON.stringify({ ok: result.ok, output: result.output, error: result.error }),
        });
      }
    }

    state.phase = "failed";
    return state;
  }
}