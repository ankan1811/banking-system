import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import accountsRoutes from './routes/accounts.routes.js';
import banksRoutes from './routes/banks.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import plaidRoutes from './routes/plaid.routes.js';
import transfersRoutes from './routes/transfers.routes.js';
import aiRoutes from './routes/ai.routes.js';
import chatRoutes from './routes/chat.routes.js';
import budgetsRoutes from './routes/budgets.routes.js';
import goalsRoutes from './routes/goals.routes.js';
import exportRoutes from './routes/export.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import { requireAuth } from './middleware/auth.js';
import { accountsRateLimit, aiRateLimit, exportRateLimit, analyticsRateLimit } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 8787;

// Global middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Routes (rate limits applied to external-call-heavy endpoints)
app.use('/api/auth', authRoutes);
app.use('/api/accounts', requireAuth, accountsRateLimit, accountsRoutes);
app.use('/api/banks', requireAuth, banksRoutes);
app.use('/api/transactions', requireAuth, transactionsRoutes);
app.use('/api/plaid', requireAuth, plaidRoutes);
app.use('/api/transfers', requireAuth, transfersRoutes);
app.use('/api/ai', requireAuth, aiRateLimit, aiRoutes);
app.use('/api/chat', requireAuth, chatRoutes); // chatRateLimit applied inside chat.routes.ts
app.use('/api/budgets', requireAuth, analyticsRateLimit, budgetsRoutes);
app.use('/api/goals', requireAuth, goalsRoutes);
app.use('/api/export', requireAuth, exportRateLimit, exportRoutes);
app.use('/api/analytics', requireAuth, analyticsRateLimit, analyticsRoutes);
app.use('/api/alerts', requireAuth, alertsRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
