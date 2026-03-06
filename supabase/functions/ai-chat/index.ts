// supabase/functions/ai-chat/index.ts
// Supabase Edge Function — proxies Anthropic API calls to avoid browser CORS
// Deploy with:  npx supabase functions deploy ai-chat
//
// Required Supabase secret:
//   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
    // Handle preflight CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }

    try {
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!anthropicKey) {
            return new Response(
                JSON.stringify({ error: "ANTHROPIC_API_KEY secret is not set" }),
                { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        const body = await req.json();

        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": anthropicKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(body),
        });

        const data = await anthropicRes.json();

        // Extract the text reply so the client can use data.reply simply
        const reply =
            data.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text ??
            "Sorry, I couldn't respond right now.";

        return new Response(
            JSON.stringify({ reply, raw: data }),
            {
                status: anthropicRes.ok ? 200 : anthropicRes.status,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
});
