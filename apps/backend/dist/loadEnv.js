"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Get the backend root directory (one level up from src)
const backendRoot = path_1.default.resolve(__dirname, '..');
// Try multiple possible locations for env files
const possibleEnvPaths = [
    path_1.default.join(backendRoot, '.env.local'),
    path_1.default.join(backendRoot, '.env'),
    path_1.default.join(process.cwd(), '.env.local'),
    path_1.default.join(process.cwd(), '.env'),
];
let loaded = false;
for (const envPath of possibleEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        console.log(`Loading environment from: ${envPath}`);
        dotenv_1.default.config({ path: envPath });
        loaded = true;
        break;
    }
}
if (!loaded) {
    console.error('❌ No .env.local or .env file found in:');
    possibleEnvPaths.forEach(p => console.error(`   - ${p}`));
    console.error('\nPlease create apps/backend/.env.local with your Supabase credentials.');
    console.error('Run: cp apps/backend/.env.example apps/backend/.env.local');
}
// Debug: Show what was loaded (without showing sensitive values)
if (process.env.SUPABASE_URL) {
    console.log('✓ SUPABASE_URL loaded:', process.env.SUPABASE_URL);
}
else {
    console.error('✗ SUPABASE_URL not found in environment');
}
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✓ SUPABASE_SERVICE_ROLE_KEY loaded');
}
else {
    console.error('✗ SUPABASE_SERVICE_ROLE_KEY not found in environment');
}
