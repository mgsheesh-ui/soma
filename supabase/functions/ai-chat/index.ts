// @ts-nocheck — This is a Deno Edge Function; Deno globals (Deno, serve) are not available in the Node/browser tsconfig used by VS Code.
// Deploy with: npx supabase functions deploy ai-chat

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
        const body = await req.json();

        // Anthropic logic has been removed as Qwen is now being used from the groq key.
        // This edge function can be repurposed for other server-side logic or safely ignored.

        return new Response(
            JSON.stringify({ reply: "Anthropic integration removed." }),
            {
                status: 200,
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
