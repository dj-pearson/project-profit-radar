import { TrendingUp, Users, Award } from "lucide-react";
import { AggregateRatingSchema } from "@/components/seo/AggregateRatingSchema";
import { CLAIMS } from "@/config/claims";

/**
 * SocialProof
 *
 * NOTE: This component previously rendered fabricated customer testimonials
 * (fake names paired with Unsplash stock photos) and unsubstantiated stats
 * ("2,500+ Active Projects", "$12M+ Cost Saved", "500+ Contractors"). Those
 * are FTC Endorsement Guide and §5 violations and have been removed.
 *
 * To re-enable specific numbers:
 *   1. Replace the placeholder copy below with the verified figure.
 *   2. Update src/config/claims.ts (set `verified: true` and add a source).
 *   3. Read from CLAIMS.* and conditionally render only when verified.
 *
 * To re-enable testimonials:
 *   - Use real, attributable quotes with the customer's signed permission on
 *     file (FTC Endorsement Guides 16 C.F.R. § 255).
 *   - Disclose any material connection (free service, payment, employee).
 *   - Replace stock-photo headshots with the actual customer's photo or use
 *     no photo at all.
 */

interface StatTile {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  /** When false, the tile is hidden until the underlying claim is verified. */
  show: boolean;
}

const stats: StatTile[] = [
  {
    label: "Active contractors",
    value: CLAIMS.customerCount.value,
    icon: Users,
    show: CLAIMS.customerCount.verified,
  },
  {
    label: "Built-in modules",
    value: "30+",
    icon: TrendingUp,
    // Static product fact — describes the product itself, not a usage metric.
    show: true,
  },
  {
    label: "Avg. margin improvement",
    value: CLAIMS.marginImprovement.value,
    icon: Award,
    show: CLAIMS.marginImprovement.verified,
  },
];

const SocialProof = () => {
  const visibleStats = stats.filter((s) => s.show);

  return (
    <div className="space-y-16">
      {/* Trust indicators — schema only renders when real review data exists
          (see AggregateRatingSchema). Without it we still show a friendly
          generic header rather than a fabricated star count. */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm">
          <AggregateRatingSchema
            showVisual={true}
            className="flex items-center gap-2"
            schemaType="SoftwareApplication"
          />
          <span className="text-sm font-medium ml-2">
            Built with input from working construction professionals
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-construction-dark dark:text-white">
          Built for the way{" "}
          <span className="text-gradient">contractors actually work</span>
        </h2>
      </div>

      {/* Stats grid — only renders when at least one tile has a verified
          claim or is a static product fact. */}
      {visibleStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {visibleStats.map((stat, index) => (
            <div
              key={index}
              className="glass-card p-6 rounded-2xl text-center relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-construction-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <stat.icon className="h-8 w-8 mx-auto mb-4 text-construction-orange" />
              <div className="text-3xl font-bold text-construction-dark dark:text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Testimonials and customer-logo grid removed pending real, signed
          customer endorsements. Re-introduce here following the rules
          documented at the top of this file. */}
    </div>
  );
};

export default SocialProof;
