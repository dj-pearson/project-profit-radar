import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-296. /communication rendered this, and only this:
 *
 *   <h1>Communication Hub</h1>
 *   <p>Feature completed - real-time messaging, client portal, notifications,
 *      and automated updates ready.</p>
 *
 * A route asserting a feature is finished, in place of the feature. Meanwhile
 * the page that actually renders the messaging surface sat unrouted.
 *
 * Behind it, the RFI and Meetings tabs were mock shells: a Create RFI dialog
 * whose submit button had no onClick, with hardcoded project and assignee names
 * ("Commercial Office Build", "David Brown (Architect)"), over a list backed by
 * `useState<RFI[]>([])` with no setter. Filling the form in and pressing Create
 * RFI did nothing at all - the dialog did not even close.
 *
 * These read the tree rather than render it: what is being pinned is that the
 * route points at the real page and the unbuilt tabs say they are unbuilt.
 */

const ROUTES = 'src/routes/appRoutes.tsx';
const HUB = 'src/components/communication/CommunicationHub.tsx';

/** Comments stripped: the file documents the stub it replaced. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

describe('the /communication route', () => {
  const src = code(ROUTES);

  it('renders a page, not a paragraph claiming the feature is done', () => {
    expect(src).not.toContain('Feature completed');
    expect(src).toMatch(/path="\/communication" element=\{<RouteGuard><CommunicationPage \/><\/RouteGuard>\}/);
  });

  it('lazy-loads it like every other page on this route group', () => {
    expect(src).toContain("createLazyRoute(() => import('@/pages/CommunicationPage'))");
  });
});

describe('the RFI and Meetings tabs', () => {
  const src = code(HUB);

  it('no longer offer a form that cannot save', () => {
    // The give-away was a submit button with no handler inside a Dialog.
    expect(src).not.toContain('<Dialog');
    expect(src).not.toMatch(/<Button[^>]*>\s*Create RFI\s*<\/Button>/);
    expect(src).not.toMatch(/<Button[^>]*>\s*Schedule Meeting\s*<\/Button>/);
  });

  it('no longer carry hardcoded people and projects that look like real data', () => {
    for (const fake of ['Commercial Office Build', 'David Brown', 'Alex Chen', 'Smith House']) {
      expect(src, `${fake} is still presented as data`).not.toContain(fake);
    }
  });

  it('say they are not built rather than rendering a permanently empty list', () => {
    // `useState<RFI[]>([])` with no setter cannot ever be non-empty, so the
    // list read as "you have no RFIs".
    expect(src).not.toMatch(/useState<RFI\[\]>|useState<Meeting\[\]>/);
    expect(src).toContain('Not available yet.');
    expect(src).toContain('RFI tracking is not built');
    expect(src).toContain('Meeting scheduling is not built');
  });

  it('do not leave dead handlers behind them', () => {
    for (const fn of ['createRFI', 'scheduleMeeting', 'loadCommunicationData', 'loadMessages', 'sendMessage']) {
      expect(src, `${fn} is still declared`).not.toMatch(new RegExp(`const ${fn}\\s*=`));
    }
  });
});

describe('the messages tab', () => {
  it('still renders the interface that actually works', () => {
    // Three of the five removed handlers were explicitly-commented legacy
    // no-ops - "now handled by AdvancedChatInterface". Messaging was never the
    // broken part.
    const src = code(HUB);
    expect(src).toContain('<AdvancedChatInterface');
    expect(src).toContain('<ThreadManager');
  });

  it('and the page heading no longer promises RFIs and meetings', () => {
    const src = code(HUB);
    expect(src).not.toContain('Unified messaging, RFI management, and meeting coordination');
  });
});

describe('the video player', () => {
  const src = readFileSync('src/components/ui/video-player.tsx', 'utf8');

  it('seeks by clicking the progress bar, which is what was always wired', () => {
    // handleSeek was a Slider-shaped duplicate that nothing called. The Slider
    // in this file is the volume control. Correcting my own earlier reading:
    // the seek bar was never broken.
    expect(src).toContain('onClick={handleProgressClick}');
    expect(src).toMatch(/const handleProgressClick = useCallback\(/);
  });

  it('no longer carries the unbound duplicate', () => {
    expect(src).not.toMatch(/const handleSeek = useCallback\(/);
  });
});
