import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { enterpriseSeoService } from '@/services/EnterpriseSeOService';

export interface ContentSEOConfig {
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetAudience: 'contractors' | 'project_managers' | 'business_owners' | 'general';
  contentType: 'blog_post' | 'landing_page' | 'comparison' | 'guide' | 'case_study';
  competitorAnalysis: boolean;
  includeSchema: boolean;
  wordCount: number;
  cta: string;
  internalLinks: string[];
}

export interface GeneratedContent {
  title: string;
  slug: string;
  metaDescription: string;
  content: string;
  headingStructure: ContentHeading[];
  schema: Record<string, any>;
  seoScore: number;
  keywordDensity: number;
  readabilityScore: number;
  recommendations: string[];
  internalLinkSuggestions: string[];
  faqSection?: FAQ[];
}

export interface ContentHeading {
  level: number;
  text: string;
  id: string;
  keywordOptimized: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
  keywordOptimized: boolean;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  contentType: string;
  structure: TemplateSection[];
  seoGuidelines: string[];
  targetKeywords: string[];
}

export interface TemplateSection {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'cta' | 'faq';
  level?: number;
  content: string;
  seoNotes: string;
  required: boolean;
}

class ContentSEOGenerator {
  private templates: Map<string, ContentTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Generate SEO-optimized content based on configuration
   */
  async generateContent(config: ContentSEOConfig): Promise<GeneratedContent> {
    try {
      // Get content template
      const template = this.getTemplate(config.contentType);
      
      // Analyze competitor content if requested
      let competitorInsights: any = null;
      if (config.competitorAnalysis) {
        competitorInsights = await this.analyzeCompetitorContent(config.primaryKeyword);
      }

      // Generate optimized title
      const optimizedTitle = await this.generateOptimizedTitle(config);
      
      // Generate URL slug
      const slug = this.generateSlug(optimizedTitle);
      
      // Generate meta description
      const metaDescription = await this.generateMetaDescription(config, optimizedTitle);
      
      // Generate main content
      const content = await this.generateMainContent(config, template, competitorInsights);
      
      // Generate heading structure
      const headingStructure = this.extractHeadingStructure(content);
      
      // Generate FAQ section if applicable
      const faqSection = await this.generateFAQSection(config);
      
      // Generate schema markup
      const schema = config.includeSchema ? 
        await this.generateContentSchema(optimizedTitle, metaDescription, content, config) : {};
      
      // Calculate SEO metrics
      const seoMetrics = this.calculateSEOMetrics(content, config);
      
      // Generate recommendations
      const recommendations = this.generateSEORecommendations(content, config, seoMetrics);
      
      // Generate internal link suggestions
      const internalLinkSuggestions = await this.generateInternalLinkSuggestions(config);

      const generatedContent: GeneratedContent = {
        title: optimizedTitle,
        slug,
        metaDescription,
        content,
        headingStructure,
        schema,
        seoScore: seoMetrics.seoScore,
        keywordDensity: seoMetrics.keywordDensity,
        readabilityScore: seoMetrics.readabilityScore,
        recommendations,
        internalLinkSuggestions,
        faqSection
      };

      // Store generated content
      await this.storeGeneratedContent(generatedContent, config);

      return generatedContent;

    } catch (error: any) {
      console.error('Error generating content:', error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Generate comparison content for competitor alternatives
   */
  async generateComparisonContent(
    competitor: string,
    targetKeywords: string[]
  ): Promise<GeneratedContent> {
    const config: ContentSEOConfig = {
      title: `${competitor} Alternative: Why Contractors Choose BuildDesk`,
      primaryKeyword: `${competitor.toLowerCase()} alternative`,
      secondaryKeywords: [
        `${competitor.toLowerCase()} vs builddesk`,
        'construction management software comparison',
        'best construction software'
      ],
      targetAudience: 'contractors',
      contentType: 'comparison',
      competitorAnalysis: true,
      includeSchema: true,
      wordCount: 3500,
      cta: 'Start Free Trial',
      internalLinks: ['/pricing', '/features', '/case-studies']
    };

    return this.generateContent(config);
  }

  /**
   * Generate industry-specific landing pages
   */
  async generateIndustryContent(
    industry: string,
    primaryKeyword: string
  ): Promise<GeneratedContent> {
    const config: ContentSEOConfig = {
      title: `${industry} Software: Complete Management Solution`,
      primaryKeyword,
      secondaryKeywords: [
        `${industry.toLowerCase()} project management`,
        `${industry.toLowerCase()} scheduling software`,
        `${industry.toLowerCase()} job costing`
      ],
      targetAudience: 'contractors',
      contentType: 'landing_page',
      competitorAnalysis: false,
      includeSchema: true,
      wordCount: 2800,
      cta: 'Schedule Demo',
      internalLinks: ['/features', '/pricing', '/case-studies']
    };

    return this.generateContent(config);
  }

  /**
   * Generate educational guide content
   */
  async generateGuideContent(
    topic: string,
    targetKeywords: string[]
  ): Promise<GeneratedContent> {
    const config: ContentSEOConfig = {
      title: `Complete Guide to ${topic}`,
      primaryKeyword: targetKeywords[0],
      secondaryKeywords: targetKeywords.slice(1),
      targetAudience: 'project_managers',
      contentType: 'guide',
      competitorAnalysis: false,
      includeSchema: true,
      wordCount: 4000,
      cta: 'Download Free Template',
      internalLinks: ['/features', '/blog', '/resources']
    };

    return this.generateContent(config);
  }

  // Private helper methods
  private initializeTemplates(): void {
    // Comparison template
    const comparisonTemplate: ContentTemplate = {
      id: 'comparison',
      name: 'Competitor Comparison',
      description: 'Template for competitor alternative pages',
      contentType: 'comparison',
      structure: [
        {
          type: 'heading',
          level: 1,
          content: '[Competitor] Alternative: [Unique Value Proposition]',
          seoNotes: 'Include primary keyword and compelling benefit',
          required: true
        },
        {
          type: 'paragraph',
          content: 'Introduction paragraph with problem-solution narrative',
          seoNotes: 'Use primary keyword within first 100 words',
          required: true
        },
        {
          type: 'heading',
          level: 2,
          content: 'Why Contractors Switch from [Competitor] to BuildDesk',
          seoNotes: 'Address pain points and switching reasons',
          required: true
        },
        {
          type: 'table',
          content: 'Feature comparison table',
          seoNotes: 'Highlight competitive advantages',
          required: true
        },
        {
          type: 'heading',
          level: 2,
          content: 'Pricing Comparison: [Competitor] vs BuildDesk',
          seoNotes: 'Include pricing transparency and value proposition',
          required: true
        },
        {
          type: 'faq',
          content: 'Frequently asked questions about switching',
          seoNotes: 'Target long-tail keywords and address objections',
          required: false
        },
        {
          type: 'cta',
          content: 'Start free trial with migration assistance',
          seoNotes: 'Strong call-to-action with risk reduction',
          required: true
        }
      ],
      seoGuidelines: [
        'Use primary keyword in H1, meta title, and meta description',
        'Include competitor name 8-12 times throughout content',
        'Add customer testimonials from switchers',
        'Include pricing comparison table',
        'Address common objections and concerns',
        'Use schema markup for comparison tables'
      ],
      targetKeywords: ['[competitor] alternative', '[competitor] vs builddesk', 'best construction software']
    };

    // Landing page template
    const landingPageTemplate: ContentTemplate = {
      id: 'landing_page',
      name: 'Industry Landing Page',
      description: 'Template for industry-specific solution pages',
      contentType: 'landing_page',
      structure: [
        {
          type: 'heading',
          level: 1,
          content: '[Industry] Software: [Specific Benefits]',
          seoNotes: 'Include industry and software type in H1',
          required: true
        },
        {
          type: 'paragraph',
          content: 'Value proposition for specific industry',
          seoNotes: 'Address industry-specific pain points',
          required: true
        },
        {
          type: 'heading',
          level: 2,
          content: 'Features Built for [Industry] Professionals',
          seoNotes: 'Highlight industry-specific features',
          required: true
        },
        {
          type: 'list',
          content: 'Industry-specific feature list with benefits',
          seoNotes: 'Use industry terminology and workflows',
          required: true
        },
        {
          type: 'heading',
          level: 2,
          content: '[Industry] Case Studies and Success Stories',
          seoNotes: 'Social proof from similar businesses',
          required: true
        },
        {
          type: 'cta',
          content: 'Schedule industry-specific demo',
          seoNotes: 'Targeted call-to-action for industry',
          required: true
        }
      ],
      seoGuidelines: [
        'Use industry-specific terminology throughout',
        'Include local SEO elements if applicable',
        'Add industry-specific schema markup',
        'Include testimonials from industry professionals',
        'Address compliance and regulatory requirements',
        'Use industry-specific images and examples'
      ],
      targetKeywords: ['[industry] software', '[industry] management', '[industry] project management']
    };

    this.templates.set('comparison', comparisonTemplate);
    this.templates.set('landing_page', landingPageTemplate);
  }

  private getTemplate(contentType: string): ContentTemplate {
    const template = this.templates.get(contentType);
    if (!template) {
      throw new Error(`Template not found for content type: ${contentType}`);
    }
    return template;
  }

  private async generateOptimizedTitle(config: ContentSEOConfig): Promise<string> {
    let title = config.title;
    
    // Ensure primary keyword is included
    if (!title.toLowerCase().includes(config.primaryKeyword.toLowerCase())) {
      title = `${config.primaryKeyword} - ${title}`;
    }
    
    // Optimize for length (60 characters max)
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }
    
    return title;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  private async generateMetaDescription(config: ContentSEOConfig, title: string): Promise<string> {
    const templates: Record<string, string> = {
      'comparison': `Looking for a ${config.primaryKeyword}? BuildDesk offers better features, lower costs, and faster implementation. Compare features and pricing.`,
      'landing_page': `Professional ${config.primaryKeyword} designed for ${config.targetAudience}. Streamline projects, reduce costs, and improve efficiency.`,
      'guide': `Complete ${config.primaryKeyword} guide with best practices, templates, and expert insights. Download free resources and tools.`,
      'blog_post': `Learn about ${config.primaryKeyword} with expert insights, practical tips, and industry best practices from construction professionals.`
    };

    let description = templates[config.contentType] || `Professional ${config.primaryKeyword} solution for construction businesses.`;
    
    // Ensure it's under 160 characters
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }
    
    return description;
  }

  private async generateMainContent(
    config: ContentSEOConfig,
    template: ContentTemplate,
    competitorInsights?: any
  ): Promise<string> {
    let content = '';
    
    // Generate content based on template structure
    for (const section of template.structure) {
      switch (section.type) {
        case 'heading':
          content += this.generateHeading(section, config);
          break;
        case 'paragraph':
          content += this.generateParagraph(section, config);
          break;
        case 'list':
          content += this.generateList(section, config);
          break;
        case 'table':
          content += this.generateTable(section, config, competitorInsights);
          break;
        case 'cta':
          content += this.generateCTA(section, config);
          break;
        case 'faq':
          content += this.generateFAQContent(section, config);
          break;
      }
      content += '\n\n';
    }
    
    return content;
  }

  private generateHeading(section: TemplateSection, config: ContentSEOConfig): string {
    let heading = section.content;
    
    // Replace placeholders
    heading = heading.replace(/\[Competitor\]/g, this.extractCompetitorName(config.primaryKeyword));
    heading = heading.replace(/\[Industry\]/g, this.extractIndustryName(config.primaryKeyword));
    heading = heading.replace(/\[Unique Value Proposition\]/g, 'Better Features, Lower Cost');
    
    const hLevel = '#'.repeat(section.level || 2);
    return `${hLevel} ${heading}`;
  }

  private generateParagraph(section: TemplateSection, config: ContentSEOConfig): string {
    // Generate contextual paragraph content
    const templates: Record<string, string> = {
      'comparison': `If you're searching for a ${config.primaryKeyword}, you're likely facing the same challenges many construction professionals encounter: high costs, complex setup, and poor mobile experience. BuildDesk offers a modern alternative that addresses these pain points while providing the robust features you need to manage projects effectively.`,
      'landing_page': `${config.primaryKeyword} is essential for modern construction businesses looking to streamline operations and improve profitability. BuildDesk provides specialized tools designed specifically for ${config.targetAudience}, offering the features and functionality you need without unnecessary complexity.`
    };
    
    return templates[config.contentType] || `Professional ${config.primaryKeyword} solution with advanced features and intuitive design.`;
  }

  private generateList(section: TemplateSection, config: ContentSEOConfig): string {
    const features = [
      'Real-time project tracking and updates',
      'Mobile-first field management tools',
      'Integrated job costing and budgeting',
      'OSHA compliance and safety management',
      'QuickBooks integration for seamless accounting',
      'Document management and file sharing',
      'Team collaboration and communication tools',
      'Customizable reporting and analytics'
    ];
    
    return features.map(feature => `- ${feature}`).join('\n');
  }

  private generateTable(section: TemplateSection, config: ContentSEOConfig, insights?: any): string {
    if (config.contentType === 'comparison') {
      const competitor = this.extractCompetitorName(config.primaryKeyword);
      return `| Feature | ${competitor} | BuildDesk |
|---------|-----------|-----------|
| Monthly Cost | $300+ | $149 |
| Setup Time | 2-4 weeks | 1 day |
| Mobile App | Limited | Full-featured |
| Support | Email only | Phone + Chat |
| Free Trial | No | 14 days |`;
    }
    
    return '| Feature | Description | Benefit |\n|---------|-------------|---------|';
  }

  private generateCTA(section: TemplateSection, config: ContentSEOConfig): string {
    return `**Ready to get started?** [${config.cta}](/${config.cta.toLowerCase().replace(/\s+/g, '-')}) - No credit card required, setup in minutes.`;
  }

  private generateFAQContent(section: TemplateSection, config: ContentSEOConfig): string {
    return '## Frequently Asked Questions\n\n### How does the migration process work?\nOur team provides free migration assistance to help you transfer your data with minimal downtime.\n\n### Is training included?\nYes, we provide comprehensive training and onboarding support for all team members.';
  }

  private extractHeadingStructure(content: string): ContentHeading[] {
    const headings: ContentHeading[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        headings.push({
          level,
          text,
          id,
          keywordOptimized: false // Would analyze in real implementation
        });
      }
    });
    
    return headings;
  }

  private async generateFAQSection(config: ContentSEOConfig): Promise<FAQ[]> {
    const faqs: FAQ[] = [];
    
    if (config.contentType === 'comparison') {
      faqs.push(
        {
          question: `How does BuildDesk compare to ${this.extractCompetitorName(config.primaryKeyword)}?`,
          answer: 'BuildDesk offers similar functionality at 60% lower cost with better mobile experience and faster setup.',
          keywordOptimized: true
        },
        {
          question: 'Can I migrate my existing data?',
          answer: 'Yes, we provide free migration assistance to transfer your projects, contacts, and documents.',
          keywordOptimized: false
        }
      );
    }
    
    return faqs;
  }

  private async generateContentSchema(
    title: string,
    description: string,
    content: string,
    config: ContentSEOConfig
  ): Promise<Record<string, any>> {
    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      author: {
        '@type': 'Organization',
        name: 'BuildDesk'
      },
      publisher: {
        '@type': 'Organization',
        name: 'BuildDesk',
        logo: {
          '@type': 'ImageObject',
          url: 'https://build-desk.com/logo.png'
        }
      },
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      wordCount: content.split(/\s+/).length
    };

    // Add FAQ schema if FAQs are present
    const faqs = await this.generateFAQSection(config);
    if (faqs.length > 0) {
      baseSchema['@graph'] = [
        baseSchema,
        {
          '@type': 'FAQPage',
          mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer
            }
          }))
        }
      ];
    }

    return baseSchema;
  }

  private calculateSEOMetrics(content: string, config: ContentSEOConfig): {
    seoScore: number;
    keywordDensity: number;
    readabilityScore: number;
  } {
    const wordCount = content.split(/\s+/).length;
    const keywordCount = (content.toLowerCase().match(new RegExp(config.primaryKeyword.toLowerCase(), 'g')) || []).length;
    const keywordDensity = (keywordCount / wordCount) * 100;
    
    // Simple readability score (Flesch-Kincaid approximation)
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentences;
    const readabilityScore = Math.max(0, 206.835 - (1.015 * avgWordsPerSentence));
    
    // SEO score based on multiple factors
    let seoScore = 0;
    seoScore += keywordDensity >= 1 && keywordDensity <= 3 ? 25 : 0; // Keyword density
    seoScore += wordCount >= config.wordCount * 0.8 ? 25 : 0; // Word count
    seoScore += readabilityScore >= 60 ? 25 : 0; // Readability
    seoScore += content.includes(config.cta) ? 25 : 0; // CTA present
    
    return {
      seoScore,
      keywordDensity,
      readabilityScore
    };
  }

  private generateSEORecommendations(
    content: string,
    config: ContentSEOConfig,
    metrics: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (metrics.keywordDensity < 1) {
      recommendations.push(`Increase keyword density for "${config.primaryKeyword}" to 1-3%`);
    }
    if (metrics.keywordDensity > 3) {
      recommendations.push(`Reduce keyword density for "${config.primaryKeyword}" to avoid over-optimization`);
    }
    if (metrics.readabilityScore < 60) {
      recommendations.push('Improve readability by using shorter sentences and simpler words');
    }
    if (!content.includes('FAQ')) {
      recommendations.push('Add FAQ section to capture long-tail keywords');
    }
    if (config.internalLinks.length === 0) {
      recommendations.push('Add internal links to relevant pages');
    }
    
    return recommendations;
  }

  private async generateInternalLinkSuggestions(config: ContentSEOConfig): Promise<string[]> {
    const suggestions = [
      '/features',
      '/pricing',
      '/case-studies',
      '/blog',
      '/resources'
    ];
    
    // Add content-specific suggestions
    if (config.contentType === 'comparison') {
      suggestions.push('/migration-guide', '/free-trial');
    }
    
    return suggestions;
  }

  private async analyzeCompetitorContent(keyword: string): Promise<any> {
    // Mock competitor analysis
    return {
      averageWordCount: 3200,
      commonHeadings: ['Features', 'Pricing', 'Benefits', 'FAQ'],
      keywordDensity: 2.1,
      competitorStrengths: ['Detailed comparisons', 'Customer testimonials'],
      contentGaps: ['Mobile features', 'Implementation timeline']
    };
  }

  private extractCompetitorName(keyword: string): string {
    if (keyword.includes('procore')) return 'Procore';
    if (keyword.includes('buildertrend')) return 'Buildertrend';
    if (keyword.includes('plangrid')) return 'PlanGrid';
    return 'Competitor';
  }

  private extractIndustryName(keyword: string): string {
    if (keyword.includes('hvac')) return 'HVAC';
    if (keyword.includes('plumbing')) return 'Plumbing';
    if (keyword.includes('electrical')) return 'Electrical';
    return 'Construction';
  }

  private async storeGeneratedContent(content: GeneratedContent, config: ContentSEOConfig): Promise<void> {
    // TODO: Create generated_content table in database before enabling this
    /*
    await supabase
      .from('generated_content')
      .insert([{
        title: content.title,
        slug: content.slug,
        meta_description: content.metaDescription,
        content: content.content,
        primary_keyword: config.primaryKeyword,
        secondary_keywords: config.secondaryKeywords,
        content_type: config.contentType,
        seo_score: content.seoScore,
        keyword_density: content.keywordDensity,
        readability_score: content.readabilityScore,
        schema: content.schema,
        recommendations: content.recommendations,
        created_at: new Date().toISOString()
      }]);
    */
  }
}

// Export singleton instance
export const contentSeoGenerator = new ContentSEOGenerator();
export default contentSeoGenerator;
