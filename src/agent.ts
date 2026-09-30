import type { AgentConfig, AgentState, AgentTool, LLMProvider } from "./types.js";

const SYSTEM = `You are an autonomous software engineering agent.
Work methodically. Inspect before editing. Prefer small, reversible changes.
Use tools to inspect the repository, implement the requested change, and verify it.
Never claim completion without verification.
When a command fails, diagnose the concrete error and repair it.
Keep the user task as the source of truth.`;

export class CodingAgent {
  constructor(
    private readonly provider: LLMProvider,
    private readonly tools: AgentTool[],
    private readonly config: AgentConfig,
  ) {}

  async run(task: string): Promise<AgentState> {
    const state: AgentState = {
      task,
      phase: "understanding",
      iteration: 0,
      plan: [],
      filesChanged: [],
      history: [],
    };

    const messages = [{ role: "system" as const, content: SYSTEM }, { role: "user" as const, content: task }];

    for (let i = 1; i <= this.config.maxIterations; i++) {
      state.iteration = i;
      state.phase = i === 1 ? "understanding" : state.lastError ? "debugging" : "executing";

      const response = await this.provider.chat(messages, this.tools);
      if (response.content) messages.push({ role: "assistant", content: response.content });

      if (!response.toolCalls?.length) {
        state.history.push({ role: "assistant", content: response.content });
        if (/\b(completed|done|finished)\b/i.test(response.content) && i > 1) state.phase = "reviewing";
        else state.phase = "planning";
        if (state.phase === "reviewing") {
          state.phase = "completed";
          return state;
        }
        continue;
      }

      for (const call of response.toolCalls) {
        const tool = this.tools.find(t => t.name === call.name);
        if (!tool) {
          messages.push({ role: "tool", content: `Unknown tool: ${call.name}` });
          continue;
        }
        const result = await tool.execute(call.arguments);
        state.lastError = result.ok ? undefined : result.error;
        messages.push({
          role: "tool",
          content: JSON.stringify({ tool: call.name, ok: result.ok, output: result.output, error: result.error }),
        });
      }
    }

    state.phase = "failed";
    return state;
  }
}