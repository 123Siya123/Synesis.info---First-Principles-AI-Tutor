
import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PRINCIPLES = `You are a First Principles tutor. 
Evaluate the user's answer based on the context.
If wrong, identify the fundamental misconception (e.g., "You confused voltage with current").
Explain from first principles.
Suggest a related simple search query for "Learn More".
Format output as JSON: { "feedback": { "isCorrect": boolean, "text": "...", "principles": "...", "learnMoreQuery": "..." }, "reply": "..." (for chat) }`;

export async function POST(req) {
    if (!GROQ_API_KEY) {
        return NextResponse.json({ error: "Server API Key missing" }, { status: 500 });
    }

    try {
        const { type, topic, context, input, questionId, currentData } = await req.json();

        // Construct prompt
        let userPrompt = `Topic: ${topic}\nContext: ${context}\n`;

        if (type === 'core') {
            const exercises = currentData.exercises; // Client sends current session data
            // In a real secure app, we'd fetch this from DB. Here we trust client state for speed/prototype.
            // We need to know WHICH exercise. currentData isn't enough if multiple steps.
            // But the client sends "input".
            // We assume the input corresponds to the *current* step logic if state is managed on client, 
            // but `PracticeHub` sends `currentData` which includes `currentStep`.
            const currentStep = currentData.currentStep || 0;
            const exercise = exercises[currentStep];
            userPrompt += `
Task: ${exercise.task}
Scenario: ${exercise.scenario}
User Answer: "${input}"

Evaluate the answer. specific 'isCorrect' (true/false), 'text' (feedback), 'principles' (first principles explanation), 'learnMoreQuery' (short topic string).`;
        } else if (type === 'custom') {
            userPrompt += `User Request/Question: "${input}"
Provide a helpful, educational response or generating the requested task. 
If the user asks for questions, generate them in text format but formatted nicely.
Reply in the "reply" JSON field.`;
        } else if (type === 'sat') {
            // SAT evaluation usually local if we have the answer key, or we can ask AI to explain specific user reasoning if they provided it.
            // But if just checking option:
            userPrompt += `Question ID ${questionId}. User selected an option. Explain the concept from first principles.`;
            // This might be redundant if we have pre-generated explanations.
            // Let's skip SAT deep eval here unless user asks for it.
            // For now, assume this endpoint is for Core/Custom mainly.
        }

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SYSTEM_PRINCIPLES },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${await response.text()}`);
        }

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);

        return NextResponse.json(result);

    } catch (err) {
        console.error("Evaluate error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
