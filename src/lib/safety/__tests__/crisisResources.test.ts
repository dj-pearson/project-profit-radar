import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CRISIS_INTENT,
  CRISIS_MESSAGE,
  CRISIS_RESOURCES,
  crisisResourcesForRegion,
  isCrisisIntent,
} from '@/lib/safety/crisisResources';

describe('crisis resources', () => {
  it('lists 988 and a text-based option', () => {
    const contacts = CRISIS_RESOURCES.map((r) => r.contact).join(' ');
    expect(contacts).toContain('988');
    expect(contacts).toMatch(/text/i);
  });

  it('gives every resource a name and a contact', () => {
    for (const r of CRISIS_RESOURCES) {
      expect(r.name.length, 'resource needs a name').toBeGreaterThan(0);
      expect(r.contact.length, `${r.name} needs a contact`).toBeGreaterThan(0);
    }
  });

  it('falls back to the full list for an unknown region rather than returning nothing', () => {
    expect(crisisResourcesForRegion('ZZ').length).toBeGreaterThan(0);
  });

  it('does not present Brikly as a source of help', () => {
    expect(CRISIS_MESSAGE).toMatch(/cannot help/i);
  });

  it('recognises only the crisis intent', () => {
    expect(isCrisisIntent(CRISIS_INTENT)).toBe(true);
    for (const other of ['update_progress', 'report_issue', 'log_time', '', null, undefined]) {
      expect(isCrisisIntent(other)).toBe(false);
    }
  });
});

describe('crisis handling wiring', () => {
  const CLASSIFIER = 'supabase/functions/process-voice-command/index.ts';
  const CLIENT = 'src/components/mobile/VoiceCommandProcessor.tsx';

  it('teaches the classifier the crisis intent and gives it priority', () => {
    const src = readFileSync(CLASSIFIER, 'utf8');
    expect(src).toContain(CRISIS_INTENT);
    expect(src, 'crisis must outrank work intents').toMatch(/takes priority over every other/i);
  });

  it('tells the classifier not to echo what was said', () => {
    const src = readFileSync(CLASSIFIER, 'utf8');
    expect(src).toMatch(/do not paraphrase or quote/i);
  });

  /**
   * The point of the branch: an unrecognised intent used to default to
   * "update_progress", so a disclosure could be filed as a progress update.
   */
  it('handles the crisis intent before building a work command', () => {
    const src = readFileSync(CLIENT, 'utf8');
    const crisisAt = src.indexOf('isCrisisIntent(data.intent)');
    const commandAt = src.indexOf('const voiceCommand: VoiceCommand');
    expect(crisisAt, 'client must check for crisis').toBeGreaterThan(-1);
    expect(crisisAt, 'crisis check must come first').toBeLessThan(commandAt);
  });

  it('keeps no record of the utterance on the crisis path', () => {
    const src = readFileSync(CLIENT, 'utf8');
    const start = src.indexOf('isCrisisIntent(data.intent)');
    const branch = src.slice(start, src.indexOf('const voiceCommand: VoiceCommand'));
    expect(branch, 'crisis branch must not keep the transcript').not.toContain('data.transcript');
    expect(branch, 'crisis branch must not persist').not.toMatch(/\.insert\(|supabase\.from\(/);
  });
});
