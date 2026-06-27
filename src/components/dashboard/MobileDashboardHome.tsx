import { useNavigate } from 'react-router-dom';
import {
  Clock,
  FileText,
  Camera,
  Home,
  FolderKanban,
  ClipboardList,
  MoreHorizontal,
} from 'lucide-react';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProjectHealth } from '@/hooks/useDashboardData';

/**
 * US-085: Mobile-optimized dashboard home.
 *
 * Rendered by Dashboard.tsx when the viewport is < 768px. Field-first layout:
 * a prominent Clock In/Out button, large quick actions, a horizontally
 * swipeable carousel of recent project cards, pull-to-refresh, and a bottom
 * navigation bar. All interactive targets are >= 44x44px (WCAG 2.5.5).
 */

const HEALTH_DOT: Record<ProjectHealth['overallHealth'], string> = {
  excellent: 'bg-green-500',
  good: 'bg-emerald-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

interface MobileDashboardHomeProps {
  projects: ProjectHealth[];
  onRefresh: () => Promise<void>;
}

export function MobileDashboardHome({ projects, onRefresh }: MobileDashboardHomeProps) {
  const navigate = useNavigate();

  const quickActions = [
    { label: 'New Daily Report', icon: FileText, onClick: () => navigate('/daily-reports/create') },
    { label: 'Take Photo', icon: Camera, onClick: () => navigate('/daily-reports/create') },
    { label: 'Log Time', icon: Clock, onClick: () => navigate('/time-tracking') },
  ];

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', href: '/projects' },
    { icon: Clock, label: 'Time', href: '/time-tracking' },
    { icon: ClipboardList, label: 'Reports', href: '/daily-reports' },
    { icon: MoreHorizontal, label: 'More', href: '/mobile-dashboard' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PullToRefresh onRefresh={onRefresh}>
        <div className="px-4 pt-4 space-y-5">
          {/* Prominent Clock In/Out (large tap target) */}
          <button
            type="button"
            onClick={() => navigate('/time-tracking')}
            aria-label="Clock in or out"
            className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.99]"
          >
            <Clock className="h-6 w-6" aria-hidden="true" />
            Clock In / Out
          </button>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3" role="group" aria-label="Quick actions">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-2 text-center transition-transform active:scale-[0.98]"
              >
                <action.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium leading-tight">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Swipeable recent project cards */}
          <section aria-label="Recent projects">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recent Projects</h2>
            {projects.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">No projects yet.</Card>
            ) : (
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
                {projects.slice(0, 10).map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    aria-label={`Open project ${project.name}`}
                    className="min-h-[44px] w-[80vw] max-w-xs shrink-0 snap-start rounded-2xl border bg-card p-4 text-left transition-transform active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{project.name}</span>
                      <span
                        className={cn('h-3 w-3 shrink-0 rounded-full', HEALTH_DOT[project.overallHealth])}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-1 text-xs capitalize text-muted-foreground">
                      {project.overallHealth} · {project.schedule.completion}% complete
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(0, project.schedule.completion))}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </PullToRefresh>

      <MobileBottomNav items={navItems} />
    </div>
  );
}

export default MobileDashboardHome;
