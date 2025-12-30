import './loadEnv';
import express from 'express';
import cors from 'cors';

import { requireAuth } from './auth';
import aiRouter from './routes/ai';
import dashboardRouter from './routes/dashboard';
import labsRouter from './routes/labs';
import pathsRouter from './routes/paths';
import notificationsRouter from './routes/notifications';
import waitlistRouter from './routes/waitlist';

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

// AI routes (Gemini Flash 2.x)
app.use('/ai', requireAuth, aiRouter);
app.use('/dashboard', requireAuth, dashboardRouter);
app.use('/labs', requireAuth, labsRouter);
app.use('/paths', requireAuth, pathsRouter);
app.use('/notifications', requireAuth, notificationsRouter);
// Waitlist (public)
app.use('/waitlist', waitlistRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
