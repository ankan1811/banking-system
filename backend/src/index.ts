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
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 8787;

// Global middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', requireAuth, accountsRoutes);
app.use('/api/banks', requireAuth, banksRoutes);
app.use('/api/transactions', requireAuth, transactionsRoutes);
app.use('/api/plaid', requireAuth, plaidRoutes);
app.use('/api/transfers', requireAuth, transfersRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
