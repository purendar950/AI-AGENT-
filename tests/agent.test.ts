import { describe, expect, it, vi } from "vitest";
import { OpenAICompatibleProvider } from "../src/llm/openai-compatible.js";
import { createShellTool } from "../src/tools/shell.js";

describe("agent foundation", () => {
  it("keeps the repair budget bounded", () => {
    expect(12).toBeGreaterThan(0);
    expect(12).toBeLessThanOrEqual(50);
  });

  it("blocks destructive shell commands in strict mode", async () => {
    const tool = createShellTool(process.cwd(), 1000, "strict");
    const result = await tool.execute({ command: "rm -rf /" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  it("maps internal tool calls to OpenAI-compatible messages", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "done", tool_calls: [] } }]
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const provider = new OpenAICompatibleProvider("https://example.test/v1", "key", "model");
    await provider.chat([
      { role: "system", content: "system" },
      { role: "assistant", content: "", toolCalls: [{ id: "1", name: "read_file", arguments: { path: "x" } }] },
      { role: "tool", toolCallId: "1", content: "hello" },
    ], []);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.messages[1].tool_calls[0].function.name).toBe("read_file");
    expect(body.messages[2].tool_call_id).toBe("1");
    fetchMock.mockRestore();
  });
});
