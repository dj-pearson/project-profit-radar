/**
 * Crisis resources, in one place so they can be corrected without touching
 * prompts or UI.
 *
 * Why this exists (US-294)
 * ------------------------
 * Brikly captures free-form speech from field workers through voice commands
 * and voice notes. Construction has among the highest suicide rates of any
 * United States industry, so the input surface and the at-risk population
 * overlap. Before this, an utterance expressing distress was classified into
 * the nearest work intent - and because VoiceCommandProcessor defaulted an
 * unrecognised intent to "update_progress", a disclosure could be silently
 * filed as a progress update.
 *
 * This is a narrow, high-severity mitigation, not a support feature. Brikly is
 * not a crisis service and must not present itself as one; the only correct
 * behaviour is to stop treating the utterance as work and point at people who
 * can actually help.
 *
 * Scope note: the repo has no conversational AI assistant. src/pages/
 * AIProjectAssistant.tsx looks like one but is an unrouted static mockup with
 * hardcoded messages and no send handler, so there is no chat reply path to
 * harden. The live free-text surfaces are voice command processing and voice
 * notes.
 */

export interface CrisisResource {
  region: string;
  name: string;
  contact: string;
  note?: string;
}

/**
 * Deliberately short. A long list is harder to act on in a moment of crisis,
 * and every entry here has to be verifiable and current.
 */
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    region: 'US',
    name: '988 Suicide & Crisis Lifeline',
    contact: 'Call or text 988',
    note: 'Free, confidential, 24/7',
  },
  {
    region: 'US',
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    note: 'Free, confidential, 24/7',
  },
  {
    region: 'US',
    name: 'Emergency services',
    contact: 'Call 911',
    note: 'If someone is in immediate danger',
  },
];

/** Shown alongside the resources. Kept short and free of platitudes. */
export const CRISIS_MESSAGE =
  'It sounds like you may be going through something serious. Brikly cannot help with this, but these people can.';

/**
 * Intent returned by the voice-command classifier when an utterance expresses
 * personal distress rather than a work instruction.
 */
export const CRISIS_INTENT = 'personal_crisis' as const;

export function isCrisisIntent(intent: string | null | undefined): boolean {
  return intent === CRISIS_INTENT;
}

export function crisisResourcesForRegion(region = 'US'): CrisisResource[] {
  const matches = CRISIS_RESOURCES.filter((r) => r.region === region);
  return matches.length > 0 ? matches : CRISIS_RESOURCES;
}
