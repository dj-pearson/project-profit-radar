/**
 * Analytics Tracking for Profitability Calculator
 * Tracks user behavior, conversions, and engagement
 */

import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsEvent {
  eventType: string;
  sessionId: string;
  leadId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface SessionData {
  sessionId: string;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

/**
 * Initialize a new calculator session
 */
export async function initializeSession(sessionId: string): Promise<void> {
  const sessionData = getSessionData(sessionId);

  // Still a direct insert: anon holds an INSERT policy on calculator_sessions
  // and this row carries no data the visitor should not be able to write. The
  // error is read because supabase-js returns it rather than throwing, so the
  // surrounding try/catch never sees a failed write (US-300).
  const { error } = await supabase.from('calculator_sessions').insert({
    session_id: sessionId,
    user_agent: sessionData.userAgent,
    device_type: sessionData.deviceType,
    browser: sessionData.browser,
    os: sessionData.os,
    referrer: sessionData.referrer,
    utm_source: sessionData.utmSource,
    utm_medium: sessionData.utmMedium,
    utm_campaign: sessionData.utmCampaign
  });

  if (error) {
    console.error('Failed to initialize session:', error.message);
  }
}

/**
 * Track page view
 */
export function trackPageView(sessionId: string): void {
  trackEvent({
    eventType: 'page_view',
    sessionId,
    timestamp: new Date()
  });
}

/**
 * Track form interaction
 */
export function trackFormStart(sessionId: string, fieldName: string): void {
  trackEvent({
    eventType: 'form_start',
    sessionId,
    metadata: { fieldName },
    timestamp: new Date()
  });
}

/**
 * Award points to a lead.
 *
 * Every scoring call in this file used to be `.catch()` chained onto a
 * PostgrestBuilder, which has then() but no catch(), so a TypeError was raised
 * before the request left the browser. The RPC it names did not exist either.
 * Both are fixed (US-303); this wrapper keeps the three call sites honest about
 * reading the error, since supabase-js returns it rather than throwing.
 *
 * Points are clamped to 1..25 server-side, so a value out of range is capped
 * rather than refused.
 */
async function awardLeadPoints(leadId: string, points: number, reason: string): Promise<void> {
  const { error } = await supabase.rpc('increment_lead_score', {
    p_lead_id: leadId,
    p_points: points
  });

  if (error) {
    console.error(`Failed to score lead for ${reason}:`, error.message);
  }
}

/**
 * Flip one funnel flag on the session row.
 *
 * anon holds no UPDATE policy on calculator_sessions, so the direct
 * `.update().eq('session_id', ...)` these functions used to run was filtered to
 * zero rows and reported no error. record_calculator_session_event is SECURITY
 * DEFINER and writes exactly one known column per event name.
 */
async function recordSessionEvent(
  sessionId: string,
  event: 'pdf_downloaded' | 'social_shared' | 'trial_clicked' | 'email_captured' | 'time_on_page',
  seconds?: number
): Promise<void> {
  const { error } = await supabase.rpc('record_calculator_session_event', {
    p_session_id: sessionId,
    p_event: event,
    p_seconds: seconds ?? null
  });

  if (error) {
    console.error(`Failed to record calculator session event ${event}:`, error.message);
  }
}

/**
 * Track calculation performed
 */
export async function trackCalculation(
  sessionId: string,
  inputs: any,
  results: any,
  leadId?: string
): Promise<void> {
  // calculator_calculations.session_id is a uuid FK to calculator_sessions(id),
  // but all this code holds is the text session id, and anon cannot read the
  // table to resolve it. Inserting the text id directly failed the uuid cast
  // with 22P02 on every call, and the unread error hid that no calculation has
  // ever been stored. record_calculator_calculation does the lookup, the insert
  // and the calculations_performed bump in one transaction, which is also why
  // increment_session_calculations is no longer called separately from here.
  const { error } = await supabase.rpc('record_calculator_calculation', {
    p_session_id: sessionId,
    p_project_type: inputs.projectType,
    p_labor_hours: inputs.laborHours,
    p_material_cost: inputs.materialCost,
    p_crew_size: inputs.crewSize,
    p_project_duration: inputs.projectDuration,
    p_lead_id: leadId ?? null,
    p_recommended_bid: results.recommendedBid,
    p_profit_margin: results.profitMargin,
    p_hourly_rate: results.hourlyRate,
    p_break_even_amount: results.breakEvenAmount,
    p_risk_score: results.riskScore
  });

  if (error) {
    console.error('Failed to track calculation:', error.message);
    return;
  }

  trackEvent({
    eventType: 'calculation_performed',
    sessionId,
    leadId,
    metadata: {
      projectType: inputs.projectType,
      profitMargin: results.profitMargin,
      riskLevel: results.riskLevel
    },
    timestamp: new Date()
  });
}

/**
 * Track email capture
 */
export async function trackEmailCapture(
  sessionId: string,
  email: string,
  companyName?: string,
  phone?: string
): Promise<string | null> {
  const sessionData = getSessionData(sessionId);

  // This used to be an upsert with .select('id').single(). anon holds INSERT on
  // calculator_leads and neither SELECT nor UPDATE, and RLS rejects both halves
  // of that statement: an INSERT carrying a RETURNING clause needs a SELECT
  // policy, and ON CONFLICT DO UPDATE needs an UPDATE policy. Both come back as
  // "new row violates row-level security policy", so this function returned
  // null for every visitor and no lead has ever been captured.
  //
  // capture_calculator_lead is SECURITY DEFINER, returns only the caller's own
  // lead id, and links the session in the same transaction. It also stops a
  // repeat capture resetting an accumulated score back to the floor of 10,
  // which the old `lead_score: 10` in the upsert body would have done.
  const { data, error } = await supabase.rpc('capture_calculator_lead', {
    p_session_id: sessionId,
    p_email: email,
    p_company_name: companyName ?? null,
    p_phone: phone ?? null,
    p_utm_source: sessionData.utmSource ?? null,
    p_utm_medium: sessionData.utmMedium ?? null,
    p_utm_campaign: sessionData.utmCampaign ?? null
  });

  if (error) {
    console.error('Failed to track email capture:', error.message);
    return null;
  }

  const leadId = (data as string | null) ?? null;
  if (!leadId) {
    console.error('Failed to track email capture: no lead id returned');
    return null;
  }

  trackEvent({
    eventType: 'email_captured',
    sessionId,
    leadId,
    metadata: { email, hasCompanyName: !!companyName, hasPhone: !!phone },
    timestamp: new Date()
  });

  return leadId;
}

/**
 * Track PDF download
 */
export async function trackPDFDownload(sessionId: string, leadId?: string): Promise<void> {
  await recordSessionEvent(sessionId, 'pdf_downloaded');

  if (leadId) {
    await awardLeadPoints(leadId, 5, 'pdf download');
  }

  trackEvent({
    eventType: 'pdf_downloaded',
    sessionId,
    leadId,
    timestamp: new Date()
  });
}

/**
 * Track social share
 */
export async function trackSocialShare(
  sessionId: string,
  platform: string,
  leadId?: string
): Promise<void> {
  await recordSessionEvent(sessionId, 'social_shared');

  if (leadId) {
    await awardLeadPoints(leadId, 8, 'social share');
  }

  trackEvent({
    eventType: 'social_share',
    sessionId,
    leadId,
    metadata: { platform },
    timestamp: new Date()
  });
}

/**
 * Track trial CTA click
 */
export async function trackTrialClick(sessionId: string, leadId?: string): Promise<void> {
  await recordSessionEvent(sessionId, 'trial_clicked');

  if (leadId) {
    await awardLeadPoints(leadId, 20, 'trial click');
  }

  trackEvent({
    eventType: 'trial_clicked',
    sessionId,
    leadId,
    timestamp: new Date()
  });
}

/**
 * Track referral
 */
export async function trackReferral(
  referrerEmail: string,
  refereeEmail: string
): Promise<void> {
  const { error: insertError } = await supabase.from('calculator_referrals').insert({
    referrer_email: referrerEmail,
    referee_email: refereeEmail,
    status: 'pending'
  });

  if (insertError) {
    console.error('Failed to track referral:', insertError.message);
    return;
  }

  // This used to be `.update({ referral_count: supabase.raw('referral_count + 1') })`.
  // There is no raw() on the supabase-js v2 client, so building that object
  // threw a TypeError before .update() was reached and the count has never
  // moved. Doing the read-modify-write in SQL also stops two referrals landing
  // together from both writing count + 1.
  const { error: countError } = await supabase.rpc('increment_referral_count', {
    p_referrer_email: referrerEmail
  });

  if (countError) {
    console.error('Failed to increment referral count:', countError.message);
  }
}

/**
 * Track time on page
 */
export function trackTimeOnPage(sessionId: string, duration: number): void {
  // Deliberately fire-and-forget: the only caller runs this from a
  // beforeunload handler, which cannot wait for a promise. Kept as a void
  // function so that stays obvious at the call site.
  //
  // Written with await inside rather than .then().catch() because
  // PostgrestBuilder.then() is typed as returning PromiseLike, which has no
  // catch: the old chain worked at runtime but could not typecheck, and the
  // sibling calls in this file that used .catch() directly on the builder were
  // throwing before their request was ever sent.
  //
  // The direct .update() was also filtered to zero rows by RLS - anon has no
  // UPDATE policy on calculator_sessions - and reported no error, so
  // time_on_page has always been null. The RPC keeps the longest dwell rather
  // than the last, because beforeunload can fire more than once per session
  // (bfcache restores) and the final value is not the largest.
  void (async () => {
    const { error } = await supabase.rpc('record_calculator_session_event', {
      p_session_id: sessionId,
      p_event: 'time_on_page',
      p_seconds: Math.round(duration)
    });

    if (error) {
      console.error('Failed to track time on page:', error.message);
      return;
    }

    trackEvent({
      eventType: 'time_on_page',
      sessionId,
      metadata: { duration },
      timestamp: new Date()
    });
  })();
}

/**
 * Get session data from browser
 */
function getSessionData(sessionId: string): SessionData {
  const userAgent = navigator.userAgent;
  const referrer = document.referrer;

  // Parse UTM parameters from URL
  const urlParams = new URLSearchParams(window.location.search);

  return {
    sessionId,
    userAgent,
    deviceType: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    referrer,
    utmSource: urlParams.get('utm_source') || undefined,
    utmMedium: urlParams.get('utm_medium') || undefined,
    utmCampaign: urlParams.get('utm_campaign') || undefined,
    utmTerm: urlParams.get('utm_term') || undefined,
    utmContent: urlParams.get('utm_content') || undefined
  };
}

/**
 * Detect device type
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Detect browser
 */
function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Unknown';
}

/**
 * Detect OS
 */
function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'MacOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}

/**
 * Generic event tracking (can be extended to Google Analytics, etc.)
 */
function trackEvent(event: AnalyticsEvent): void {
  // Console log for debugging

  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event.eventType, {
      session_id: event.sessionId,
      lead_id: event.leadId,
      ...event.metadata
    });
  }

  // Send to Facebook Pixel if available
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('trackCustom', event.eventType, event.metadata);
  }
}

/**
 * A/B Test variant tracking
 */
export function trackABTestVariant(
  testName: string,
  variant: string,
  sessionId: string
): void {
  trackEvent({
    eventType: 'ab_test_variant',
    sessionId,
    metadata: { testName, variant },
    timestamp: new Date()
  });
}

/**
 * Track funnel step completion
 */
export function trackFunnelStep(
  step: string,
  sessionId: string,
  leadId?: string
): void {
  trackEvent({
    eventType: 'funnel_step',
    sessionId,
    leadId,
    metadata: { step },
    timestamp: new Date()
  });
}
