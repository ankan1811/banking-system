"use client"

import { useState, useEffect, useMemo } from 'react';
import { getRecurring } from '@/lib/api/analytics.api';
import { aiCategoryColors } from '@/constants';
import type { RecurringPattern } from '@shared/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type BillEntry = { pattern: RecurringPattern; date: string };

function projectBills(patterns: RecurringPattern[], month: Date): Map<string, BillEntry[]> {
  const map = new Map<string, BillEntry[]>();
  const year = month.getFullYear();
  const mo = month.getMonth();

  for (const p of patterns) {
    const dates: Date[] = [];
    const last = new Date(p.lastCharged);

    if (p.frequency === 'monthly') {
      for (let i = -2; i <= 6; i++) {
        const d = new Date(last);
        d.setMonth(d.getMonth() + i);
        dates.push(d);
      }
    } else if (p.frequency === 'weekly') {
      for (let i = -4; i <= 12; i++) {
        dates.push(addDays(p.lastCharged, 7 * i));
      }
    } else if (p.frequency === 'quarterly') {
      for (let i = -1; i <= 4; i++) {
        const d = new Date(last);
        d.setMonth(d.getMonth() + 3 * i);
        dates.push(d);
      }
    }

    for (const d of dates) {
      if (d.getFullYear() === year && d.getMonth() === mo) {
        const key = toKey(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ pattern: p, date: key });
      }
    }
  }

  return map;
}

export default function BillCalendar() {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    getRecurring()
      .then((res) => setPatterns(res.recurring))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const billMap = useMemo(() => projectBills(patterns, currentMonth), [patterns, currentMonth]);

  const monthTotal = useMemo(() => {
    let total = 0;
    for (const [, entries] of billMap) {
      for (const e of entries) total += Number(e.pattern.normalizedAmount);
    }
    return total;
  }, [billMap]);

  // Build calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayKey = toKey(today);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-4 w-40 bg-slate-700/50 rounded mb-6" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-700/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            ←
          </button>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-white">{formatMonth(currentMonth)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {billMap.size} bill days · ${Number(monthTotal).toFixed(2)} committed
            </p>
          </div>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs text-slate-500 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} className="h-20" />;
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entries = billMap.get(key) || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={`h-20 p-1 rounded-lg text-left transition-all flex flex-col ${
                  isSelected
                    ? 'bg-violet-600/20 border border-violet-500/40'
                    : isToday
                    ? 'bg-slate-700/40 border border-slate-600/40'
                    : entries.length > 0
                    ? 'bg-slate-800/40 hover:bg-slate-700/30 border border-slate-700/20'
                    : 'hover:bg-slate-800/20 border border-transparent'
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-violet-400' : 'text-slate-400'}`}>
                  {day}
                </span>
                <div className="flex-1 overflow-hidden mt-0.5">
                  {entries.slice(0, 2).map((e, i) => {
                    const color = aiCategoryColors[e.pattern.category] || '#78716c';
                    return (
                      <div key={i} className="flex items-center gap-0.5 leading-none mb-0.5">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[9px] text-slate-400 truncate">{e.pattern.name}</span>
                      </div>
                    );
                  })}
                  {entries.length > 2 && (
                    <span className="text-[9px] text-slate-600">+{entries.length - 2} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (billMap.get(selectedDay) || []).length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <h4 className="text-sm font-semibold text-white">
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </h4>
          <div className="space-y-2">
            {(billMap.get(selectedDay) || []).map((e, i) => {
              const color = aiCategoryColors[e.pattern.category] || '#78716c';
              return (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <p className="text-sm text-white">{e.pattern.name}</p>
                      <p className="text-xs text-slate-500">{e.pattern.category} · {e.pattern.frequency}</p>
                    </div>
                  </div>
                  <span className="text-sm text-white font-medium">${Number(e.pattern.normalizedAmount).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {patterns.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 mb-2">Recurring charges ({patterns.length})</p>
          <div className="flex flex-wrap gap-2">
            {patterns.map((p, i) => {
              const color = aiCategoryColors[p.category] || '#78716c';
              return (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate max-w-[120px]">{p.name}</span>
                  <span className="text-slate-600">${Number(p.normalizedAmount).toFixed(2)}/{p.frequency === 'weekly' ? 'wk' : p.frequency === 'quarterly' ? 'qtr' : 'mo'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {patterns.length === 0 && (
        <div className="glass-card p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">No recurring bills detected yet</h3>
            <p className="text-xs text-slate-500">This page auto-populates once we spot 3+ regular payments in your transactions.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
              <span className="text-lg">🔍</span>
              <p className="text-[11px] text-slate-400 mt-1">Auto-detected</p>
              <p className="text-[10px] text-slate-500">We scan your transactions</p>
            </div>
            <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
              <span className="text-lg">📅</span>
              <p className="text-[11px] text-slate-400 mt-1">Calendar view</p>
              <p className="text-[10px] text-slate-500">See upcoming bills by date</p>
            </div>
            <div className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center">
              <span className="text-lg">💸</span>
              <p className="text-[11px] text-slate-400 mt-1">Monthly committed</p>
              <p className="text-[10px] text-slate-500">Track total recurring spend</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
