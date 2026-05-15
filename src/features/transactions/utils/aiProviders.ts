import { Platform } from "react-native";

export type AiProvider = "gemini" | "claude";

interface CallParams {
  provider: AiProvider;
  apiKey: string;
  prompt: string;
}

export async function callAiProvider({
  provider,
  apiKey,
  prompt,
}: CallParams): Promise<string | null> {
  if (provider === "claude") return callClaude(apiKey, prompt);
  return callGemini(apiKey, prompt);
}

async function callGemini(apiKey: string, prompt: string): Promise<string | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error?.message || errorMsg;
    } catch {
      // body not JSON
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callClaude(apiKey: string, prompt: string): Promise<string | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  // Required by the Anthropic API to allow direct browser calls (CORS).
  if (Platform.OS === "web") {
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error?.message || errorMsg;
    } catch {
      // body not JSON
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const block = data.content?.find((c: { type: string }) => c.type === "text");
  return block?.text ?? null;
}
