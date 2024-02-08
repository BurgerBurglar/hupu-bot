import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import { INITIAL_PROMPT } from "./const";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export const getChatResponse = async ({ prompt }: { prompt: string }) => {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: INITIAL_PROMPT },
    { role: "user", content: prompt },
  ];
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4",
    messages,
  });
  const response = chatCompletion.choices[0].message?.content;
  return response;
};
