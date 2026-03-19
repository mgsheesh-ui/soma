// @ts-nocheck — Deno Edge Function
// Deploy with: npx supabase functions deploy ai-chat
//
// Required Supabase secret:
//   npx supabase secrets set OPENROUTER_API_KEY=sk-or-...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verified free models on OpenRouter (using exact IDs from their "free" filter)
const FREE_MODELS = [
    "stepfun/step-3.5-flash:free",
    "arcee-ai/trinity-large-preview:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "minimax/minimax-m2.5:free",
];

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                ...CORS_HEADERS,
                "Access-Control-Allow-Headers": req.headers.get("Access-Control-Request-Headers") || CORS_HEADERS["Access-Control-Allow-Headers"],
            },
        });
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

        // Version flag for debugging
        const responseMetadata = { version: "v1.6" };

        // Build the message array — system prompt first, then conversation history
        const openRouterMessages = [
            { role: "system", content: systemPrompt },
            ...messages,
        ];

        // Try each free model in order until one succeeds
        const errors: string[] = [];
        for (const model of FREE_MODELS) {
            try {
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                        "HTTP-Referer": "https://soma-fitness.app",
                        "X-Title": "Soma Fitness AI Trainer",
                    },
                    body: JSON.stringify({
                        model,
                        max_tokens: 2048,
                        messages: openRouterMessages,
                    }),
                });

                if (!res.ok) {
                    const errBody = await res.text();
                    errors.push(`${model}: ${res.status} - ${errBody}`);
                    continue;
                }

                const data = await res.json();
                const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't respond right now.";
                const usedModel = data.model || model;

                return new Response(
                    JSON.stringify({ reply, model: usedModel, ...responseMetadata }),
                    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
                );
            } catch (modelErr) {
                errors.push(`${model}: ${String(modelErr)}`);
                continue;
            }
        }

        // All models exhausted
        return new Response(
            JSON.stringify({ error: "All models failed.", details: errors, ...responseMetadata }),
            { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
});
