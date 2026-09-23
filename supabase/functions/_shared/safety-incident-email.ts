/**
 * HTML body for send-safety-notification.
 *
 * Every incident field is user-entered (description, location, actions taken)
 * or client-supplied (id, type, severity, reported_at), so each one is escaped
 * before it lands in the mail. Pure so vitest can import it.
 */
import { escapeHtml } from './html-escape.ts';

export interface SafetyIncidentForEmail {
  id?: string | null;
  incident_type: string;
  severity: string;
  description?: string | null;
  location_description?: string | null;
  reported_at?: string | null;
  immediate_actions_taken?: string | null;
}

export const getSeverityEmoji = (severity: string): string => {
  switch (severity) {
    case 'critical': return '\u{1F6A8}';
    case 'high': return '\u26A0\uFE0F';
    case 'medium': return '\u{1F536}';
    case 'low': return '\u{1F535}';
    default: return '\u{1F4CB}';
  }
};

// Fixed palette keyed on severity, never the raw value, so it is safe in style="".
export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#d97706';
    case 'low': return '#2563eb';
    default: return '#6b7280';
  }
};

const text = (value: unknown): string => escapeHtml(value == null ? '' : String(value));

export const generateIncidentHTML = (incident: SafetyIncidentForEmail): string => {
  const severityEmoji = getSeverityEmoji(incident.severity);
  const severityColor = getSeverityColor(incident.severity);
  const reportedAt = incident.reported_at ? new Date(incident.reported_at).toLocaleString() : 'Not specified';
  const incidentId = incident.id == null ? '' : String(incident.id);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Safety Incident Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-left: 4px solid ${severityColor}; padding-left: 20px; margin-bottom: 20px;">
        <h1 style="color: ${severityColor}; margin: 0 0 10px 0;">
          ${severityEmoji} Safety Incident Reported
        </h1>
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${severityColor};">
          ${text(incident.severity.toUpperCase())} SEVERITY
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #2c3e50;">Incident Details</h2>

        <div style="margin-bottom: 15px;">
          <strong>Type:</strong> ${text(incident.incident_type.replace('_', ' ').toUpperCase())}
        </div>

        <div style="margin-bottom: 15px;">
          <strong>Location:</strong> ${text(incident.location_description || 'Not specified')}
        </div>

        <div style="margin-bottom: 15px;">
          <strong>Reported:</strong> ${text(reportedAt)}
        </div>

        <div style="margin-bottom: 15px;">
          <strong>Incident ID:</strong> ${text(incidentId)}
        </div>
      </div>

      <div style="background-color: #fff; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #2c3e50;">Description</h3>
        <p style="margin-bottom: 0; white-space: pre-wrap;">${text(incident.description)}</p>
      </div>

      ${incident.immediate_actions_taken ? `
        <div style="background-color: #e8f5e8; border: 1px solid #b4e4b4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #2d5a2d;">Immediate Actions Taken</h3>
          <p style="margin-bottom: 0; white-space: pre-wrap;">${text(incident.immediate_actions_taken)}</p>
        </div>
      ` : ''}

      <div style="border-top: 2px solid #dee2e6; padding-top: 20px; text-align: center;">
        <p style="margin: 0; color: #6c757d; font-size: 14px;">
          This is an automated safety notification from Brikly.<br>
          Please review and take appropriate action immediately.
        </p>

        <div style="margin-top: 15px;">
          <a href="https://brikly.app/safety/incidents/${text(encodeURIComponent(incidentId))}"
             style="background-color: ${severityColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Full Report
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
};
