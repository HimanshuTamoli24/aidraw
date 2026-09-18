import Groq from "groq-sdk";
import { DIAGRAM_SYSTEM_PROMPT } from "./diagram/systemPrompt";
import { Diagram, DiagramSchema } from "./diagram/types";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function main() {
  const chatCompletion = await getGroqChatCompletion();
  // Print the completion returned by the LLM.
  console.log(chatCompletion.choices[0]?.message?.content || "");
}

// dont chnage model model remain same always
export async function getGroqChatCompletion() {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: "Explain the importance of fast language models",
      },
    ],
    model: "openai/gpt-oss-120b",
  });
}

/**
 * Extracts and parses JSON from raw LLM output, handling markdown blocks if present.
 */
function extractAndParseJson(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

/**
 * Calls Groq with model "openai/gpt-oss-120b" to generate structured whiteboard technical diagrams.
 */
export async function generateDiagramFromGroq(
  prompt: string,
  currentDiagram?: Diagram | null,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<Diagram> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: DIAGRAM_SYSTEM_PROMPT,
    },
  ];

  if (history && history.length > 0) {
    for (const msg of history.slice(-6)) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  let userPrompt = prompt;
  if (currentDiagram && currentDiagram.nodes && currentDiagram.nodes.length > 0) {
    userPrompt = `Current Diagram on Canvas:\n${JSON.stringify(currentDiagram, null, 2)}\n\nUser Request: ${prompt}\n\nPlease update or enhance the diagram as requested.`;
  }

  messages.push({
    role: "user",
    content: userPrompt,
  });

  const completion = await groq.chat.completions.create({
    messages,
    model: "openai/gpt-oss-120b",
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const rawContent = completion.choices[0]?.message?.content || "{}";
  const parsedJson = extractAndParseJson(rawContent);

  // Validate with Zod
  const validated = DiagramSchema.parse(parsedJson);
  return validated;
}
