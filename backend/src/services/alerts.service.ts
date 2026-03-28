import { prisma } from '../lib/db.js';
import { Resend } from 'resend';
import type { AICategory } from '@shared/types';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || '');
}

// ─── CRUD ─────────────────────────────────────────────────────

export async function getAlerts(userId: string) {
  return prisma.alertRule.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createAlert(
  userId: string,
  type: string,
  threshold: number,
  category?: AICategory,
) {
  return prisma.alertRule.create({
    data: { userId, type, threshold, category: category || null },
  });
}

export async function updateAlert(userId: string, alertId: string, data: { enabled?: boolean; threshold?: number }) {
  const updated = await prisma.alertRule.updateMany({
    where: { id: alertId, userId },
    data: {
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.threshold !== undefined && { threshold: data.threshold }),
    },
  });
  if (updated.count === 0) throw new Error('Alert not found');
  return prisma.alertRule.findUnique({ where: { id: alertId } });
}

export async function deleteAlert(userId: string, alertId: string) {
  const deleted = await prisma.alertRule.deleteMany({ where: { id: alertId, userId } });
  if (deleted.count === 0) throw new Error('Alert not found');
  return deleted;
}

// ─── Evaluation ───────────────────────────────────────────────

async function hasRecentTrigger(ruleId: string, withinMs: number): Promise<boolean> {
  const since = new Date(Date.now() - withinMs);
  const log = await prisma.alertTriggerLog.findFirst({
    where: { ruleId, triggeredAt: { gte: since } },
  });
  return !!log;
}

async function logAndEmail(ruleId: string, userEmail: string, subject: string, body: string) {
  await prisma.alertTriggerLog.create({
    data: { ruleId, details: JSON.stringify({ subject, body }) },
  });

  if (process.env.RESEND_API_KEY) {
    const resend = getResend();
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Ankan's Bank <noreply@example.com>",
      to: userEmail,
      subject,
      text: body,
    }).catch((err) => console.error('Alert email send failed:', err));
  } else {
    console.log(`[DEV ALERT] To: ${userEmail}\nSubject: ${subject}\n${body}`);
  }
}

export async function evaluateAlerts(
  userId: string,
  userEmail: string,
  transactions: any[],
  currentMonth: string,
) {
  const rules = await prisma.alertRule.findMany({ where: { userId, enabled: true } });
  if (!rules.length) return;

  const threshold28Days = 28 * 24 * 60 * 60 * 1000;
  const threshold1Hour = 60 * 60 * 1000;

  // Aggregate current month spending by category
  const monthlySpending: Record<string, number> = {};
  for (const t of transactions) {
    if (!t.date?.startsWith(currentMonth)) continue;
    const isDebit = (t as any).type === 'debit' || ((t as any).type !== 'credit' && t.amount < 0);
    if (!isDebit) continue;
    const cat = (t as any).aiCategory || t.category || 'Other';
    monthlySpending[cat] = (monthlySpending[cat] || 0) + Math.abs(t.amount);
  }

  // Batch-fetch all recent triggers instead of querying per rule
  const oldestThreshold = new Date(Date.now() - Math.max(threshold28Days, threshold1Hour));
  const recentTriggers = await prisma.alertTriggerLog.findMany({
    where: {
      ruleId: { in: rules.map((r) => r.id) },
      triggeredAt: { gte: oldestThreshold },
    },
    select: { ruleId: true, triggeredAt: true },
  });
  const triggersByRule = new Map<string, Date[]>();
  for (const t of recentTriggers) {
    const arr = triggersByRule.get(t.ruleId) || [];
    arr.push(t.triggeredAt);
    triggersByRule.set(t.ruleId, arr);
  }
  const hasRecentTriggerBatch = (ruleId: string, withinMs: number) => {
    const since = Date.now() - withinMs;
    return (triggersByRule.get(ruleId) || []).some((d) => d.getTime() >= since);
  };

  for (const rule of rules) {
    const threshold = parseFloat(rule.threshold.toString());

    if (rule.type === 'category_monthly_limit' && rule.category) {
      const spent = monthlySpending[rule.category] || 0;
      if (spent >= threshold) {
        if (!hasRecentTriggerBatch(rule.id, threshold28Days)) {
          await logAndEmail(
            rule.id,
            userEmail,
            `Budget Alert: ${rule.category} spending limit reached`,
            `Hi,\n\nYou've spent $${spent.toFixed(2)} on ${rule.category} this month, which exceeds your alert threshold of $${threshold.toFixed(2)}.\n\nConsider reviewing your spending in this category.\n\n— Ankan's Bank`,
          );
        }
      }
    }

    if (rule.type === 'single_transaction') {
      // Check most recent transaction
      const recent = [...transactions]
        .filter((t) => t.amount > threshold)
        .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
        .slice(0, 1);

      for (const t of recent) {
        if (!hasRecentTriggerBatch(rule.id, threshold1Hour)) {
          await logAndEmail(
            rule.id,
            userEmail,
            `Large Transaction Alert: $${Math.abs(t.amount).toFixed(2)}`,
            `Hi,\n\nA transaction of $${Math.abs(t.amount).toFixed(2)} was detected for "${t.name}" on ${t.date || t.createdAt}.\n\nThis exceeds your alert threshold of $${threshold.toFixed(2)}.\n\n— Ankan's Bank`,
          );
        }
      }
    }
  }
}
