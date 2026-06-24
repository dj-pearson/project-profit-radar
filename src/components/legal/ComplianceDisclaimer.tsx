import React from 'react';
import { AlertTriangle, Sparkles, Scale, HardHat, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type DisclaimerVariant =
  | 'ai'
  | 'financial'
  | 'legal'
  | 'safety'
  | 'payroll'
  | 'general';

interface ComplianceDisclaimerProps {
  variant?: DisclaimerVariant;
  /** Additional copy appended after the standard disclaimer. */
  children?: React.ReactNode;
  className?: string;
  /** Render in a more compact, single-line form for tight UIs. */
  compact?: boolean;
}

const VARIANTS: Record<
  DisclaimerVariant,
  { icon: React.ReactNode; title: string; body: React.ReactNode }
> = {
  ai: {
    icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    title: 'AI-assisted output',
    body: (
      <>
        AI features can produce inaccurate, incomplete, or biased results. Review and verify
        outputs before relying on them for financial, contractual, safety, employment, or legal
        decisions. See our{' '}
        <Link to="/ai-disclosure" className="underline">
          AI Disclosure
        </Link>
        .
      </>
    ),
  },
  financial: {
    icon: <Calculator className="h-4 w-4" aria-hidden="true" />,
    title: 'Not professional financial advice',
    body: (
      <>
        Financial reports, projections, and calculations produced by Brikly are decision-support
        tools, not audited financial statements or professional accounting, tax, or investment
        advice. Confirm figures with your accountant, CPA, or financial advisor before making
        decisions or filings.
      </>
    ),
  },
  legal: {
    icon: <Scale className="h-4 w-4" aria-hidden="true" />,
    title: 'Not legal advice',
    body: (
      <>
        Templates, contract clauses, and compliance content provided through the Service are for
        general informational purposes only and do not constitute legal advice. Consult a
        qualified attorney for advice on your specific situation.
      </>
    ),
  },
  safety: {
    icon: <HardHat className="h-4 w-4" aria-hidden="true" />,
    title: 'Compliance support tool',
    body: (
      <>
        Safety, OSHA, and incident-tracking features support — but do not replace — your written
        safety program, certified safety personnel, or required regulatory filings. You remain
        responsible for the accuracy and timeliness of all submissions to OSHA and other
        authorities.
      </>
    ),
  },
  payroll: {
    icon: <Calculator className="h-4 w-4" aria-hidden="true" />,
    title: 'Employer responsibility',
    body: (
      <>
        Time tracking, payroll, certified payroll, and prevailing-wage features assist your
        compliance program. They do not relieve the employer of responsibility for correct worker
        classification, wage-and-hour compliance (FLSA, state law), and accurate certified
        payroll filings (e.g., DOL Form WH-347). Review all calculations before submission.
      </>
    ),
  },
  general: {
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
    title: 'Disclaimer',
    body: (
      <>
        Information provided by the Service is for general operational use only. You remain
        responsible for the accuracy of your records and for compliance with applicable laws and
        contracts.
      </>
    ),
  },
};

/**
 * ComplianceDisclaimer
 *
 * Reusable, accessible banner that surfaces the appropriate "this is a tool,
 * not professional advice" notice next to features that produce AI output,
 * financial statements, payroll calculations, safety records, or legal
 * templates. Helps protect against UDAAP claims and the reliance-based theories
 * of liability that come with construction, payroll, and AI tooling.
 */
const ComplianceDisclaimer: React.FC<ComplianceDisclaimerProps> = ({
  variant = 'general',
  children,
  className,
  compact = false,
}) => {
  const config = VARIANTS[variant];

  return (
    <aside
      role="note"
      aria-label={config.title}
      className={cn(
        'flex gap-3 rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-900 dark:text-yellow-100',
        compact && 'py-2 text-xs',
        className,
      )}
    >
      <span className="mt-0.5 flex-shrink-0">{config.icon}</span>
      <div>
        <strong className="font-semibold">{config.title}.</strong>{' '}
        <span>{config.body}</span>
        {children && <div className="mt-1">{children}</div>}
      </div>
    </aside>
  );
};

export default ComplianceDisclaimer;
