import { Brain, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const FinancialHealthCheckBanner = () => {
  return (
    <section className="bg-gradient-to-r from-construction-orange via-construction-orange/90 to-construction-blue py-8 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
              <Brain className="h-6 w-6 text-white" />
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                FREE ASSESSMENT
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Is Financial Blindness Costing You $40K+ Annually?
            </h2>
            <p className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0">
              Take our 2-minute Financial Intelligence Health Check and discover exactly what you're losing
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-4 text-white/90 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>12 Quick Questions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Instant Results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Personalized Report</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-construction-orange hover:bg-white/90 font-bold text-lg px-8 py-6 group"
              asChild
            >
              <Link to="/financial-health-check">
                Get My Free Assessment
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <p className="text-white/80 text-xs text-center mt-2">
              No credit card • 500+ contractors assessed
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinancialHealthCheckBanner;
