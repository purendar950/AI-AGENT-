import type { AgentTool, LLMMessage, LLMProvider, LLMResponse } from "../types.js";

export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async chat(messages: LLMMessage[], tools: AgentTool[]): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.1,
        tools: tools.length ? tools.map(t => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: { type: "object", properties: {} } }
        })) : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
    }

    const json = await response.json() as any;
    const message = json.choices?.[0]?.message;
    if (!message) throw new Error("LLM returned no message");

    const toolCalls = (message.tool_calls ?? []).map((call: any) => ({
      name: call.function.name,
      arguments: JSON.parse(call.function.arguments || "{}"),
    }));

    return { content: message.content ?? "", toolCalls };
  }
}