
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side Supabase client (for use in browser/React components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client factory (for use in API routes)
// Uses service role key for admin operations
let serverClient = null;

export function getServerClient() {
    if (serverClient) return serverClient;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        console.warn('[Supabase] No service role key found, falling back to anon key');
        return supabase;
    }

    serverClient = createClient(supabaseUrl, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    return serverClient;
}
