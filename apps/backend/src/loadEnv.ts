import dotenv from 'dotenv';
import path from 'path';

// Ensure backend env variables are loaded before any other imports
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
