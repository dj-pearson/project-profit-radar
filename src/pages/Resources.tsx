import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { QuickAnswerSnippet, LastUpdated } from "@/components/seo/QuickAnswerSnippet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import { supabase } from "@/integrations/supabase/client";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
  seo_description: string | null;
}

const Resources = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, featured_image_url, published_at, created_at, seo_description")
          .eq("status", "published")
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(12);

        if (error) throw error;
        setBlogPosts(data || []);
      } catch (err) {
        console.error("Error loading blog posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchBlogPosts();
  }, []);

  const resourceCategories = [
    {
      title: "Construction Management Guides",
      posts: [
        {
          title: "Best Construction Management Software for Small Business (2025)",
          description: "Complete guide to choosing construction management software for small contractors. Compare features, pricing, and ROI.",
          readTime: "12 min read",
          author: "Brikly Team",
          slug: "best-construction-management-software-small-business-2025",
          category: "Software Guides"
        },
        {
          title: "Job Costing in Construction: Setup Guide & Common Mistakes",
          description: "Master job costing with our step-by-step guide. Learn to track costs, improve margins, and avoid costly mistakes.",
          readTime: "8 min read",
          author: "Brikly Team",
          slug: "job-costing-construction-setup-guide",
          category: "Financial Management"
        },
        {
          title: "OSHA Safety Logs: Digital Playbook for Construction Teams",
          description: "Complete guide to OSHA compliance. Templates, workflows, and digital tools to keep your team safe and compliant.",
          readTime: "15 min read",
          author: "Brikly Team", 
          slug: "osha-safety-logs-digital-playbook",
          category: "Safety"
        },
        {
          title: "Construction Scheduling Software: Stop Project Delays",
          description: "Simple scheduling rules that prevent delays. Learn how small contractors can improve project timelines.",
          readTime: "10 min read",
          author: "Brikly Team",
          slug: "construction-scheduling-software-prevent-delays",
          category: "Project Management"
        },
        {
          title: "Construction Daily Logs: What to Track and Why It Pays",
          description: "Essential guide to daily logs that reduce rework and improve project outcomes. Templates and best practices included.",
          readTime: "9 min read",
          author: "Brikly Team",
          slug: "construction-daily-logs-best-practices",
          category: "Field Management"
        }
      ]
    },
    {
      title: "Software Comparisons",
      posts: [
        {
          title: "Procore vs Brikly: Which is Better for Small GC Teams?",
          description: "Honest comparison of Procore and Brikly for small contractors. Features, pricing, and ease of use compared.",
          readTime: "6 min read",
          author: "Brikly Team",
          slug: "procore-vs-brikly-small-contractors",
          category: "Comparisons"
        },
        {
          title: "QuickBooks Integration Guide",
          description: "Step-by-step guide to integrate QuickBooks with construction management software for automated accounting.",
          readTime: "8 min read",
          author: "Brikly Team",
          slug: "quickbooks-integration-guide",
          category: "Integration"
        },
        {
          title: "Construction Mobile App Guide",
          description: "Best construction mobile apps for field teams. Compare features and find the perfect field management solution.",
          readTime: "10 min read",
          author: "Brikly Team",
          slug: "construction-mobile-app-guide",
          category: "Mobile"
        },
        {
          title: "Brikly vs Buildertrend: Feature & Pricing Comparison",
          description: "Side-by-side comparison of Brikly and Buildertrend for residential and commercial contractors.",
          readTime: "7 min read",
          author: "Brikly Team",
          slug: "brikly-vs-buildertrend-comparison",
          category: "Comparisons"
        }
      ]
    },
    {
      title: "Safety & Compliance",
      posts: [
        {
          title: "OSHA Safety Logs: Digital Playbook for Construction Teams",
          description: "Complete guide to OSHA compliance. Templates, workflows, and digital tools to keep your team safe and compliant.",
          readTime: "15 min read",
          author: "Brikly Team",
          slug: "osha-safety-logs-digital-playbook",
          category: "Safety"
        },
        {
          title: "Construction Daily Logs: What to Track and Why It Pays",
          description: "Essential guide to daily logs that reduce rework and improve project outcomes. Templates and best practices included.",
          readTime: "9 min read",
          author: "Brikly Team",
          slug: "construction-daily-logs-best-practices",
          category: "Field Management"
        },
        {
          title: "Construction Scheduling Software: Stop Project Delays",
          description: "Simple scheduling rules that prevent delays. Learn how small contractors can improve project timelines.",
          readTime: "10 min read",
          author: "Brikly Team",
          slug: "construction-scheduling-software-prevent-delays",
          category: "Project Management"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Construction Management Resources & Guides | Brikly"
        description="Free construction management guides, software comparisons, and best practices for small contractors. Job costing, OSHA compliance, scheduling tips, and more."
        keywords={[
          'construction management resources',
          'construction management guides',
          'job costing guide',
          'OSHA compliance construction',
          'construction scheduling tips',
          'procore alternative comparison',
          'buildertrend alternative',
          'construction software guide'
        ]}
        canonicalUrl="/resources"
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Construction Management Resources
          </h1>
          <LastUpdated date="September 2025" />
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Free guides, comparisons, and best practices to help small contractors 
            improve project outcomes, reduce costs, and stay compliant.
          </p>
        </div>
        
        <QuickAnswerSnippet
          question="Where can I find construction management guides and resources?"
          answer="Brikly offers free construction management guides covering job costing, OSHA compliance, scheduling, software comparisons (Procore vs Brikly, Buildertrend alternatives), and best practices specifically for small contractors."
        />

        {/* Topic Hubs Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-8">Topic Hubs</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-primary">
              <CardHeader>
                <Badge className="w-fit mb-2">Hub</Badge>
                <CardTitle className="text-lg">
                  <Link 
                    to="/topics/construction-management-basics"
                    className="hover:text-primary transition-colors"
                  >
                    Construction Management Basics
                  </Link>
                </CardTitle>
                <CardDescription>
                  Master the fundamentals: project planning, cost control, team management, and execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/topics/construction-management-basics">
                    Explore Hub <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader>
                <Badge className="w-fit mb-2">Hub</Badge>
                <CardTitle className="text-lg">
                  <Link 
                    to="/topics/safety-and-osha-compliance"
                    className="hover:text-primary transition-colors"
                  >
                    Safety & OSHA Compliance
                  </Link>
                </CardTitle>
                <CardDescription>
                  Keep your team safe and avoid OSHA violations with digital tools and best practices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/topics/safety-and-osha-compliance">
                    Explore Hub <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Latest Articles from Blog */}
        {blogPosts.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold">Latest Articles</h2>
              <Badge variant="outline" className="text-sm">
                {blogPosts.length} article{blogPosts.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map((post) => {
                const publishDate = post.published_at || post.created_at;
                const formattedDate = new Date(publishDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const imageUrl = post.featured_image_url?.replace(
                  /https?:\/\/[a-z0-9]+\.supabase\.co\/storage\//gi,
                  "https://api.brikly.net/storage/"
                );

                return (
                  <Card key={post.id} className="h-full flex flex-col overflow-hidden">
                    {imageUrl && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Article</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formattedDate}
                        </span>
                      </div>
                      <CardTitle className="text-lg leading-tight">
                        <Link
                          to={`/resources/${post.slug}`}
                          className="hover:text-primary transition-colors"
                        >
                          {post.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {post.excerpt || post.seo_description || ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-end">
                      <Button asChild variant="outline" className="w-full">
                        <Link to={`/resources/${post.slug}`}>
                          Read Article <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Resource Categories */}
        {resourceCategories.map((category, categoryIndex) => (
          <section key={categoryIndex} className="mb-16">
            <h2 className="text-2xl font-semibold mb-8">{category.title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.posts.map((post, postIndex) => (
                <Card key={postIndex} className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{post.category}</Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      <Link 
                        to={`/resources/${post.slug}`}
                        className="hover:text-primary transition-colors"
                      >
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {post.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/resources/${post.slug}`}>
                        Read Guide <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center mt-16">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Improve Your Project Management?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            See how Brikly helps small contractors reduce delays, improve margins, 
            and stay compliant with simple, powerful project management tools.
          </p>
          <Button asChild size="lg">
            <Link to="/auth">Start Free Trial</Link>
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Resources;