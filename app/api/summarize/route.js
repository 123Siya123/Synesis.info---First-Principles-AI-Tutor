import { NextResponse } from 'next/server';
import { getRotatedGroqKey } from '../../lib/getApiKey';
import { robustFetch } from '../../lib/apiUtils';

export async function POST(request) {
    try {
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const apiKey = getRotatedGroqKey();
        if (!apiKey) {
            return NextResponse.json({ error: 'Server misconfiguration: Missing API Key' }, { status: 500 });
        }

        // Use a lighter, faster model for summarization
        // llama-3.1-8b-instant is a good choice for speed and cost
        const response = await robustFetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
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
