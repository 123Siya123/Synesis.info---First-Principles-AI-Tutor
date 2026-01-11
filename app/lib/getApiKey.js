
// Simple round-robin key rotation for load balancing
let currentKeyIndex = 0;

export function getRotatedGroqKey() {
    // Collect all available keys from environment
    const keys = [
        process.env.GROQ_API_KEY,      // Original/Primary
        process.env.GROQ_API_KEY_2,    // Secondary
        process.env.GROQ_API_KEY_3,    // Tertiary
        process.env.NEXT_PUBLIC_GROQ_API_KEY // Fallback
    ].filter(key => key?.startsWith('gsk_')); // Filter out undefined or empty strings

    if (keys.length === 0) {
        console.error("No valid Groq API keys found in environment variables.");
        return null;
    }

    // Get current key
    const key = keys[currentKeyIndex];

    // Rotate index for next call
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;

    console.log(`Using Groq API Key Index: ${currentKeyIndex} (Total: ${keys.length})`);

    return key;
}
