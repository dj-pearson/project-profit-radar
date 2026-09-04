/**
 * US-331: one list of project hub sections.
 *
 * There were three and they disagreed. ProjectContent implemented 23 sections;
 * the sub-sidebar listed 22, missing procurement, so that screen was reachable
 * from nothing; the header tab bar showed 10, three of them captioned against a
 * different section than they open - 'estimates' said "Financials", 'progress'
 * said "Schedule", 'tasks' said "Team". Clicking Team opened the task list.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PROJECT_SECTIONS, PROJECT_SECTION_GROUPS,
  projectTabBarSections, projectSectionsByGroup, isProjectSection,
} from '../projectSections';

/** Strip comments: these files explain the defect they fixed, in prose. */
const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

/** The ids ProjectContent's contentMap actually renders. */
const implemented = (): string[] => {
  const src = readFileSync('src/components/project/ProjectContent.tsx', 'utf8');
  const map = src.slice(
    src.indexOf('const contentMap'),
    src.indexOf('};', src.indexOf('const contentMap'))
  );
  return [...map.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
};

describe('one section list (US-331)', () => {
  it('every section has an implementation', () => {
    // The check that was missing. Add a section here without adding it to
    // ProjectContent and the hub renders Overview instead, silently.
    const impl = new Set(implemented());
    const missing = PROJECT_SECTIONS.filter((s) => !impl.has(s.id)).map((s) => s.id);
    expect(missing, 'sections with no renderer in ProjectContent').toEqual([]);
  });

  it('every implementation is reachable', () => {
    // The other direction. procurement was implemented and listed nowhere.
    const listed = new Set(PROJECT_SECTIONS.map((s) => s.id));
    const unreachable = implemented().filter((id) => !listed.has(id));
    expect(unreachable, 'renderers no navigation offers').toEqual([]);
  });

  it('has no duplicate ids', () => {
    const ids = PROJECT_SECTIONS.map((s) => s.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it('puts every section in a declared group', () => {
    const groups = new Set(PROJECT_SECTION_GROUPS);
    for (const section of PROJECT_SECTIONS) {
      expect(groups.has(section.group), `${section.id} is in ${section.group}`).toBe(true);
    }
  });

  it('keeps the tab bar a subset, not a second list', () => {
    const tabs = projectTabBarSections();
    const all = new Set(PROJECT_SECTIONS.map((s) => s.id));
    for (const tab of tabs) expect(all.has(tab.id)).toBe(true);
    // Small enough to fit a laptop header.
    expect(tabs.length).toBeLessThanOrEqual(12);
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('labels a tab with the name of the section it opens', () => {
    // The specific defect: 'estimates' captioned "Financials", 'tasks'
    // captioned "Team". A label that names a different thing is worse than a
    // missing one, because it teaches the wrong model of the product.
    for (const tab of projectTabBarSections()) {
      const section = PROJECT_SECTIONS.find((s) => s.id === tab.id);
      expect(tab.label).toBe(section?.label);
    }
    expect(PROJECT_SECTIONS.find((s) => s.id === 'estimates')?.label).toBe('Estimates');
    expect(PROJECT_SECTIONS.find((s) => s.id === 'tasks')?.label).toBe('Tasks');
    expect(PROJECT_SECTIONS.find((s) => s.id === 'progress')?.label).toBe('Progress');
  });

  it('groups without losing anybody', () => {
    const grouped = projectSectionsByGroup().flatMap((g) => g.items);
    expect(grouped).toHaveLength(PROJECT_SECTIONS.length);
  });

  it('has a photos section, on the record US-330 created', () => {
    expect(isProjectSection('photos')).toBe(true);
    expect(readFileSync('src/components/project/tabs/ProjectPhotos.tsx', 'utf8'))
      .toMatch(/from\('photo_attachments'\)/);
  });

  it('signs photo URLs rather than assuming a public bucket', () => {
    // project-documents is public today only because US-289's flip was never
    // committed. A page that hardcodes getPublicUrl breaks the day it lands.
    const page = strip('src/components/project/tabs/ProjectPhotos.tsx');
    expect(page).toMatch(/createSignedUrls/);
    expect(page).not.toMatch(/getPublicUrl/);
  });
});

describe('both consumers read the one list (US-331)', () => {
  it('the sub-sidebar has no section list of its own', () => {
    const src = readFileSync('src/components/project/ProjectSubSidebar.tsx', 'utf8');
    expect(src).toMatch(/projectSectionsByGroup/);
    expect(src).not.toMatch(/const navigationSections = \[/);
  });

  it('the header tab bar has no section list of its own', () => {
    const src = readFileSync('src/pages/ProjectDetail.tsx', 'utf8');
    expect(src).toMatch(/const projectTabs = projectTabBarSections\(\);/);
    expect(src).not.toMatch(/\{ id: 'overview', label: 'Overview'/);
  });
});

describe('the navigation defects US-331 names (US-331)', () => {
  it('declares /workflows once, and the mock page is gone', () => {
    const ops = readFileSync('src/routes/operationsRoutes.tsx', 'utf8');
    expect(ops).not.toMatch(/<Route path="\/workflows"/);
    const app = readFileSync('src/routes/appRoutes.tsx', 'utf8');
    expect(app).toMatch(/<Route path="\/workflows"/);
  });

  it('leaves no FinanceHub tile pointing at a route that does not exist', () => {
    const hub = readFileSync('src/pages/FinanceHub.tsx', 'utf8');
    const tiles = [...hub.matchAll(/route: '([^']+)'/g)].map((m) => m[1]);
    const routes = new Set<string>();
    for (const f of ['financialRoutes', 'appRoutes', 'operationsRoutes', 'projectRoutes']) {
      const src = readFileSync(`src/routes/${f}.tsx`, 'utf8');
      for (const m of src.matchAll(/path="([^"]+)"/g)) routes.add(m[1]);
    }
    expect(tiles.filter((t) => !routes.has(t)), 'FinanceHub tiles that 404').toEqual([]);
    expect(tiles.length).toBeGreaterThan(0);
  });

  it('redirects the two duplicate financial landings', () => {
    const src = readFileSync('src/routes/financialRoutes.tsx', 'utf8');
    expect(src).toMatch(/path="\/financial-overview" element=\{<Navigate to="\/financial-hub"/);
    expect(src).toMatch(/path="\/finance-hub" element=\{<Navigate to="\/finance\/hub"/);
  });

  it('computes the hub revenue from contract values, not a guessed average', () => {
    const src = readFileSync('src/pages/hubs/FinancialHub.tsx', 'utf8');
    expect(src).not.toMatch(/projectsCount \|\| 0\) \* 50000/);
    expect(src).toMatch(/current_contract_value/);
  });

  it('has a written information architecture', () => {
    const doc = readFileSync('docs/INFORMATION_ARCHITECTURE.md', 'utf8');
    for (const home of ['Sell', 'Build', 'Bill', 'Cost', 'Company']) {
      expect(doc).toMatch(new RegExp(`### ${home}`));
    }
    // It has to say what is not done, or it is a plan pretending to be a state.
    expect(doc).toMatch(/## Still to do/);
  });
});
