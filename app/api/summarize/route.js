import { NextResponse } from 'next/server';
import { getApiKey } from '../../lib/getApiKey';
import { robustFetch } from '../../lib/apiUtils';

export async function POST(request) {
    try {
        const { content, model } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const isGemini = model?.startsWith('gemini-');
        const provider = isGemini ? 'gemini' : 'groq';
        const apiKey = getApiKey(provider);

        if (!apiKey) {
            return NextResponse.json({ error: `Server misconfiguration: Missing ${provider.toUpperCase()} API Key` }, { status: 500 });
        }

        const defaultModel = isGemini ? 'gemini-2.5-flash' : 'llama-3.1-8b-instant';
        const finalModel = model || defaultModel;

        const apiUrl = isGemini
            ? `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`
            : 'https://api.groq.com/openai/v1/chat/completions';

        // Use a lighter, faster model for summarization
        const response = await robustFetch(apiUrl, {
            method: 'POST',
            headers: isGemini ? { 'Content-Type': 'application/json' } : {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(isGemini ? {
                systemInstruction: { parts: [{ text: 'Summarize the following article concisely in 3-5 sentences. Capture the main concepts, key arguments, and any definitions provided. DO NOT start with "Here is a summary" or similar.' }] },
                contents: [{
                    role: "user",
                    parts: [{ text: content }]
                }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
            } : {
                model: finalModel,
                messages: [
                    {
                        role: 'system',
                        content: 'Summarize the following article concisely in 3-5 sentences. Capture the main concepts, key arguments, and any definitions provided. DO NOT start with "Here is a summary" or similar.'
                    },
                    { role: 'user', content: content }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        }, { maxRetries: 2, timeoutMs: 10000 });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Groq API Error: ${errData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const summary = isGemini
            ? data.candidates?.[0]?.content?.parts?.[0]?.text
            : data.choices?.[0]?.message?.content;

        return NextResponse.json({ summary });

    } catch (error) {
        console.error('Summarization failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
