import {
  Target, Home, Plane, Car, Gem, Smartphone, Laptop, GraduationCap,
  Pill, TreePalm, Coins, PawPrint, Landmark, CreditCard, Zap,
  RefreshCw, Globe, Sparkles, BarChart3, Bot, Trash2, Search,
  CalendarDays, Banknote, UtensilsCrossed, CircleCheck,
  type LucideIcon,
} from 'lucide-react';

/* ── Dual-key map: clean icon keys + legacy emoji characters ── */
const ICON_MAP: Record<string, LucideIcon> = {
  // Clean keys (stored by new code)
  'target':          Target,
  'home':            Home,
  'plane':           Plane,
  'car':             Car,
  'gem':             Gem,
  'smartphone':      Smartphone,
  'laptop':          Laptop,
  'graduation-cap':  GraduationCap,
  'pill':            Pill,
  'tree-palm':       TreePalm,
  'coins':           Coins,
  'paw-print':       PawPrint,
  'landmark':        Landmark,
  'credit-card':     CreditCard,
  'zap':             Zap,
  'refresh-cw':      RefreshCw,
  'globe':           Globe,
  'sparkles':        Sparkles,
  'bar-chart':       BarChart3,
  'bot':             Bot,
  'trash':           Trash2,
  'search':          Search,
  'calendar':        CalendarDays,
  'banknote':        Banknote,
  'utensils':        UtensilsCrossed,
  'circle-check':    CircleCheck,

  // Legacy emoji keys (backward compat with existing DB rows)
  '🎯': Target,
  '🏠': Home,
  '✈️': Plane,
  '🚗': Car,
  '💍': Gem,
  '📱': Smartphone,
  '💻': Laptop,
  '🎓': GraduationCap,
  '💊': Pill,
  '🌴': TreePalm,
  '💰': Coins,
  '🐾': PawPrint,
  '🏦': Landmark,
  '💳': CreditCard,
  '⚡': Zap,
  '🔄': RefreshCw,
  '🌐': Globe,
  '✨': Sparkles,
  '📊': BarChart3,
  '🤖': Bot,
  '🗑': Trash2,
  '🔍': Search,
  '📅': CalendarDays,
  '💸': Banknote,
  '🍽': UtensilsCrossed,
  '✅': CircleCheck,
};

/* ── Renderer: looks up any string key and renders the matching icon ── */
export function IconRenderer({
  name,
  size = 16,
  className = '',
  fallback = 'target',
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
  fallback?: string;
}) {
  const Icon = ICON_MAP[name ?? ''] ?? ICON_MAP[fallback] ?? Target;
  return <Icon size={size} className={className} />;
}

/* ── Pick an icon key from a goal name via keyword matching ── */
const ICON_KEYWORDS: [string, string[]][] = [
  ['home',           ['house', 'home', 'rent', 'apartment', 'mortgage', 'property', 'down payment']],
  ['plane',          ['travel', 'trip', 'vacation', 'flight', 'holiday', 'abroad']],
  ['car',            ['car', 'vehicle', 'auto', 'truck', 'drive']],
  ['gem',            ['ring', 'wedding', 'engagement', 'jewelry', 'diamond']],
  ['smartphone',     ['phone', 'iphone', 'smartphone', 'mobile']],
  ['laptop',         ['laptop', 'computer', 'pc', 'macbook', 'tech']],
  ['graduation-cap', ['school', 'college', 'university', 'education', 'tuition', 'degree', 'study']],
  ['pill',           ['health', 'medical', 'doctor', 'hospital', 'dental', 'surgery']],
  ['tree-palm',      ['beach', 'island', 'resort', 'tropical', 'hawaii']],
  ['coins',          ['emergency', 'fund', 'savings', 'retire', 'invest', 'money', 'buffer']],
  ['paw-print',      ['pet', 'dog', 'cat', 'puppy', 'kitten', 'animal', 'vet']],
];

export function pickGoalIcon(goalName: string): string {
  const lower = goalName.toLowerCase();
  for (const [key, words] of ICON_KEYWORDS) {
    if (words.some(w => lower.includes(w))) return key;
  }
  return 'target';
}

/* ── 12 icon options for the savings goal picker ── */
export const GOAL_ICON_OPTIONS: { key: string; Icon: LucideIcon }[] = [
  { key: 'target',         Icon: Target },
  { key: 'home',           Icon: Home },
  { key: 'plane',          Icon: Plane },
  { key: 'car',            Icon: Car },
  { key: 'gem',            Icon: Gem },
  { key: 'smartphone',     Icon: Smartphone },
  { key: 'laptop',         Icon: Laptop },
  { key: 'graduation-cap', Icon: GraduationCap },
  { key: 'pill',           Icon: Pill },
  { key: 'tree-palm',      Icon: TreePalm },
  { key: 'coins',          Icon: Coins },
  { key: 'paw-print',      Icon: PawPrint },
];
