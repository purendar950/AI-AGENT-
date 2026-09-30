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
        messages: messages.map(toApiMessage),
        temperature: 0.1,
        tools: tools.length ? tools.map(t => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters }
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
      id: String(call.id),
      name: String(call.function?.name),
      arguments: parseArguments(call.function?.arguments),
    }));

    return { content: String(message.content ?? ""), toolCalls };
  }
}

function parseArguments(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  try {
    return JSON.parse(String(raw));
  } catch {
    throw new Error(`Model returned invalid tool arguments: ${String(raw)}`);
  }
}

function toApiMessage(message: LLMMessage): Record<string, unknown> {
  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content || null,
      ...(message.toolCalls?.length ? {
        tool_calls: message.toolCalls.map(call => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      } : {}),
    };
  }
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
  }
  return { role: message.role, content: message.content };
}
