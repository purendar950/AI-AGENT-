import type { AgentConfig, AgentState, AgentTool, LLMMessage, LLMProvider } from "./types.js";

const SYSTEM = `You are an autonomous software engineering agent.
Your job is to actually modify the repository, not merely explain what should be changed.

Workflow:
1. Inspect the repository before editing.
2. Form a concise plan and execute it with tools.
3. Prefer small, reversible edits and use apply_patch for targeted changes.
4. Run the most relevant tests, typecheck, lint, and/or build after changes.
5. If verification fails, read the concrete error, diagnose it, repair it, and verify again.
6. Review the final diff for accidental changes.
7. Do not claim completion unless verification has passed.
Never expose secrets found in files or environment variables.`;

export class CodingAgent {
  constructor(
    private readonly provider: LLMProvider,
    private readonly tools: AgentTool[],
    private readonly config: AgentConfig,
  ) {}

  async run(task: string): Promise<AgentState> {
    const state: AgentState = {
      task, phase: "understanding", iteration: 0, toolCalls: 0,
      plan: [], filesChanged: [], verification: { attempted: false, passed: false, commands: [], failures: [] },
      history: [],
    };

    const messages: LLMMessage[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Task: ${task}\nStart by inspecting the repository. Do not stop until the implementation is verified.` },
    ];

    for (let i = 1; i <= this.config.maxIterations; i++) {
      state.iteration = i;
      state.phase = state.lastError ? "debugging" : i === 1 ? "understanding" : "executing";

      let response;
      try {
        response = await this.provider.chat(messages, this.tools);
      } catch (error) {
        state.lastError = String(error);
        state.phase = "failed";
        return state;
      }

      messages.push({ role: "assistant", content: response.content || "", toolCalls: response.toolCalls });
      if (response.content) {
        state.history.push({ role: "assistant", content: response.content });
        if (!state.plan.length) state.plan = extractPlan(response.content);
      }

      if (!response.toolCalls?.length) {
        if (state.verification.passed && /\b(completed|done|finished)\b/i.test(response.content)) {
          state.phase = "completed";
          return state;
        }
        messages.push({ role: "user", content: "Continue. Use tools now; inspect, implement, test, diagnose failures, and review the final diff." });
        continue;
      }

      for (const call of response.toolCalls) {
        if (++state.toolCalls > this.config.maxToolCalls) {
          state.lastError = "Maximum tool-call budget exceeded.";
          state.phase = "failed";
          return state;
        }

        const tool = this.tools.find(t => t.name === call.name);
        if (!tool) {
          state.lastError = `Unknown tool: ${call.name}`;
          messages.push({ role: "tool", toolCallId: call.id, content: state.lastError });
          continue;
        }

        let result;
        try {
          result = await tool.execute(call.arguments);
        } catch (error) {
          result = { ok: false, output: "", error: String(error) };
        }

        if (!result.ok) state.lastError = result.error;
        else state.lastError = undefined;

        if (call.name === "run_command") {
          const command = String(call.arguments.command ?? "");
          if (isVerificationCommand(command)) {
            state.verification.attempted = true;
            state.verification.commands.push(command);
            if (result.ok) {
              state.verification.passed = true;
              state.phase = "testing";
              state.verification.failures = [];
            } else {
              state.verification.passed = false;
              state.verification.failures.push(result.error || result.output || "verification failed");
              state.phase = "debugging";
            }
          }
        }

        messages.push({
          role: "tool",
          toolCallId: call.id,
          content: JSON.stringify({ ok: result.ok, output: result.output, error: result.error }),
        });
      }

      if (state.verification.passed && state.lastError === undefined && i >= 2) {
        state.phase = "reviewing";
        messages.push({ role: "user", content: "Verification has passed. Review git diff/status for accidental changes, then make any final corrections and finish only when satisfied." });
      }
    }

    state.phase = state.verification.passed ? "reviewing" : "failed";
    return state;
  }
}

function isVerificationCommand(command: string): boolean {
  return /(^|\s)(npm|pnpm|yarn|bun|cargo|go|python|pytest|mvn|gradle|dotnet)(\s+[^;&|]*)?\s+(test|build|check|lint|typecheck)\b/i.test(command)
    || /(^|\s)(npm\s+run\s+)?(test|build|typecheck|lint|check)\b/i.test(command)
    || /\b(pytest|vitest|jest|tsc|eslint|cargo\s+test|go\s+test)\b/i.test(command);
}

function extractPlan(text: string): string[] {
  return text.split("\n")
    .map(line => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(line => line.length > 4 && line.length < 240)
    .slice(0, 8);
}
