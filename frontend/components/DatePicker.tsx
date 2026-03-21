'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  // Sync from external value (YYYY-MM-DD)
  useEffect(() => {
    if (value && value.includes('-')) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(String(parseInt(m)));
      setDay(String(parseInt(d)));
    }
  }, []);

  const emit = (m: string, d: string, y: string) => {
    if (m && d && y) {
      const mm = m.padStart(2, '0');
      const dd = d.padStart(2, '0');
      onChange(`${y}-${mm}-${dd}`);
    }
  };

  const daysInMonth = month && year ? getDaysInMonth(parseInt(month), parseInt(year)) : 31;
  // Clamp day if month/year changes
  const clampedDay = day && parseInt(day) > daysInMonth ? String(daysInMonth) : day;

  const handleMonth = (v: string) => { setMonth(v); emit(v, clampedDay, year); };
  const handleDay = (v: string) => { setDay(v); emit(month, v, year); };
  const handleYear = (v: string) => { setYear(v); emit(month, clampedDay, v); };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-slate-400">
        <CalendarDays size={16} className="shrink-0 text-violet-400" />
      </div>

      {/* Month */}
      <Select onValueChange={handleMonth} value={month}>
        <SelectTrigger className="input-class flex-1 min-w-[120px]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
          {MONTHS.map((name, i) => (
            <SelectItem
              key={i + 1}
              value={String(i + 1)}
              className="text-white focus:bg-slate-800 focus:text-white"
            >
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Day */}
      <Select onValueChange={handleDay} value={clampedDay} disabled={!month}>
        <SelectTrigger className="input-class w-[80px]">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <SelectItem
              key={d}
              value={String(d)}
              className="text-white focus:bg-slate-800 focus:text-white"
            >
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Year */}
      <Select onValueChange={handleYear} value={year}>
        <SelectTrigger className="input-class w-[95px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
          {YEARS.map((y) => (
            <SelectItem
              key={y}
              value={String(y)}
              className="text-white focus:bg-slate-800 focus:text-white"
            >
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
