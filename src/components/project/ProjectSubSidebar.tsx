/**
 * The project hub's section list (US-331).
 *
 * This file used to declare its own 22 sections while ProjectContent
 * implemented 23 and the header tab bar showed 10. It had no entry for
 * procurement, so that screen was implemented and reachable from nothing.
 *
 * Both this and the header now read PROJECT_SECTIONS, so the two cannot
 * disagree again and a section without an implementation fails a test.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { projectSectionsByGroup } from './projectSections';

interface ProjectSubSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const ProjectSubSidebar: React.FC<ProjectSubSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const sections = projectSectionsByGroup();

  return (
    <ScrollArea className="h-full">
      <nav className="p-3 space-y-6" aria-label="Project sections">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="px-2 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
};

export default ProjectSubSidebar;
