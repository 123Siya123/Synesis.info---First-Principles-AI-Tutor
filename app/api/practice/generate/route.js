import { getApiKey } from '../../../lib/getApiKey';
import { robustFetch } from '../../../lib/apiUtils';

const SYSTEM_PROMPT_CORE = `You are an expert tutor designing a "Core Exercise Center" for deep learning. 
Your goal is to create 3-5 progressive exercises that force the user to apply knowledge, not just regurgitate it.
Format output as JSON: { "exercises": [ { "type": "Design|Troubleshoot|Innovate", "scenario": "...", "task": "..." } ] }
Rules:
- Scenarios must be realistic (e.g., engineering, medical, business contexts).
- Tasks must be open-ended.
- Avoid multiple choice.
`;

const SYSTEM_PROMPT_SAT = `You are an expert tutor designing SAT-style questions for a specific topic.
Generate 5 multiple-choice questions testing critical thinking and application.
Format output as JSON: { "questions": [ { "id": "1", "text": "...", "options": [ {"key": "A", "text": "..."}, ... ], "correctKey": "A", "explanation": "...", "relatedTopic": "..." } ] }
Rules:
- ONE option MUST be undeniably correct. Do NOT create "trick" questions where the correct answer is missing.
- Options must be plausible but clearly distinguishable from the correct one.
- The "explanation" must clearly explain WHY the correctKey is right and why others are wrong.
- Never claim the correct answer is missing or "closest to".
- Ensure the physics/math/logic is 100% accurate.
`;

export async function POST(req) {
    try {
        const { type, topic, context, model } = await req.json();

        const isGemini = model?.startsWith('gemini-');
        const provider = isGemini ? 'gemini' : 'groq';
        const apiKey = getApiKey(provider);

        if (!apiKey) {
            return NextResponse.json({ error: `Server configured incorrectly: Missing ${provider.toUpperCase()} API Key` }, { status: 500 });
        }

        const apiUrl = isGemini
            ? `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
            : 'https://api.groq.com/openai/v1/chat/completions';

        const defaultModel = isGemini ? 'gemini-1.5-flash' : 'llama-3.3-70b-versatile';

        let systemPrompt = "";
        let userPrompt = `Topic: ${topic}\nContext from mind map: ${context}\n`;

        if (type === 'core') {
            systemPrompt = SYSTEM_PROMPT_CORE;
            userPrompt += "Create 3 progressive exercises based on this context.";
        } else if (type === 'sat') {
            systemPrompt = SYSTEM_PROMPT_SAT;
            userPrompt += "Create 5 SAT-style questions based on this context.";
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        const response = await robustFetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || defaultModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        }, { maxRetries: 3, timeoutMs: 35000 });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `${provider.toUpperCase()} AI error`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Parse JSON
        const result = JSON.parse(content);
        return NextResponse.json({ result });

    } catch (err) {
        console.error("Generate error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
