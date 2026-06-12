/**
 * Layer AI provider-agnostico.
 * Tutta l'app parla con questa interfaccia: cambiare modello (o far portare
 * al cliente la sua chiave, in fase 2) non tocca il resto del codice.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
export type Tool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};
export type LLMResult = {
  text: string;
  toolCalls: { name: string; input: Record<string, unknown> }[];
};

export interface LLMProvider {
  complete(opts: {
    system: string;
    messages: ChatMessage[];
    tools?: Tool[];
  }): Promise<LLMResult>;
}

class ClaudeProvider implements LLMProvider {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  async complete({ system, messages, tools }: any): Promise<LLMResult> {
    const res = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: messages.filter((m: ChatMessage) => m.role !== "system"),
      tools: tools?.map((t: Tool) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as any,
      })),
    });
    const text = res.content.filter((b) => b.type === "text").map((b: any) => b.text).join("\n");
    const toolCalls = res.content
      .filter((b) => b.type === "tool_use")
      .map((b: any) => ({ name: b.name, input: b.input }));
    return { text, toolCalls };
  }
}

class OpenAIProvider implements LLMProvider {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  async complete({ system, messages, tools }: any): Promise<LLMResult> {
    const res = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: system }, ...messages],
      tools: tools?.map((t: Tool) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      })),
    });
    const msg = res.choices[0].message;
    const toolCalls =
      msg.tool_calls?.map((c) => ({ name: c.function.name, input: JSON.parse(c.function.arguments) })) ?? [];
    return { text: msg.content ?? "", toolCalls };
  }
}

export function getProvider(): LLMProvider {
  return process.env.AI_PROVIDER === "openai" ? new OpenAIProvider() : new ClaudeProvider();
}
