import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Get the backend root directory (one level up from src)
const backendRoot = path.resolve(__dirname, '..');

// Try multiple possible locations for env files
const possibleEnvPaths = [
  path.join(backendRoot, '.env.local'),
  path.join(backendRoot, '.env'),
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env'),
];

let loaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from: ${envPath}`);
    dotenv.config({ path: envPath, override: true });
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
} else {
  console.error('✗ SUPABASE_URL not found in environment');
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('✓ SUPABASE_SERVICE_ROLE_KEY loaded');
} else {
  console.error('✗ SUPABASE_SERVICE_ROLE_KEY not found in environment');
}
