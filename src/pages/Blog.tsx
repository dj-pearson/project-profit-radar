import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Blog = () => {
  return (
    <>
      <SEOMetaTags
        title="Construction Industry Blog - BuildDesk"
        description="Expert insights on construction management, project efficiency, safety compliance, and industry best practices. Stay updated with the latest construction technology trends."
        keywords={['construction blog', 'construction management articles', 'construction industry insights', 'construction best practices', 'construction technology']}
        canonicalUrl="/blog"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-4">
                Construction Industry Blog
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Expert insights, best practices, and industry trends to help your construction business thrive.
              </p>
              <Link to="/resources">
                <Button className="bg-construction-blue hover:bg-construction-blue/90">
                  Browse All Articles
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg border p-8 text-center">
                <h2 className="text-2xl font-semibold text-construction-dark mb-4">
                  Explore Our Resource Library
                </h2>
                <p className="text-muted-foreground mb-6">
                  Our comprehensive collection of articles, guides, and resources is available in our Resources section.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-construction-light/20 rounded-lg">
                    <h3 className="font-semibold text-construction-dark mb-2">Industry Guides</h3>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive guides for construction management, software selection, and best practices.
                    </p>
                  </div>
                  <div className="p-4 bg-construction-light/20 rounded-lg">
                    <h3 className="font-semibold text-construction-dark mb-2">How-To Articles</h3>
                    <p className="text-sm text-muted-foreground">
                      Step-by-step tutorials to optimize your construction operations and workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Blog;
