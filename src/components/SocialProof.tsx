import { Star } from "lucide-react";

const SocialProof = () => {
  const testimonials = [
    {
      quote: "Increased project profit margins by 23% in our first year. The real-time cost tracking is a game-changer.",
      author: "Mike R.",
      company: "Regional Contractor",
      savings: "23% profit increase"
    },
    {
      quote: "Cut admin time from 6 hours to 30 minutes daily. Our team can focus on actual construction work now.",
      author: "Sarah C.",
      company: "Commercial Builder",
      savings: "5.5 hours saved daily"
    },
    {
      quote: "First time we've completed a project on time and under budget in 3 years. The scheduling tools are incredible.",
      author: "Jim P.",
      company: "Residential Contractor",
      savings: "On-time delivery"
    }
  ];

  const companyLogos = [
    "ABC Construction", "Premier Builders", "Metro Contractors", 
    "Elite Construction", "Apex Builders", "Summit Construction"
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-secondary/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Indicators */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 fill-construction-orange text-construction-orange" />
              ))}
            </div>
            <span className="text-base sm:text-lg font-semibold text-construction-dark">4.8/5 stars</span>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Trusted by contractors nationwide</p>
        </div>

        {/* Company Logos */}
        <div className="mb-12 sm:mb-16">
          <p className="text-center text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">Trusted by leading contractors</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 lg:gap-8 items-center">
            {companyLogos.map((company, index) => (
              <div key={index} className="text-center">
                <div className="h-10 sm:h-12 bg-muted rounded flex items-center justify-center px-2">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{company}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-card p-4 sm:p-6 rounded-lg border shadow-card hover:shadow-lg transition-shadow">
              <div className="flex mb-3 sm:mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-construction-orange text-construction-orange" />
                ))}
              </div>
              <blockquote className="text-card-foreground mb-4 italic text-sm sm:text-base leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-construction-dark text-sm sm:text-base">{testimonial.author}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{testimonial.company}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm font-semibold text-construction-orange">{testimonial.savings}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Integration Badge */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Seamlessly Integrates With Your Tools</p>
          <div className="flex justify-center gap-4 sm:gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-construction-blue rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">QB</span>
              </div>
              <span className="font-medium">QuickBooks Integration</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;