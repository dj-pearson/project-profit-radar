# SEO Components Documentation

This directory contains powerful SEO components designed to improve BuildDesk's search engine rankings and visibility.

## 🎯 Overview

Our SEO strategy includes:
1. **Rich Schema.org Markup** - Helps achieve rich snippets in search results
2. **Interactive FAQ Components** - Captures "People also ask" queries
3. **Comprehensive Meta Tags** - Open Graph, Twitter Cards, canonical URLs
4. **Structured Data** - JSON-LD for enhanced search visibility

## 📦 New Components

### 1. SaaSProductSchema

Comprehensive Schema.org markup optimized for B2B SaaS products.

**SEO Benefits:**
- ✅ Rich snippets in Google search results
- ✅ Star ratings displayed in SERPs
- ✅ Pricing information visible in search
- ✅ Voice search optimization
- ✅ Product carousel eligibility
- ✅ Enhanced mobile search visibility

**Usage:**

```tsx
import { SaaSProductSchema, BuildDeskServiceSchema } from '@/components/seo/SaaSProductSchema';

function App() {
  return (
    <>
      {/* Add to your main layout or landing pages */}
      <SaaSProductSchema
        includeReviews={true}
        includeOffers={true}
        includeFeatures={true}
      />

      {/* Optional: Service-based schema for service pages */}
      <BuildDeskServiceSchema />
    </>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `includeReviews` | boolean | `true` | Include aggregate ratings |
| `includeOffers` | boolean | `true` | Include pricing and subscription details |
| `includeFeatures` | boolean | `true` | Include detailed feature list |
| `applicationCategory` | string | `'BusinessApplication'` | Schema.org category |
| `additionalProps` | object | `{}` | Additional schema properties |

**What's Included:**

- ✅ SoftwareApplication schema
- ✅ Subscription pricing with PriceSpecification
- ✅ Free trial offer details
- ✅ Aggregate ratings (4.8/5 stars, 247 reviews)
- ✅ Feature list (20+ features)
- ✅ Screenshot URLs
- ✅ Operating system compatibility
- ✅ Customer support contact info
- ✅ Accepted payment methods
- ✅ Service area (United States)

### 2. InteractiveFAQ

Beautiful, accessible FAQ component with automatic Schema.org FAQPage markup.

**SEO Benefits:**
- ✅ Appears in "People also ask" boxes
- ✅ Voice search optimization
- ✅ Long-tail keyword capture
- ✅ Increased time on page
- ✅ FAQ rich snippets
- ✅ Featured snippet eligibility

**Usage:**

```tsx
import { InteractiveFAQ, constructionSoftwareFAQs, pricingFAQs } from '@/components/seo/InteractiveFAQ';

// Use pre-built FAQ sets
function HomePage() {
  return (
    <InteractiveFAQ
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about BuildDesk"
      faqs={constructionSoftwareFAQs}
      theme="gradient"
      defaultExpanded={0}
      allowMultiple={false}
      showNumbers={true}
    />
  );
}

// Or create custom FAQs
function CustomPage() {
  const customFAQs = [
    {
      question: "How does BuildDesk compare to Procore?",
      answer: "BuildDesk is designed for small to medium contractors...",
      keywords: ["comparison", "Procore", "alternative"],
    },
    // ... more FAQs
  ];

  return (
    <InteractiveFAQ
      faqs={customFAQs}
      theme="bordered"
    />
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `faqs` | `FAQItem[]` | *required* | Array of FAQ items |
| `title` | string | `'Frequently Asked Questions'` | Section title |
| `subtitle` | string | `undefined` | Optional subtitle |
| `theme` | `'default' \| 'minimal' \| 'bordered' \| 'gradient'` | `'default'` | Visual theme |
| `defaultExpanded` | number \| `'all'` | `-1` | Which item(s) to expand initially |
| `allowMultiple` | boolean | `false` | Allow multiple items open |
| `showNumbers` | boolean | `false` | Show question numbers |
| `includeSchema` | boolean | `true` | Include FAQPage schema |
| `schemaPageName` | string | `undefined` | Name for FAQPage schema |
| `className` | string | `undefined` | Custom CSS class |

**FAQItem Interface:**

```tsx
interface FAQItem {
  question: string;        // The question text
  answer: string;          // Answer (supports HTML)
  category?: string;       // Optional category for grouping
  keywords?: string[];     // Optional keywords for SEO
}
```

**Pre-built FAQ Sets:**

We provide pre-built, SEO-optimized FAQ sets:

1. **`constructionSoftwareFAQs`** - General product questions (8 FAQs)
   - What is construction management software?
   - Pricing and cost
   - Mobile compatibility
   - QuickBooks integration
   - Suitability for small contractors
   - Customer support
   - OSHA compliance
   - Free trial details

2. **`pricingFAQs`** - Pricing-specific questions (4 FAQs)
   - Per-user fees
   - Hidden costs
   - Annual billing discounts
   - Post-trial process

**Themes:**

- **`default`**: Clean white cards with gray background
- **`minimal`**: Transparent background, minimal styling
- **`bordered`**: Border-based design
- **`gradient`**: Modern gradient background with blur effects

## 🚀 Quick Start

### Add to Landing Page

```tsx
import { PageSEO } from '@/components/seo/PageSEO';
import { SaaSProductSchema } from '@/components/seo/SaaSProductSchema';
import { InteractiveFAQ, constructionSoftwareFAQs } from '@/components/seo/InteractiveFAQ';

export default function LandingPage() {
  return (
    <>
      {/* Meta Tags */}
      <PageSEO
        title="BuildDesk - Construction Management Software for Small Contractors"
        description="Affordable construction management software with real-time job costing, scheduling, and mobile apps. 50% less than Procore. Try free for 14 days."
        keywords={[
          'construction management software',
          'job costing software',
          'contractor software',
          'construction scheduling',
        ]}
      />

      {/* Rich Product Schema */}
      <SaaSProductSchema />

      {/* Page Content */}
      <main>
        <h1>Construction Management Made Simple</h1>
        {/* ... your content ... */}

        {/* FAQ Section */}
        <section className="py-16">
          <InteractiveFAQ
            faqs={constructionSoftwareFAQs}
            theme="gradient"
            defaultExpanded={0}
          />
        </section>
      </main>
    </>
  );
}
```

### Add to Pricing Page

```tsx
import { PageSEO } from '@/components/seo/PageSEO';
import { SaaSProductSchema } from '@/components/seo/SaaSProductSchema';
import { InteractiveFAQ, pricingFAQs } from '@/components/seo/InteractiveFAQ';

export default function PricingPage() {
  return (
    <>
      <PageSEO
        title="BuildDesk Pricing - $350/month Unlimited Users"
        description="Simple, transparent pricing for construction contractors. $350/month includes unlimited users, all features, mobile apps, and support. 14-day free trial."
        keywords={['construction software pricing', 'contractor software cost']}
      />

      <SaaSProductSchema
        includeReviews={true}
        includeOffers={true}
      />

      <main>
        {/* ... pricing content ... */}

        <InteractiveFAQ
          title="Pricing Questions"
          faqs={pricingFAQs}
          theme="bordered"
        />
      </main>
    </>
  );
}
```

## 📊 Expected SEO Impact

### Rich Snippets
With proper implementation, you can expect:
- ⭐ Star ratings in search results
- 💰 Pricing information in SERPs
- 📱 "Available on iOS & Android" badges
- ❓ FAQ expandable results
- 🎯 Enhanced knowledge panel

### Search Rankings
These components help with:
- **Voice Search**: FAQ schema optimizes for voice queries
- **Long-tail Keywords**: FAQ captures specific questions
- **Featured Snippets**: How-to and FAQ schemas improve eligibility
- **Local SEO**: Service schema helps with local searches
- **Mobile Rankings**: Proper mobile schema improves mobile search

### Metrics to Monitor
After implementation, track:
- 📈 Click-through rate (CTR) from search results
- 🎯 Rankings for target keywords
- 💬 "People also ask" appearances
- ⭐ Rich snippet impressions
- 📱 Mobile search performance

## 🔧 Validation

### Test Your Schema

1. **Google Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Paste your page URL
   - Verify schema is detected

2. **Schema.org Validator**
   - URL: https://validator.schema.org/
   - Check for errors and warnings

3. **Google Search Console**
   - Monitor "Enhancements" section
   - Check for "Product" and "FAQ" rich results
   - Track impressions and clicks

### Common Issues

**Schema Not Showing:**
- Wait 1-2 weeks for Google to recrawl
- Check Google Search Console for errors
- Ensure schema is in `<head>` or early in `<body>`

**Multiple Schemas Conflict:**
- Don't duplicate Organization schema
- Use one FAQPage schema per page
- Nest related schemas properly

## 📝 Best Practices

### FAQ Best Practices

1. **Question Format**
   - Use natural language
   - Start with question words (What, How, Why, When)
   - Keep questions concise (under 100 characters)

2. **Answer Format**
   - Be comprehensive but concise (100-300 words)
   - Answer the question in first sentence
   - Include relevant keywords naturally
   - Use HTML for formatting (lists, bold, links)

3. **Schema Optimization**
   - Limit to 10-15 FAQs per page
   - Most important FAQs first
   - Update regularly to keep content fresh

### Schema Best Practices

1. **Keep It Accurate**
   - Update pricing when it changes
   - Keep reviews/ratings current
   - Maintain accurate feature lists

2. **Don't Over-optimize**
   - No keyword stuffing in schema
   - Be truthful about ratings
   - Don't exaggerate features

3. **Monitor Performance**
   - Track rich snippet impressions
   - Monitor Google Search Console
   - A/B test different FAQ sets

## 🔗 Related Components

- **`PageSEO`**: Comprehensive meta tags and basic schema
- **`EnhancedSchemaMarkup`**: Additional schema types
- **`AggregateRatingSchema`**: Customer reviews schema
- **`HowToSchema`**: Step-by-step guides
- **`LocalSEOSchema`**: Local business optimization

## 📚 Resources

- [Google Search Central - Structured Data](https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data)
- [Schema.org Documentation](https://schema.org/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [FAQ Schema Guidelines](https://developers.google.com/search/docs/advanced/structured-data/faqpage)
- [Product Schema Guidelines](https://developers.google.com/search/docs/advanced/structured-data/product)

## 🤝 Contributing

When adding new FAQ sets or improving schema:

1. Test in Google Rich Results Test
2. Verify no schema errors
3. Ensure mobile-friendly
4. Follow accessibility guidelines
5. Update this documentation

---

**Last Updated**: 2025-12-25
**Components Version**: 1.0
**Tested With**: React 19.1, TypeScript 5.9

For questions or issues, contact the development team or consult the main CLAUDE.md documentation.
