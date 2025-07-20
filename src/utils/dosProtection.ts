import { supabase } from "@/integrations/supabase/client";

interface DosProtectionConfig {
  enabled: boolean;
  autoBlockThreshold: number;
  blockDurationHours: number;
  detectionWindowMinutes: number;
  whitelistEnabled: boolean;
  geoBlockingEnabled: boolean;
  challengeResponseEnabled: boolean;
}

interface TrafficAnalysis {
  ipAddress: string;
  requestCount: number;
  timeWindow: number;
  isAnomalous: boolean;
  riskScore: number;
  patterns: string[];
}

class DosProtectionService {
  private config: DosProtectionConfig;
  private requestCounts: Map<string, { count: number; firstRequest: number; lastRequest: number }> = new Map();
  private blockedIPs: Set<string> = new Set();
  private whitelistedIPs: Set<string> = new Set();

  constructor() {
    this.config = {
      enabled: true,
      autoBlockThreshold: 100,
      blockDurationHours: 24,
      detectionWindowMinutes: 5,
      whitelistEnabled: false,
      geoBlockingEnabled: false,
      challengeResponseEnabled: false,
    };
    
    this.loadConfiguration();
    this.loadBlockedIPs();
    this.loadWhitelistedIPs();
  }

  async loadConfiguration() {
    try {
      const { data, error } = await supabase.functions.invoke('dos-protection', {
        body: { action: 'get_settings' }
      });
      
      if (!error && data?.settings) {
        this.config = data.settings;
      }
    } catch (error) {
      console.error('Failed to load DOS protection config:', error);
    }
  }

  async loadBlockedIPs() {
    try {
      const { data, error } = await supabase
        .from('ip_access_control')
        .select('ip_address')
        .eq('access_type', 'blacklist')
        .eq('is_active', true);
      
      if (!error && data) {
        this.blockedIPs = new Set(data.map(item => item.ip_address));
      }
    } catch (error) {
      console.error('Failed to load blocked IPs:', error);
    }
  }

  async loadWhitelistedIPs() {
    try {
      const { data, error } = await supabase
        .from('ip_access_control')
        .select('ip_address')
        .eq('access_type', 'whitelist')
        .eq('is_active', true);
      
      if (!error && data) {
        this.whitelistedIPs = new Set(data.map(item => item.ip_address));
      }
    } catch (error) {
      console.error('Failed to load whitelisted IPs:', error);
    }
  }

  /**
   * Check if a request should be allowed or blocked
   */
  async checkRequest(ipAddress: string, endpoint: string, userAgent?: string): Promise<{
    allowed: boolean;
    reason?: string;
    action?: 'block' | 'challenge' | 'monitor';
    riskScore?: number;
  }> {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    // Check if IP is blocked
    if (this.blockedIPs.has(ipAddress)) {
      return { 
        allowed: false, 
        reason: 'IP address is blocked',
        action: 'block'
      };
    }

    // Check if IP is whitelisted
    if (this.whitelistedIPs.has(ipAddress)) {
      return { allowed: true };
    }

    // Analyze traffic patterns
    const analysis = this.analyzeTraffic(ipAddress, endpoint, userAgent);
    
    // Auto-block if threshold exceeded
    if (analysis.requestCount >= this.config.autoBlockThreshold) {
      await this.blockIP(ipAddress, `Auto-blocked: ${analysis.requestCount} requests in ${this.config.detectionWindowMinutes} minutes`);
      return { 
        allowed: false, 
        reason: 'Rate limit exceeded - auto-blocked',
        action: 'block',
        riskScore: analysis.riskScore
      };
    }

    // Challenge response for suspicious activity
    if (this.config.challengeResponseEnabled && analysis.riskScore > 70) {
      return { 
        allowed: false, 
        reason: 'Suspicious activity detected',
        action: 'challenge',
        riskScore: analysis.riskScore
      };
    }

    // Monitor high-risk requests
    if (analysis.riskScore > 50) {
      this.logSecurityEvent(ipAddress, 'suspicious_activity', {
        riskScore: analysis.riskScore,
        requestCount: analysis.requestCount,
        patterns: analysis.patterns
      });
      
      return { 
        allowed: true, 
        action: 'monitor',
        riskScore: analysis.riskScore
      };
    }

    return { allowed: true, riskScore: analysis.riskScore };
  }

  /**
   * Analyze traffic patterns for anomalies
   */
  private analyzeTraffic(ipAddress: string, endpoint: string, userAgent?: string): TrafficAnalysis {
    const now = Date.now();
    const windowMs = this.config.detectionWindowMinutes * 60 * 1000;
    const windowStart = now - windowMs;

    // Get or create request record
    let record = this.requestCounts.get(ipAddress);
    if (!record) {
      record = { count: 0, firstRequest: now, lastRequest: now };
      this.requestCounts.set(ipAddress, record);
    }

    // Clean old records
    if (record.firstRequest < windowStart) {
      record.count = 1;
      record.firstRequest = now;
    } else {
      record.count++;
    }
    record.lastRequest = now;

    // Calculate risk score based on multiple factors
    let riskScore = 0;
    const patterns: string[] = [];

    // High frequency requests
    if (record.count > this.config.autoBlockThreshold * 0.5) {
      riskScore += 30;
      patterns.push('high_frequency');
    }

    // Rapid burst detection
    const requestRate = record.count / (this.config.detectionWindowMinutes / 60);
    if (requestRate > 100) { // More than 100 requests per minute
      riskScore += 25;
      patterns.push('rapid_burst');
    }

    // Suspicious endpoints
    if (this.isSuspiciousEndpoint(endpoint)) {
      riskScore += 20;
      patterns.push('suspicious_endpoint');
    }

    // Bot-like user agent
    if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
      riskScore += 15;
      patterns.push('suspicious_user_agent');
    }

    // Geographic risk (placeholder for future implementation)
    if (this.config.geoBlockingEnabled) {
      // Could integrate with GeoIP service
      // riskScore += this.calculateGeoRisk(ipAddress);
    }

    return {
      ipAddress,
      requestCount: record.count,
      timeWindow: this.config.detectionWindowMinutes,
      isAnomalous: riskScore > 50,
      riskScore: Math.min(riskScore, 100),
      patterns
    };
  }

  /**
   * Check if endpoint is commonly targeted by attacks
   */
  private isSuspiciousEndpoint(endpoint: string): boolean {
    const suspiciousPatterns = [
      '/admin',
      '/wp-admin',
      '/phpmyadmin',
      '/.env',
      '/config',
      '/backup',
      '/sql',
      '/database',
      '/.git',
      '/xmlrpc.php'
    ];

    return suspiciousPatterns.some(pattern => endpoint.includes(pattern));
  }

  /**
   * Check if user agent appears to be automated/malicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousAgents = [
      'python-requests',
      'curl/',
      'wget/',
      'scrapy',
      'bot',
      'spider',
      'crawler'
    ];

    const normalizedAgent = userAgent.toLowerCase();
    return suspiciousAgents.some(agent => normalizedAgent.includes(agent));
  }

  /**
   * Block an IP address
   */
  async blockIP(ipAddress: string, reason: string): Promise<void> {
    try {
      await supabase.functions.invoke('dos-protection', {
        body: { 
          action: 'block_ip',
          ip_address: ipAddress,
          reason
        }
      });
      
      this.blockedIPs.add(ipAddress);
      
      // Remove from request tracking
      this.requestCounts.delete(ipAddress);
      
      console.log(`IP ${ipAddress} blocked: ${reason}`);
    } catch (error) {
      console.error('Failed to block IP:', error);
    }
  }

  /**
   * Unblock an IP address
   */
  async unblockIP(ipAddress: string): Promise<void> {
    try {
      await supabase.functions.invoke('dos-protection', {
        body: { 
          action: 'unblock_ip',
          ip_address: ipAddress
        }
      });
      
      this.blockedIPs.delete(ipAddress);
      
      console.log(`IP ${ipAddress} unblocked`);
    } catch (error) {
      console.error('Failed to unblock IP:', error);
    }
  }

  /**
   * Add IP to whitelist
   */
  async whitelistIP(ipAddress: string): Promise<void> {
    try {
      await supabase.functions.invoke('dos-protection', {
        body: { 
          action: 'whitelist_ip',
          ip_address: ipAddress
        }
      });
      
      this.whitelistedIPs.add(ipAddress);
      
      console.log(`IP ${ipAddress} whitelisted`);
    } catch (error) {
      console.error('Failed to whitelist IP:', error);
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(ipAddress: string, eventType: string, metadata: any): Promise<void> {
    try {
      await supabase
        .from('security_events')
        .insert({
          event_type: eventType,
          severity: 'medium',
          description: `DOS protection event for IP ${ipAddress}`,
          ip_address: ipAddress,
          metadata
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get current protection statistics
   */
  async getStatistics(): Promise<{
    totalBlocked: number;
    totalWhitelisted: number;
    activeMonitoring: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const activeMonitoring = this.requestCounts.size;
    const totalRequests = Array.from(this.requestCounts.values())
      .reduce((sum, record) => sum + record.count, 0);

    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalRequests > 10000) threatLevel = 'critical';
    else if (totalRequests > 5000) threatLevel = 'high';
    else if (totalRequests > 1000) threatLevel = 'medium';

    return {
      totalBlocked: this.blockedIPs.size,
      totalWhitelisted: this.whitelistedIPs.size,
      activeMonitoring,
      threatLevel
    };
  }

  /**
   * Cleanup old request records
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = this.config.detectionWindowMinutes * 60 * 1000 * 2; // Double the window

    for (const [ip, record] of this.requestCounts.entries()) {
      if (now - record.lastRequest > maxAge) {
        this.requestCounts.delete(ip);
      }
    }
  }
}

// Create singleton instance
export const dosProtectionService = new DosProtectionService();

// Cleanup old records every 5 minutes
setInterval(() => {
  dosProtectionService.cleanup();
}, 5 * 60 * 1000);

export default dosProtectionService;