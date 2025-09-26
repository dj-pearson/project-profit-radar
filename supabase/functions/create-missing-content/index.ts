import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const blogPosts = [
      {
        title: "Construction CRM Implementation Guide",
        slug: "construction-crm-implementation-guide",
        excerpt: "Complete guide to implementing a CRM system in your construction business. Learn best practices, common pitfalls, and step-by-step implementation strategies.",
        body: `# Construction CRM Implementation Guide

Implementing a Customer Relationship Management (CRM) system in your construction business can transform how you manage leads, track projects, and grow your revenue. This comprehensive guide walks you through the entire process.

## Why Construction Companies Need CRM

Construction businesses face unique challenges in managing customer relationships:

- Long sales cycles with multiple stakeholders
- Complex project requirements and specifications
- Need for detailed follow-up and communication
- Managing both residential and commercial clients

## Step 1: Define Your CRM Requirements

Before selecting a CRM system, identify your specific needs:

### Lead Management
- Where do your leads come from?
- How do you currently track prospects?
- What information do you need to capture?

### Project Tracking
- How do you move from lead to signed contract?
- What stages does your sales process include?
- How do you track project progress?

### Communication Needs
- How do you communicate with clients?
- What documents need to be shared?
- How do you handle change orders and updates?

## Step 2: Choose the Right CRM Platform

Consider these factors when selecting a CRM:

### Industry-Specific Features
- Construction project management integration
- Job costing and estimating capabilities
- Document management for contracts and plans
- Mobile accessibility for field teams

### Integration Capabilities
- QuickBooks or accounting software integration
- Email marketing platform connections
- Calendar and scheduling system sync
- File storage and document management

### Scalability
- Can it grow with your business?
- Does it support multiple users and locations?
- Are there usage limits that might affect you?

## Step 3: Data Migration and Setup

### Clean Your Existing Data
Before importing data:
- Remove duplicate contacts
- Standardize naming conventions
- Verify contact information accuracy
- Organize documents and files

### Import Process
1. Start with a small subset of data
2. Test the import process
3. Verify data accuracy
4. Complete the full migration
5. Set up backup procedures

## Step 4: Team Training and Adoption

### Training Strategy
- Start with power users and champions
- Provide hands-on training sessions
- Create process documentation
- Set up regular check-ins

### Adoption Best Practices
- Make CRM usage mandatory for specific processes
- Integrate CRM into daily workflows
- Provide ongoing support and training
- Celebrate early wins and success stories

## Step 5: Optimize and Improve

### Monitor Usage
- Track user adoption rates
- Identify bottlenecks in processes
- Gather feedback from team members
- Monitor data quality and accuracy

### Continuous Improvement
- Regular system updates and maintenance
- Process refinement based on usage data
- Additional training as needed
- Integration with new tools and systems

## Common Implementation Challenges

### Resistance to Change
- Address concerns early and directly
- Show clear benefits and ROI
- Provide adequate training and support
- Lead by example from management

### Data Quality Issues
- Establish data entry standards
- Regular data cleaning and maintenance
- Automated validation where possible
- Clear ownership of data quality

### Integration Problems
- Test integrations thoroughly before going live
- Have backup processes in place
- Work with vendors to resolve issues quickly
- Document integration processes

## Measuring Success

Track these key metrics to measure CRM success:

- Lead conversion rates
- Sales cycle length
- Customer satisfaction scores
- Team productivity metrics
- Revenue growth

## Conclusion

A well-implemented CRM system can significantly improve your construction business operations. Take time to plan properly, train your team thoroughly, and continuously optimize your processes for maximum benefit.

Ready to implement a CRM system designed specifically for construction? BuildDesk offers integrated CRM functionality built into our construction management platform, making implementation seamless and adoption natural.`,
        seo_title: "Construction CRM Implementation Guide - Step-by-Step Setup",
        seo_description: "Complete guide to implementing CRM in construction businesses. Best practices, common pitfalls, and step-by-step implementation strategies for contractors.",
        status: "published",
        published_at: new Date().toISOString()
      },
      {
        title: "Construction ROI Calculator Guide",
        slug: "construction-roi-calculator-guide", 
        excerpt: "Learn how to calculate return on investment for construction software, equipment, and process improvements. Includes free ROI calculator and templates.",
        body: `# Construction ROI Calculator Guide

Understanding return on investment (ROI) is crucial for making smart business decisions in construction. This guide shows you how to calculate ROI for software investments, equipment purchases, and process improvements.

## What is ROI in Construction?

ROI measures the financial benefit of an investment relative to its cost. In construction, ROI helps you:

- Justify software and equipment purchases
- Compare different investment options
- Measure the success of process improvements
- Make data-driven business decisions

## Basic ROI Formula

**ROI = (Gain from Investment - Cost of Investment) / Cost of Investment × 100**

### Example Calculation
If you invest $10,000 in construction software and save $15,000 in the first year:
- ROI = ($15,000 - $10,000) / $10,000 × 100 = 50%

## Construction Software ROI Factors

### Cost Savings
- Reduced administrative time
- Fewer project delays
- Decreased rework and errors
- Lower insurance premiums
- Reduced fuel and travel costs

### Revenue Improvements
- Faster project completion
- Ability to take on more projects
- Better customer satisfaction and referrals
- Improved bidding accuracy

### Time Savings
- Automated reporting and documentation
- Streamlined communication
- Faster invoicing and payments
- Reduced manual data entry

## Equipment ROI Calculation

### Direct Costs
- Purchase price or lease payments
- Maintenance and repair costs
- Fuel and operating expenses
- Insurance and registration

### Benefits
- Increased productivity
- Reduced labor costs
- Ability to take on larger projects
- Competitive advantage

### Payback Period
Calculate how long it takes to recover your investment:
**Payback Period = Initial Investment / Annual Cash Flow**

## Process Improvement ROI

### Identify Baseline Metrics
- Current project completion times
- Error rates and rework costs
- Administrative overhead
- Customer satisfaction scores

### Measure Improvements
- Faster project delivery
- Reduced errors and rework
- Lower administrative costs
- Improved customer retention

### Calculate Value
Quantify improvements in dollar terms:
- Time savings × hourly rate
- Reduced rework × average rework cost
- Retained customers × average customer value

## Industry Benchmarks

### Typical Construction Software ROI
- Project management software: 200-400% first year
- Job costing software: 150-300% first year
- Mobile field apps: 100-250% first year
- Safety compliance tools: 75-200% first year

### Payback Periods
- Construction software: 3-9 months
- Equipment purchases: 1-3 years
- Process improvements: 6-18 months

## ROI Calculator Template

Use this template to calculate ROI for any construction investment:

### Step 1: Identify Costs
- Initial purchase/implementation cost
- Ongoing monthly/annual costs
- Training and setup time
- Any additional equipment or resources needed

### Step 2: Quantify Benefits
- Time savings (hours × hourly rate)
- Cost reductions (materials, rework, delays)
- Revenue increases (more projects, faster completion)
- Risk mitigation (insurance, penalties, liability)

### Step 3: Calculate ROI
- Total first-year benefits
- Minus total first-year costs
- Divided by total investment
- Multiply by 100 for percentage

## Common ROI Mistakes to Avoid

### Underestimating Implementation Time
- Factor in training time
- Account for learning curve
- Include setup and configuration time

### Overestimating Benefits
- Use conservative estimates
- Base calculations on verified data
- Account for adoption challenges

### Ignoring Ongoing Costs
- Include subscription fees
- Factor in maintenance costs
- Account for upgrade expenses

## Maximizing Your ROI

### Proper Implementation
- Invest in adequate training
- Ensure proper setup and configuration
- Get buy-in from all team members

### Regular Review
- Track actual vs. projected benefits
- Adjust processes as needed
- Identify additional optimization opportunities

### Continuous Improvement
- Regular software updates
- Process refinement
- Additional feature adoption

## BuildDesk ROI Calculator

Ready to calculate your potential ROI with BuildDesk? Our interactive ROI calculator helps you:

- Estimate time and cost savings
- Project revenue improvements
- Calculate payback period
- Compare investment options

[Use our free ROI calculator](/roi-calculator) to see your potential returns.

## Conclusion

Calculating ROI helps you make informed decisions about construction investments. Whether you're considering new software, equipment, or process improvements, proper ROI analysis ensures you invest wisely and maximize returns.

Remember that ROI isn't just about immediate financial returns - consider long-term benefits like improved customer satisfaction, better safety records, and competitive advantages that may not be immediately quantifiable but add significant value to your business.`,
        seo_title: "Construction ROI Calculator Guide - Measure Software & Equipment Returns",
        seo_description: "Learn to calculate ROI for construction investments. Includes templates, industry benchmarks, and free ROI calculator for software and equipment purchases.",
        status: "published",
        published_at: new Date().toISOString()
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const post of blogPosts) {
      // Check if post already exists
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', post.slug)
        .maybeSingle();
      
      if (existing) {
        console.log(`Post ${post.slug} already exists, skipping...`);
        skipped++;
        continue;
      }
      
      // Create the blog post
      const { data, error } = await supabase
        .from('blog_posts')
        .insert([post])
        .select();
      
      if (error) {
        console.error(`Error creating post ${post.slug}:`, error);
        throw error;
      } else {
        console.log(`Successfully created post: ${post.title}`);
        created++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Content creation complete! Created: ${created}, Skipped: ${skipped}`,
        created,
        skipped 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating missing content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});