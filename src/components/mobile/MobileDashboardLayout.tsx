import { ReactNode, useCallback, useMemo, useState } from 'react';
import { Reorder, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { Check, GripVertical, LayoutGrid, Pencil, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export interface MobileDashboardWidget {
  /** Stable id used for ordering + persistence. */
  id: string;
  /** Human-readable title shown in Edit mode. */
  title: string;
  /** Renderer — called only when the widget is visible. */
  render: () => ReactNode;
  /** Optional description shown in Edit mode. */
  description?: string;
}

interface StoredLayout {
  order: string[];
  hidden: string[];
}

const STORAGE_KEY = 'brikly.mobile.dashboard.layout';

function loadLayout(): StoredLayout {
  if (typeof window === 'undefined') return { order: [], hidden: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: [], hidden: [] };
    const parsed = JSON.parse(raw) as Partial<StoredLayout>;
    return {
      order: Array.isArray(parsed.order) ? parsed.order : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
    };
  } catch {
    return { order: [], hidden: [] };
  }
}

function saveLayout(layout: StoredLayout) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

interface MobileDashboardLayoutProps {
  widgets: MobileDashboardWidget[];
  /** Optional header content rendered above the widgets (not reorderable). */
  header?: ReactNode;
}

/**
 * Reorderable, hideable mobile dashboard shell.
 *
 * - Persists widget order + visibility to localStorage
 * - Edit mode exposes drag handles (framer-motion Reorder) and visibility toggles
 * - Shows an empty-state CTA when all widgets are hidden
 */
export function MobileDashboardLayout({ widgets, header }: MobileDashboardLayoutProps) {
  const haptics = useHaptics();
  const reduceMotion = useReducedMotion();
  const [layout, setLayout] = useState<StoredLayout>(() => loadLayout());
  const [editMode, setEditMode] = useState(false);

  // Build the ordered widget list, appending any new widgets that aren't in
  // stored order yet so additions show up automatically.
  const orderedWidgets = useMemo(() => {
    const map = new Map(widgets.map((w) => [w.id, w] as const));
    const seen = new Set<string>();
    const ordered: MobileDashboardWidget[] = [];
    for (const id of layout.order) {
      const w = map.get(id);
      if (w && !seen.has(id)) {
        ordered.push(w);
        seen.add(id);
      }
    }
    for (const w of widgets) {
      if (!seen.has(w.id)) {
        ordered.push(w);
        seen.add(w.id);
      }
    }
    return ordered;
  }, [widgets, layout.order]);

  const visibleWidgets = useMemo(
    () => orderedWidgets.filter((w) => !layout.hidden.includes(w.id)),
    [orderedWidgets, layout.hidden],
  );

  const persist = useCallback((next: StoredLayout) => {
    setLayout(next);
    saveLayout(next);
  }, []);

  const handleReorder = (next: MobileDashboardWidget[]) => {
    persist({ ...layout, order: next.map((w) => w.id) });
  };

  const toggleVisibility = (id: string) => {
    haptics.selection();
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((h) => h !== id)
      : [...layout.hidden, id];
    persist({ ...layout, hidden });
  };

  const toggleEdit = () => {
    haptics.impactLight();
    setEditMode((e) => !e);
  };

  return (
    <div className="space-y-4 ios-rise">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-primary/20 to-primary/5 text-primary',
              'ring-1 ring-inset ring-primary/15 shadow-ios-1'
            )}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
        </div>
        <Button
          type="button"
          variant={editMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleEdit}
          aria-pressed={editMode}
          className={cn(
            'rounded-xl transition-all duration-[180ms] ease-ios',
            editMode ? 'shadow-ios-2' : 'glass-interactive border-white/20'
          )}
        >
          {editMode ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Done
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </>
          )}
        </Button>
      </div>

      {header}

      {editMode ? (
        <Reorder.Group
          axis="y"
          values={orderedWidgets}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {orderedWidgets.map((widget) => (
            <EditRow
              key={widget.id}
              widget={widget}
              hidden={layout.hidden.includes(widget.id)}
              onToggle={() => toggleVisibility(widget.id)}
              reduceMotion={reduceMotion ?? false}
            />
          ))}
        </Reorder.Group>
      ) : visibleWidgets.length === 0 ? (
        <EmptyState onEdit={toggleEdit} />
      ) : (
        <div className="space-y-6">
          {visibleWidgets.map((widget) => (
            <motion.section
              key={widget.id}
              layout={!reduceMotion}
              aria-label={widget.title}
            >
              {widget.render()}
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}

function EditRow({
  widget,
  hidden,
  onToggle,
  reduceMotion,
}: {
  widget: MobileDashboardWidget;
  hidden: boolean;
  onToggle: () => void;
  reduceMotion: boolean;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={widget}
      dragListener={false}
      dragControls={controls}
      className={cn(
        'flex items-center gap-3 p-3 rounded-2xl glass shadow-ios-1',
        'min-h-[64px]',
        hidden && 'opacity-55',
      )}
      transition={reduceMotion ? { duration: 0 } : undefined}
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="touch-manipulation p-2 -m-2 text-muted-foreground cursor-grab active:cursor-grabbing"
        aria-label={`Reorder ${widget.title}`}
      >
        <GripVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{widget.title}</p>
        {widget.description && (
          <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {hidden ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
        <Switch
          checked={!hidden}
          onCheckedChange={onToggle}
          aria-label={`${hidden ? 'Show' : 'Hide'} ${widget.title}`}
        />
      </div>
    </Reorder.Item>
  );
}

function EmptyState({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl glass-thin border-dashed border-2 border-white/30 dark:border-white/10">
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mb-3',
          'bg-gradient-to-br from-primary/20 to-primary/5 text-primary',
          'ring-1 ring-inset ring-primary/15 shadow-ios-1'
        )}
      >
        <LayoutGrid className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="font-semibold tracking-tight">Your dashboard is empty</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs">
        Enable widgets to see your projects, schedule, and stats at a glance.
      </p>
      <Button type="button" onClick={onEdit} className="rounded-xl shadow-ios-2">
        <Pencil className="h-4 w-4 mr-1" />
        Choose widgets
      </Button>
    </div>
  );
}
