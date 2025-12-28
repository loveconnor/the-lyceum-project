"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}
// Validate that SUPABASE_URL is an HTTP URL, not a PostgreSQL connection string
if (supabaseUrl && supabaseUrl.startsWith('postgresql://')) {
    throw new Error('SUPABASE_URL must be the HTTP API URL (e.g., http://127.0.0.1:54321), not the PostgreSQL connection string. ' +
        'Run "npx supabase start" and use the "API URL" value, not "DB URL".');
}
let adminClient = null;
const getSupabaseAdmin = () => {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Supabase admin client not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/backend/.env.local');
    }
    if (!adminClient) {
        adminClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return adminClient;
};
exports.getSupabaseAdmin = getSupabaseAdmin;
