import { Star, TrendingUp, Users, Award } from "lucide-react";


const SocialProof = () => {
  const testimonials = [
    {
      quote: "Increased project profit margins by 23% in our first year. The real-time cost tracking is a game-changer.",
      author: "Mike R.",
      role: "Owner",
      company: "Regional Contractor",
      metric: "+23% Profit",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces"
    },
    {
      quote: "Cut admin time from 6 hours to 30 minutes daily. Our team can focus on actual construction work now.",
      author: "Sarah C.",
      role: "CFO",
      company: "Commercial Builder",
      metric: "5.5hrs Saved/Day",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces"
    },
    {
      quote: "First time we've completed a project on time and under budget in 3 years. The scheduling tools are incredible.",
      author: "Jim P.",
      role: "Project Manager",
      company: "Residential Contractor",
      metric: "100% On-Time",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces"
    }
  ];

  const stats = [
    { label: "Active Projects", value: "2,500+", icon: TrendingUp },
    { label: "Contractors", value: "500+", icon: Users },
    { label: "Cost Saved", value: "$12M+", icon: Award },
  ];

  const companies = [
    "ABC Construction", "Premier Builders", "Metro Contractors",
    "Elite Construction", "Apex Builders", "Summit Construction"
  ];

  return (
    <div className="space-y-16">
      {/* Trust Indicators */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-construction-orange text-construction-orange" />
            ))}
          </div>
          <span className="text-sm font-medium">Rated 4.9/5 by Construction Pros</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-construction-dark dark:text-white">
          Trusted by the <span className="text-gradient">Best Builders</span>
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {stats.map((stat, index) => (
          <div key={index} className="glass-card p-6 rounded-2xl text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-construction-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <stat.icon className="h-8 w-8 mx-auto mb-4 text-construction-orange" />
            <div className="text-3xl font-bold text-construction-dark dark:text-white mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {testimonials.map((t, i) => (
          <div key={i} className="glass-card glass-card-hover p-6 rounded-2xl flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-construction-orange text-construction-orange" />
                ))}
              </div>
              <blockquote className="text-lg text-construction-dark dark:text-gray-200 mb-6 leading-relaxed">
                "{t.quote}"
              </blockquote>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-border/50">
              <img src={t.image} alt={t.author} className="w-10 h-10 rounded-full object-cover ring-2 ring-construction-orange/20" />
              <div>
                <div className="font-bold text-construction-dark dark:text-white">{t.author}</div>
                <div className="text-xs text-muted-foreground">{t.role}, {t.company}</div>
              </div>
              <div className="ml-auto">
                <span className="inline-block px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold rounded-md">
                  {t.metric}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logos */}
      <div className="pt-8 border-t border-border/30">
        <p className="text-center text-sm text-muted-foreground mb-8">Powering construction companies of all sizes</p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 grayscale hover:grayscale-0 transition-all duration-500">
          {companies.map((company, i) => (
            <span key={i} className="text-xl font-bold text-construction-dark dark:text-white">{company}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialProof;