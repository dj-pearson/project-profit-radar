/** JSON-LD for the job costing comparison article (Article + FAQPage). */
export const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "7 Best Construction Job Costing Software Tools Compared (2025)",
  "description": "Compare the top 7 job costing software tools for contractors. Real pricing, features, pros & cons to help you choose the right solution for your construction business.",
  "author": {
    "@type": "Organization",
    "name": "Brikly",
    "url": "https://brikly.net"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Brikly",
    "logo": {
      "@type": "ImageObject",
      "url": "https://brikly.net/BriklyLogo.png"
    }
  },
  "datePublished": "2025-01-14",
  "dateModified": "2025-01-14",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://brikly.net/resources/job-costing-software-comparison"
  },
  "keywords": "construction job costing software, job costing comparison, construction cost tracking, real-time job costing, contractor software",
  "articleSection": "Construction Technology",
  "wordCount": 3800
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the best job costing software for small contractors?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Brikly is the best value for small contractors, offering unlimited users and real-time job costing at $350/month. For contractors needing basic features on a tight budget, Buildertrend ($299/month) or CoConstruct ($399/month) are solid alternatives."
      }
    },
    {
      "@type": "Question",
      "name": "What's the difference between real-time and delayed job costing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Real-time job costing updates costs as they're entered (instantly showing current project profitability). Delayed job costing requires manual syncing or waiting until the next accounting period close. Real-time systems help you catch budget overruns while there's still time to fix them."
      }
    },
    {
      "@type": "Question",
      "name": "Do I need job costing software if I use QuickBooks?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. QuickBooks tracks costs after the fact (historical accounting). Job costing software tracks costs in real-time as they happen, allowing you to make decisions while projects are active. Most modern job costing tools sync with QuickBooks automatically."
      }
    },
    {
      "@type": "Question",
      "name": "What should I look for in job costing software?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Key features include: 1) Real-time cost tracking, 2) Budget vs actual reporting, 3) Mobile time tracking, 4) QuickBooks integration, 5) Change order management, 6) Unlimited users (not per-seat pricing), 7) Easy-to-read dashboards showing current profitability."
      }
    },
    {
      "@type": "Question",
      "name": "How much does job costing software cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Pricing ranges from $299/month (Buildertrend, limited users) to $1,500+/month (Procore enterprise). Most small contractor solutions cost $300-500/month. Watch for per-user fees that add up quickly - Brikly offers unlimited users at $350/month flat rate."
      }
    }
  ]
};
