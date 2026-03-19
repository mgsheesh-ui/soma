// @ts-nocheck — Deno Edge Function
// Deploy with: npx supabase functions deploy ai-chat
//
// Required Supabase secret:
//   npx supabase secrets set OPENROUTER_API_KEY=sk-or-...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
};

// Free models on OpenRouter — tried in order until one succeeds.
// The ":free" suffix guarantees $0 cost. Add/remove models here freely.
const FREE_MODELS = [
    "meta-llama/llama-4-scout:free",
    "qwen/qwen3-32b:free",
    "deepseek/deepseek-r1:free",
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-7b-instruct:free",
];

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }

    try {
        const { messages, systemPrompt } = await req.json();

        const apiKey = Deno.env.get("OPENROUTER_API_KEY");
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "OPENROUTER_API_KEY secret is not set." }),
                { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        // Build the message array — system prompt first, then conversation history
        const openRouterMessages = [
            { role: "system", content: systemPrompt },
            ...messages,
        ];

        // Try each free model in order until one succeeds
        let lastError = "";
        for (const model of FREE_MODELS) {
            try {
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                        "HTTP-Referer": "https://soma-fitness.app", // Identifies your app on OpenRouter
                        "X-Title": "Soma Fitness AI Trainer",
                    },
                    body: JSON.stringify({
                        model,
                        max_tokens: 512,
                        messages: openRouterMessages,
                    }),
                });

                if (!res.ok) {
                    const errBody = await res.text();
                    // 429 = rate limited, 503 = model unavailable — try next model
                    if (res.status === 429 || res.status === 503) {
                        lastError = `${model}: ${res.status}`;
                        continue;
                    }
                    throw new Error(`OpenRouter error ${res.status}: ${errBody}`);
                }

                const data = await res.json();
                const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't respond right now.";
                const usedModel = data.model || model;

                return new Response(
                    JSON.stringify({ reply, model: usedModel }),
                    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
                );
            } catch (modelErr) {
                lastError = String(modelErr);
                // If fetch itself failed, try the next model
                continue;
            }
        }

        // All models exhausted
        return new Response(
            JSON.stringify({ error: `All models failed. Last error: ${lastError}` }),
            { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
});
