import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { provider, baseUrl, model, apiKey, systemPrompt, messages, query } = body;

        if (!apiKey) {
            return NextResponse.json({ error: "Thiếu API Key" }, { status: 400 });
        }

        let aiText = "";

        if (provider === "Gemini") {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const contents = [
                {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\nHãy dựa vào dữ liệu trên để bắt đầu hội thoại.` }]
                },
                {
                    role: "model",
                    parts: [{ text: "Tôi đã hiểu toàn bộ cấu trúc dữ liệu CRM của ABA. Xin mời bạn đặt câu hỏi phân tích." }]
                }
            ];

            messages.forEach((m: any) => {
                contents.push({
                    role: m.role === "user" ? "user" : "model",
                    parts: [{ text: m.text }]
                });
            });

            contents.push({
                role: "user",
                parts: [{ text: query }]
            });

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Gemini API Error: ${err}`);
            }

            const data = await res.json();
            aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        } else if (provider === "OpenAI-compatible") {
            const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
            const messagesPayload = [
                { role: "system", content: systemPrompt },
                ...messages.map((m: any) => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: m.text
                })),
                { role: "user", content: query }
            ];

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messagesPayload
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`OpenAI API Error: ${err}`);
            }

            const data = await res.json();
            aiText = data.choices?.[0]?.message?.content || "";

        } else if (provider === "Anthropic-compatible") {
            const endpoint = `${baseUrl.replace(/\/$/, "")}/messages`;
            const messagesPayload = [
                ...messages.map((m: any) => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: m.text
                })),
                { role: "user", content: query }
            ];

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: model,
                    system: systemPrompt,
                    messages: messagesPayload,
                    max_tokens: 4096
                })
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Anthropic API Error: ${err}`);
            }

            const data = await res.json();
            aiText = data.content?.[0]?.text || "";
        }

        return NextResponse.json({ success: true, text: aiText });
    } catch (error: any) {
        console.error("AI Proxy Error:", error);
        return NextResponse.json({ error: error.message || "Lỗi xử lý yêu cầu AI" }, { status: 500 });
    }
}
