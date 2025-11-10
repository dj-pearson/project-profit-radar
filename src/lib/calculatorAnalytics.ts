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

  try {
    await supabase.from('calculator_sessions').insert({
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
  } catch (error) {
    console.error('Failed to initialize session:', error);
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
 * Track calculation performed
 */
export async function trackCalculation(
  sessionId: string,
  inputs: any,
  results: any,
  leadId?: string
): Promise<void> {
  try {
    // Store the calculation
    await supabase.from('calculator_calculations').insert({
      session_id: sessionId,
      lead_id: leadId,
      project_type: inputs.projectType,
      labor_hours: inputs.laborHours,
      material_cost: inputs.materialCost,
      crew_size: inputs.crewSize,
      project_duration: inputs.projectDuration,
      recommended_bid: results.recommendedBid,
      profit_margin: results.profitMargin,
      hourly_rate: results.hourlyRate,
      break_even_amount: results.breakEvenAmount,
      risk_score: results.riskScore
    });

    // Update session calculations count
    await supabase.rpc('increment_session_calculations', {
      p_session_id: sessionId
    }).catch(() => {
      // Fallback if function doesn't exist
      console.log('Session calculation tracking not available');
    });

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
  } catch (error) {
    console.error('Failed to track calculation:', error);
  }
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
  try {
    const sessionData = getSessionData(sessionId);

    // Insert or update lead
    const { data, error } = await supabase
      .from('calculator_leads')
      .upsert({
        email,
        company_name: companyName,
        phone,
        utm_source: sessionData.utmSource,
        utm_medium: sessionData.utmMedium,
        utm_campaign: sessionData.utmCampaign,
        status: 'new',
        lead_score: 10 // Base score for email capture
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (error) throw error;

    const leadId = data?.id;

    // Update session with lead_id and email_captured flag
    await supabase
      .from('calculator_sessions')
      .update({
        lead_id: leadId,
        email_captured: true
      })
      .eq('session_id', sessionId);

    trackEvent({
      eventType: 'email_captured',
      sessionId,
      leadId,
      metadata: { email, hasCompanyName: !!companyName, hasPhone: !!phone },
      timestamp: new Date()
    });

    return leadId;
  } catch (error) {
    console.error('Failed to track email capture:', error);
    return null;
  }
}

/**
 * Track PDF download
 */
export async function trackPDFDownload(sessionId: string, leadId?: string): Promise<void> {
  try {
    await supabase
      .from('calculator_sessions')
      .update({ pdf_downloaded: true })
      .eq('session_id', sessionId);

    // Increase lead score for PDF download
    if (leadId) {
      await supabase.rpc('increment_lead_score', {
        p_lead_id: leadId,
        p_points: 5
      }).catch(() => console.log('Lead score increment not available'));
    }

    trackEvent({
      eventType: 'pdf_downloaded',
      sessionId,
      leadId,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to track PDF download:', error);
  }
}

/**
 * Track social share
 */
export async function trackSocialShare(
  sessionId: string,
  platform: string,
  leadId?: string
): Promise<void> {
  try {
    await supabase
      .from('calculator_sessions')
      .update({ social_shared: true })
      .eq('session_id', sessionId);

    // Increase lead score for social share
    if (leadId) {
      await supabase.rpc('increment_lead_score', {
        p_lead_id: leadId,
        p_points: 8
      }).catch(() => console.log('Lead score increment not available'));
    }

    trackEvent({
      eventType: 'social_share',
      sessionId,
      leadId,
      metadata: { platform },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to track social share:', error);
  }
}

/**
 * Track trial CTA click
 */
export async function trackTrialClick(sessionId: string, leadId?: string): Promise<void> {
  try {
    await supabase
      .from('calculator_sessions')
      .update({ trial_clicked: true })
      .eq('session_id', sessionId);

    // Increase lead score significantly for trial interest
    if (leadId) {
      await supabase.rpc('increment_lead_score', {
        p_lead_id: leadId,
        p_points: 20
      }).catch(() => console.log('Lead score increment not available'));
    }

    trackEvent({
      eventType: 'trial_clicked',
      sessionId,
      leadId,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to track trial click:', error);
  }
}

/**
 * Track referral
 */
export async function trackReferral(
  referrerEmail: string,
  refereeEmail: string
): Promise<void> {
  try {
    await supabase.from('calculator_referrals').insert({
      referrer_email: referrerEmail,
      referee_email: refereeEmail,
      status: 'pending'
    });

    // Update referrer's referral count
    await supabase
      .from('calculator_leads')
      .update({
        referral_count: supabase.raw('referral_count + 1')
      })
      .eq('email', referrerEmail);
  } catch (error) {
    console.error('Failed to track referral:', error);
  }
}

/**
 * Track time on page
 */
export function trackTimeOnPage(sessionId: string, duration: number): void {
  supabase
    .from('calculator_sessions')
    .update({ time_on_page: duration })
    .eq('session_id', sessionId)
    .then(() => {
      trackEvent({
        eventType: 'time_on_page',
        sessionId,
        metadata: { duration },
        timestamp: new Date()
      });
    })
    .catch(error => console.error('Failed to track time on page:', error));
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
  console.log('Analytics Event:', event);

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
