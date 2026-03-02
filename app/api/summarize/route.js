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

        const apiUrl = isGemini
            ? `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
            : 'https://api.groq.com/openai/v1/chat/completions';

        const defaultModel = isGemini ? 'gemini-1.5-flash' : 'llama-3.1-8b-instant';

        // Use a lighter, faster model for summarization
        const response = await robustFetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || defaultModel,
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
        const summary = data.choices[0]?.message?.content;

        return NextResponse.json({ summary });

    } catch (error) {
        console.error('Summarization failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
