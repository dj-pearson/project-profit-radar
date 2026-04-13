import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock,
  Camera,
  FileText,
  FolderPlus,
  Users,
  DollarSign,
  MapPin,
  Search,
  Star,
  LucideIcon,
  Shield,
  Calendar,
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export interface MobileQuickAction {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  color: string; // tailwind color class for icon bg
  href?: string;
  onSelect?: () => void;
  keywords?: string[];
}

const DEFAULT_ACTIONS: MobileQuickAction[] = [
  {
    id: 'clock-in',
    label: 'Clock In / Out',
    description: 'Start or end your shift',
    icon: Clock,
    color: 'bg-blue-500',
    href: '/time-tracking',
    keywords: ['time', 'clock', 'shift', 'hours'],
  },
  {
    id: 'take-photo',
    label: 'Take Photo',
    description: 'Capture job site photo',
    icon: Camera,
    color: 'bg-purple-500',
    href: '/mobile/camera',
    keywords: ['photo', 'picture', 'image', 'camera'],
  },
  {
    id: 'daily-report',
    label: 'Daily Report',
    description: 'Log todays progress',
    icon: FileText,
    color: 'bg-green-500',
    href: '/daily-reports/new',
    keywords: ['report', 'daily', 'progress', 'log'],
  },
  {
    id: 'new-project',
    label: 'New Project',
    description: 'Start a new project',
    icon: FolderPlus,
    color: 'bg-orange-500',
    href: '/projects/new',
    keywords: ['project', 'create', 'new'],
  },
  {
    id: 'crew',
    label: 'My Crew',
    description: 'View team and schedule',
    icon: Users,
    color: 'bg-indigo-500',
    href: '/crew',
    keywords: ['crew', 'team', 'workers', 'people'],
  },
  {
    id: 'expenses',
    label: 'Log Expense',
    description: 'Add a new expense',
    icon: DollarSign,
    color: 'bg-emerald-500',
    href: '/expenses/new',
    keywords: ['expense', 'receipt', 'cost', 'money'],
  },
  {
    id: 'gps',
    label: 'Check In',
    description: 'GPS check in on site',
    icon: MapPin,
    color: 'bg-red-500',
    href: '/gps',
    keywords: ['gps', 'location', 'check in', 'site'],
  },
  {
    id: 'safety',
    label: 'Safety Incident',
    description: 'Report a safety issue',
    icon: Shield,
    color: 'bg-amber-500',
    href: '/safety/new',
    keywords: ['safety', 'incident', 'osha', 'report'],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    description: 'View todays schedule',
    icon: Calendar,
    color: 'bg-teal-500',
    href: '/schedule',
    keywords: ['schedule', 'calendar', 'today'],
  },
];

const RECENTS_KEY = 'brikly.mobile.quickActions.recents';
const RECENTS_MAX = 3;

function loadRecents(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecents(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(ids.slice(0, RECENTS_MAX)));
  } catch {
    // storage unavailable
  }
}

interface MobileQuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions?: MobileQuickAction[];
}

export function MobileQuickActionsSheet({
  isOpen,
  onClose,
  actions = DEFAULT_ACTIONS,
}: MobileQuickActionsSheetProps) {
  const navigate = useNavigate();
  const haptics = useHaptics();
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>(() => loadRecents());

  useEffect(() => {
    if (isOpen) {
      haptics.impact('light');
      setQuery('');
    }
  }, [isOpen, haptics]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => {
      if (a.label.toLowerCase().includes(q)) return true;
      if (a.description?.toLowerCase().includes(q)) return true;
      return a.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
    });
  }, [actions, query]);

  const pinned = useMemo(() => {
    if (query) return [];
    return recents
      .map((id) => actions.find((a) => a.id === id))
      .filter((a): a is MobileQuickAction => Boolean(a));
  }, [actions, recents, query]);

  const handleSelect = (action: MobileQuickAction) => {
    haptics.selection();
    const nextRecents = [action.id, ...recents.filter((id) => id !== action.id)].slice(
      0,
      RECENTS_MAX,
    );
    setRecents(nextRecents);
    saveRecents(nextRecents);
    onClose();
    if (action.onSelect) {
      action.onSelect();
    } else if (action.href) {
      navigate(action.href);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Quick Actions">
      <div className="space-y-4">
        <label className="relative block">
          <span className="sr-only">Search quick actions</span>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, projects, pages…"
            className={cn(
              'w-full h-12 pl-10 pr-4 rounded-lg',
              'border border-input bg-background',
              'text-base focus:outline-none focus:ring-2 focus:ring-primary',
            )}
            autoFocus={false}
          />
        </label>

        {pinned.length > 0 && (
          <section aria-label="Recent actions">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Star className="h-3.5 w-3.5" aria-hidden="true" />
              Recent
            </div>
            <ActionGrid actions={pinned} onSelect={handleSelect} />
          </section>
        )}

        <section aria-label="All quick actions">
          {pinned.length > 0 && (
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All actions
            </div>
          )}
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No actions match &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ActionGrid actions={filtered} onSelect={handleSelect} />
          )}
        </section>
      </div>
    </BottomSheet>
  );
}

function ActionGrid({
  actions,
  onSelect,
}: {
  actions: MobileQuickAction[];
  onSelect: (a: MobileQuickAction) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onSelect(action)}
            className={cn(
              'flex flex-col items-center justify-start gap-2 p-3 min-h-[96px]',
              'rounded-xl border bg-card text-card-foreground',
              'active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary',
            )}
            aria-label={action.label}
          >
            <span
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                action.color,
              )}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-center leading-tight">
              {action.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Hook that wires long-press on any element to open a quick-actions sheet.
 * Returns { onTouchStart, onTouchEnd, onTouchMove } to spread onto the
 * target element along with the isOpen/setIsOpen state so callers can
 * mount <MobileQuickActionsSheet> themselves.
 */
export function useLongPressQuickActions(durationMs: number = 500) {
  const [isOpen, setIsOpen] = useState(false);
  const [timerId, setTimerId] = useState<number | null>(null);

  const clear = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      setTimerId(null);
    }
  };

  const handlers = {
    onPointerDown: () => {
      clear();
      const id = window.setTimeout(() => setIsOpen(true), durationMs);
      setTimerId(id);
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
  };

  return { isOpen, setIsOpen, handlers };
}
