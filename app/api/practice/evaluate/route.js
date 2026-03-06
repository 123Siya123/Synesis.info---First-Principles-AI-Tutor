import { NextResponse } from 'next/server';
import { getApiKey } from '../../../lib/getApiKey';
import { robustFetch } from '../../../lib/apiUtils';

const SYSTEM_PRINCIPLES = `You are a First Principles tutor. 
Evaluate the user's answer based on the context.
If wrong, identify the fundamental misconception (e.g., "You confused voltage with current").
Explain from first principles.
Suggest a related simple search query for "Learn More".
Format output as JSON: { "feedback": { "isCorrect": boolean, "text": "...", "principles": "...", "learnMoreQuery": "..." }, "reply": "..." (for chat) }`;

export async function POST(req) {
    try {
        const { type, topic, context, input, questionId, currentData, model } = await req.json();

        const isGemini = model?.startsWith('gemini-');
        const provider = isGemini ? 'gemini' : 'groq';
        const apiKey = getApiKey(provider);

        if (!apiKey) {
            return NextResponse.json({ error: `Server configuration error: Missing ${provider.toUpperCase()} API Key` }, { status: 500 });
        }

        const defaultModel = isGemini ? 'gemini-2.5-flash' : 'llama-3.3-70b-versatile';
        const finalModel = model || defaultModel;

        const apiUrl = isGemini
            ? `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`
            : 'https://api.groq.com/openai/v1/chat/completions';

        // Select System Prompt based on type
        let systemPrompt = SYSTEM_PRINCIPLES; // Default

        if (type === 'core') {
            systemPrompt = `You are a world-class expert and senior practitioner in the field related to: ${topic}.
Your goal is to provide a rigorous, professional code/design review of the user's answer.
Your feedback must be:
1. **Critical & Analytical**: Do not just say "Good job". Analyze their thought process. Identify gaps, naive assumptions, or missing edge cases.
2. **Professional Standards**: Explain how this is done in the real world by experts. (e.g., "In a production environment, we would never ignore factor X...").
3. **Technical Precision**: Use precise terminology and explanations.
4. **The "Ideal" Approach**: Briefly describe how a top 1% expert would have solved this.

Output JSON: { "feedback": { "isCorrect": boolean, "text": "YOUR_DETAILED_ANALYSIS_HERE", "principles": "The underlying first principles...", "learnMoreQuery": "topic to search" } }
Keep the "text" field formatted with clear paragraphs or markdown emphasizing key points.`;
        }

        // Construct prompt
        let userPrompt = `Topic: ${topic}\nContext: ${context}\n`;

        if (type === 'core') {
            const exercises = currentData.exercises;
            const currentStep = currentData.currentStep || 0;
            const exercise = exercises[currentStep];
            userPrompt += `
Task: ${exercise.task}
Scenario: ${exercise.scenario}
User Answer: "${input}"

Provide a deep, expert-level critique of this answer.`;
        } else if (type === 'custom') {
            userPrompt += `User Request/Question: "${input}"
Provide a helpful, educational response or generating the requested task. 
If the user asks for questions, generate them in text format but formatted nicely.
Reply in the "reply" JSON field.`;
        } else if (type === 'sat') {
            userPrompt += `Question ID ${questionId}. User selected an option. Explain the concept from first principles.`;
        }

        const response = await robustFetch(apiUrl, {
            method: 'POST',
            headers: isGemini ? { 'Content-Type': 'application/json' } : {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(isGemini ? {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{
                    role: "user",
                    parts: [{ text: userPrompt }]
                }],
                generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
            } : {
                model: finalModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        }, { maxRetries: 3, timeoutMs: 30000 });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `${provider.toUpperCase()} AI error`);
        }

        const data = await response.json();

        let content = "{}";
        if (isGemini) {
            content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        } else {
            content = data.choices?.[0]?.message?.content || "{}";
        }

        const result = JSON.parse(content);

        return NextResponse.json(result);

    } catch (err) {
        console.error("Evaluate error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
