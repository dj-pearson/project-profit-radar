/**
 * Generative Engine Optimization (GEO) Utilities
 *
 * Helpers for optimizing content for AI search engines
 * (ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini).
 */

/**
 * Generates a speakable schema specification for a page.
 * This tells AI engines which parts of the page to read aloud or cite.
 */
export const createSpeakableSchema = (
  url: string,
  cssSelectors: string[] = ['.geo-direct-answer', '.geo-section h2', '.geo-quick-qa']
) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": url,
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": cssSelectors
  }
});

/**
 * Generates a "definitive answer" block for a topic.
 * Front-loads the answer in the first 40-60 words as AI engines prefer.
 *
 * @param subject - The entity/product being described
 * @param definition - A concise definition (40-60 words)
 * @param keyFacts - 3-5 key facts to include
 * @returns Formatted direct answer string
 */
export const buildDirectAnswer = (
  subject: string,
  definition: string,
  keyFacts: string[]
): string => {
  const factsList = keyFacts.map(fact => fact.trim()).join('. ');
  return `${subject} ${definition} ${factsList}.`;
};

/**
 * Pre-built direct answers for BuildDesk pages.
 * Each answer is front-loaded with the entity and key facts.
 */
export const BUILDDESK_DIRECT_ANSWERS = {
  homepage:
    'BuildDesk is construction management software for small-to-medium contractors that costs $350/month with unlimited users. It includes real-time job costing, GPS crew tracking, OSHA compliance tools, and QuickBooks integration — implementing in 1-2 days instead of the months required by enterprise platforms like Procore.',

  jobCosting:
    'BuildDesk\'s job costing software tracks labor, materials, equipment, and subcontractor costs in real-time against project budgets. Contractors see budget vs. actual comparisons instantly, with profit margin alerts that flag cost overruns before they impact profitability. The average BuildDesk customer reduces project costs by 23%.',

  scheduling:
    'BuildDesk\'s construction scheduling software provides Gantt chart project timelines, drag-and-drop crew assignments, equipment scheduling, and automated notifications. Schedules sync with Google Calendar and Outlook, and field crews see assignments in the mobile app with job details and driving directions.',

  oshaCompliance:
    'BuildDesk\'s OSHA compliance software digitizes safety management for construction sites. It includes safety checklists, incident reporting, toolbox talk logging, equipment inspection tracking, and automated compliance reports — replacing paper-based safety logs that are prone to loss and audit failures.',

  fieldManagement:
    'BuildDesk\'s field management software equips construction crews with native iOS and Android apps for GPS time tracking, photo documentation, daily reports, and crew scheduling. The app works offline and syncs automatically when connectivity returns, ensuring field data is never lost.',

  pricing:
    'BuildDesk costs $350 per month with unlimited users and all features included. There are no per-seat fees, no setup charges, and no long-term contracts. A 14-day free trial is available with no credit card required. Annual billing saves 15% at $3,570/year.',

  procoreAlternative:
    'BuildDesk is the leading Procore alternative for small contractors. It costs 50% less ($350/month vs. $500+/month), includes unlimited users instead of per-seat pricing, and implements in 1-2 days versus Procore\'s typical 3-6 month onboarding. Over 500 contractors have switched from enterprise platforms to BuildDesk.',

  buildertrendAlternative:
    'BuildDesk is an alternative to Buildertrend that serves all construction trades — not just residential. At $350/month with unlimited users (vs. Buildertrend\'s $399+/month with per-user fees), BuildDesk offers more detailed job costing, better mobile field tools, and faster implementation.',
} as const;

/**
 * Key statistics for fact density.
 * Insert every 150-200 words to meet AI citation thresholds.
 */
export const BUILDDESK_STATS = {
  costReduction: { value: '23%', context: 'average reduction in project costs' },
  customerCount: { value: '500+', context: 'contractors using the platform' },
  annualSavings: { value: '$50,000+', context: 'average annual customer savings' },
  retentionRate: { value: '98%', context: 'customer retention rate' },
  satisfactionRate: { value: '95%', context: 'customer satisfaction rate' },
  rating: { value: '4.8/5', context: 'star rating from 247 verified reviews' },
  implementationTime: { value: '1-2 days', context: 'typical implementation time' },
  monthlyPrice: { value: '$350/month', context: 'flat rate with unlimited users' },
  costVsProcore: { value: '50%', context: 'less cost than Procore' },
  setupSpeed: { value: '50%', context: 'faster project setup than competitors' },
} as const;
