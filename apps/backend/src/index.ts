import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env vars before importing auth which uses them
dotenv.config();

import { requireAuth } from './auth';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.get('/protected', requireAuth, (req, res) => {
  res.json({ message: 'Hello from protected route!', user: (req as any).user });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
