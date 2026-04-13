# BuildDesk Programmatic SEO — Full System Specification

**Version:** 1.0  
**Platform:** BuildDesk — Construction Financial Intelligence SaaS  
**Target Market:** SMB Contractors, $1M–$20M revenue, 5–50 employees  
**Estimated Total Pages at Full Build-out:** 1,400–1,800 pages  

---

## PHASE 1: TAXONOMY

### Dimension 1: Contractor Type

| ID | Display Name | URL Slug | Description |
|----|-------------|----------|-------------|
| `gc` | General Contractor | `general-contractor` | Full-service residential and commercial GCs managing subs and self-perform work |
| `electrical` | Electrical Contractor | `electrical-contractor` | Licensed electrical companies running service, commercial, and residential projects |
| `plumbing` | Plumbing Contractor | `plumbing-contractor` | Plumbing companies from service calls to large commercial rough-ins |
| `hvac` | HVAC Contractor | `hvac-contractor` | Heating/cooling installation and service companies |
| `roofing` | Roofing Contractor | `roofing-contractor` | Residential and commercial roofing companies |
| `commercial` | Commercial Contractor | `commercial-contractor` | Office, retail, and industrial construction specialists |
| `residential` | Residential Builder | `residential-builder` | Custom home builders and residential remodelers |
| `concrete` | Concrete Contractor | `concrete-contractor` | Flatwork, structural, decorative concrete companies |
| `framing` | Framing Contractor | `framing-contractor` | Wood and steel framing subcontractors |
| `specialty` | Specialty Subcontractor | `specialty-subcontractor` | Painting, drywall, flooring, and other specialty trades |

#### Contractor Type Context Objects

```json
{
  "gc": {
    "id": "gc",
    "display_name": "General Contractor",
    "typical_project_count": "8–25 active projects",
    "typical_crew_size": "10–50 employees plus subs",
    "primary_billing_method": "AIA progress billing, fixed-price contracts",
    "biggest_financial_pain": "Managing cash flow across multiple subcontractors and retainage",
    "key_software_needs": ["job costing", "sub payment tracking", "change orders", "lien waivers"],
    "competitor_context": "Most use Procore or spreadsheets at this size",
    "avg_project_value": "$250K–$5M"
  },
  "electrical": {
    "id": "electrical",
    "display_name": "Electrical Contractor",
    "typical_project_count": "15–40 active projects",
    "typical_crew_size": "5–30 field employees",
    "primary_billing_method": "T&M, fixed-price, unit-price",
    "biggest_financial_pain": "Tracking labor costs per job versus estimate; material cost overruns",
    "key_software_needs": ["labor cost tracking", "material tracking", "invoicing", "QuickBooks sync"],
    "competitor_context": "Often use Jobber or ServiceTitan for service work, nothing for project work",
    "avg_project_value": "$15K–$500K"
  },
  "plumbing": {
    "id": "plumbing",
    "display_name": "Plumbing Contractor",
    "typical_project_count": "10–30 active projects",
    "typical_crew_size": "4–20 field employees",
    "primary_billing_method": "T&M, fixed-price",
    "biggest_financial_pain": "Service vs. project billing in the same system; material markup tracking",
    "key_software_needs": ["job costing", "material tracking", "invoicing", "service scheduling"],
    "competitor_context": "ServiceTitan for service, spreadsheets for projects",
    "avg_project_value": "$5K–$200K"
  },
  "hvac": {
    "id": "hvac",
    "display_name": "HVAC Contractor",
    "typical_project_count": "20–60 active jobs",
    "typical_crew_size": "5–25 field technicians",
    "primary_billing_method": "Service contracts, T&M, fixed-price installs",
    "biggest_financial_pain": "Separating service contract profitability from installation profitability",
    "key_software_needs": ["service contract tracking", "tech time tracking", "job costing", "invoicing"],
    "competitor_context": "ServiceTitan dominant; expensive per-seat pricing is a pain point",
    "avg_project_value": "$8K–$150K"
  },
  "roofing": {
    "id": "roofing",
    "display_name": "Roofing Contractor",
    "typical_project_count": "10–35 active projects",
    "typical_crew_size": "5–30 field workers",
    "primary_billing_method": "Fixed-price, insurance claims",
    "biggest_financial_pain": "Insurance claim tracking, material waste, crew productivity per square",
    "key_software_needs": ["estimate-to-actual", "material tracking", "photo documentation", "invoicing"],
    "competitor_context": "AccuLynx, RoofSnap; neither has strong financial management",
    "avg_project_value": "$8K–$120K"
  },
  "commercial": {
    "id": "commercial",
    "display_name": "Commercial Contractor",
    "typical_project_count": "3–12 active projects",
    "typical_crew_size": "15–50 employees",
    "primary_billing_method": "AIA G702/G703, GMP, fixed-price",
    "biggest_financial_pain": "Retainage management, pay-app preparation, lien waiver coordination",
    "key_software_needs": ["AIA billing", "retainage tracking", "sub payment management", "job costing"],
    "competitor_context": "Procore at enterprise level; nothing good for SMB",
    "avg_project_value": "$500K–$10M"
  },
  "residential": {
    "id": "residential",
    "display_name": "Residential Builder",
    "typical_project_count": "5–20 active builds",
    "typical_crew_size": "5–20 employees",
    "primary_billing_method": "Draw schedules, cost-plus, fixed-price",
    "biggest_financial_pain": "Managing client draw requests vs. actual completion; allowance tracking",
    "key_software_needs": ["draw management", "allowance tracking", "client portal", "job costing"],
    "competitor_context": "Buildertrend, CoConstruct; good project tools but weak financials",
    "avg_project_value": "$200K–$2M"
  },
  "concrete": {
    "id": "concrete",
    "display_name": "Concrete Contractor",
    "typical_project_count": "8–25 active jobs",
    "typical_crew_size": "5–25 field workers",
    "primary_billing_method": "Unit-price, fixed-price",
    "biggest_financial_pain": "Material cost volatility, pour productivity vs. estimate",
    "key_software_needs": ["unit cost tracking", "crew productivity", "material cost management"],
    "competitor_context": "Spreadsheets dominate; minimal software adoption",
    "avg_project_value": "$20K–$500K"
  },
  "framing": {
    "id": "framing",
    "display_name": "Framing Contractor",
    "typical_project_count": "5–15 active jobs",
    "typical_crew_size": "8–30 field workers",
    "primary_billing_method": "Unit-price per square foot, fixed-price",
    "biggest_financial_pain": "Crew labor cost vs. unit-price contracts; lumber cost tracking",
    "key_software_needs": ["crew time tracking", "cost-per-unit reporting", "invoicing"],
    "competitor_context": "Almost entirely spreadsheets",
    "avg_project_value": "$30K–$400K"
  },
  "specialty": {
    "id": "specialty",
    "display_name": "Specialty Subcontractor",
    "typical_project_count": "10–30 active jobs",
    "typical_crew_size": "3–20 field workers",
    "primary_billing_method": "Fixed-price, unit-price",
    "biggest_financial_pain": "Multiple concurrent small jobs; knowing which jobs are profitable",
    "key_software_needs": ["multi-job cost tracking", "invoicing", "time tracking"],
    "competitor_context": "Jobber for small; nothing for mid-size",
    "avg_project_value": "$5K–$100K"
  }
}
```

---

### Dimension 2: Pain Point / Intent

| ID | Display Name | URL Slug | Search Intent |
|----|-------------|----------|---------------|
| `job-costing` | Job Costing | `job-costing-software` | Tracking actual vs estimated costs per project |
| `cash-flow` | Cash Flow Management | `cash-flow-management` | Understanding and forecasting when money comes in/out |
| `project-budgeting` | Project Budgeting | `project-budgeting` | Building and managing project budgets before and during work |
| `time-tracking` | Time Tracking & Payroll | `time-tracking` | Recording field labor hours tied to specific jobs |
| `invoicing` | Invoicing & Billing | `invoicing-software` | Creating and sending professional invoices tied to job progress |
| `change-orders` | Change Order Management | `change-order-management` | Tracking and billing approved scope changes |
| `financial-reporting` | Financial Reporting | `financial-reporting` | P&L by project, balance sheet, cash position at a glance |
| `quickbooks` | QuickBooks Integration | `quickbooks-integration` | Syncing field job data with QuickBooks accounting |
| `crew-management` | Crew & Payroll Management | `crew-management` | Scheduling crews, tracking hours, managing certifications |
| `client-portal` | Client Communication | `client-portal` | Giving clients visibility into project progress and financials |

#### Pain Point Context Objects

```json
{
  "job-costing": {
    "id": "job-costing",
    "display_name": "Job Costing",
    "core_pain": "Contractors discover a job was unprofitable only after it's done — too late to fix anything",
    "ideal_outcome": "Know in real-time whether each job is on budget before costs spiral",
    "key_metric": "Labor and material actual vs. estimated by cost code, updated daily",
    "user_persona": "Owner, project manager, or estimator who does post-mortems",
    "search_intent_stage": "solution-aware",
    "competing_solutions": ["Spreadsheets", "QuickBooks job tracking", "Procore financials"],
    "builddesk_advantage": "Real-time job costing visible to field and office without manual data entry"
  },
  "cash-flow": {
    "id": "cash-flow",
    "display_name": "Cash Flow Management",
    "core_pain": "Profitable jobs on paper don't pay the bills — timing gaps between billing and payment create crises",
    "ideal_outcome": "14–90 day cash flow forecast showing exactly when money arrives and bills are due",
    "key_metric": "Days Sales Outstanding (DSO) and projected cash balance by week",
    "user_persona": "Business owner or CFO watching the bank account",
    "search_intent_stage": "problem-aware",
    "competing_solutions": ["QuickBooks cash flow report", "Excel spreadsheets", "gut feel"],
    "builddesk_advantage": "Automated cash flow forecast tied to actual job billing schedules and AP"
  },
  "project-budgeting": {
    "id": "project-budgeting",
    "display_name": "Project Budgeting",
    "core_pain": "Estimates exist in one place, actuals in another — no one can see the gap until it's too late",
    "ideal_outcome": "Single source of truth where estimate becomes the budget and actuals update automatically",
    "key_metric": "Budget variance by cost code in real-time",
    "user_persona": "Estimator and project manager working together",
    "search_intent_stage": "solution-aware",
    "competing_solutions": ["Excel", "Buildertrend budget module", "QuickBooks"],
    "builddesk_advantage": "Estimate-to-budget workflow with live actual cost overlay"
  },
  "time-tracking": {
    "id": "time-tracking",
    "display_name": "Field Time Tracking",
    "core_pain": "Paper timesheets or text messages result in inaccurate job cost labor allocations",
    "ideal_outcome": "Field crew clocks in/out per job from their phone; hours flow into job costing automatically",
    "key_metric": "Labor hours and cost per job by day, coded to cost codes",
    "user_persona": "Field supervisor, foreman, office admin processing payroll",
    "search_intent_stage": "solution-aware",
    "competing_solutions": ["TSheets/QuickBooks Time", "ClockShark", "paper timesheets"],
    "builddesk_advantage": "Time entries tied directly to job costing — no re-entry or manual allocation"
  },
  "invoicing": {
    "id": "invoicing",
    "display_name": "Construction Invoicing",
    "core_pain": "Invoices sent late or missing billable items because tracking is disconnected from job progress",
    "ideal_outcome": "Invoices generated from actual job progress, approved change orders, and stored items automatically",
    "key_metric": "Invoice cycle time (days from work completion to invoice sent)",
    "user_persona": "Office manager or owner managing receivables",
    "search_intent_stage": "solution-aware",
    "competing_solutions": ["QuickBooks invoicing", "Excel templates", "FreshBooks"],
    "builddesk_advantage": "Progress-based invoicing tied to job milestones and approved change orders"
  },
  "change-orders": {
    "id": "change-orders",
    "display_name": "Change Order Management",
    "core_pain": "Verbal approvals and emailed requests fall through the cracks — lost revenue on every project",
    "ideal_outcome": "Digital change order workflow from request → approval → billing with full audit trail",
    "key_metric": "Change order approval rate and average time-to-approval",
    "user_persona": "Project manager and owner tracking scope creep",
    "search_intent_stage": "solution-aware",
    "competing_solutions": ["Email threads", "Procore change orders", "paper forms"],
    "builddesk_advantage": "Change order workflow that auto-updates budget and triggers invoice creation"
  },
  "financial-reporting": {
    "id": "financial-reporting",
    "display_name": "Construction Financial Reporting",
    "core_pain": "No single view of company financial health — profitability lives in QuickBooks, project data lives elsewhere",
    "ideal_outcome": "Real-time dashboard showing P&L by project, WIP report, and cash position in one place",
    "key_metric": "Time to close books each month; accuracy of WIP report",
    "user_persona": "Owner and accountant/bookkeeper",
    "search_intent_stage": "solution-aware",
    "competing_solutions": ["QuickBooks reports", "Excel WIP spreadsheets", "Sage"],
    "builddesk_advantage": "Construction-specific reports (WIP, over/under billing, job margin) built in"
  },
  "quickbooks": {
    "id": "quickbooks",
    "display_name": "QuickBooks Integration",
    "core_pain": "Double entry between project management tool and QuickBooks wastes hours and creates errors",
    "ideal_outcome": "Two-way sync so project data, costs, and invoices flow automatically into QuickBooks",
    "key_metric": "Hours per week saved on bookkeeping data entry",
    "user_persona": "Owner, office manager, or bookkeeper handling accounting",
    "search_intent_stage": "product-aware (already using QuickBooks)",
    "competing_solutions": ["Manual CSV export/import", "Buildertrend QB sync", "Procore QB connector"],
    "builddesk_advantage": "Native 2-way QuickBooks Online sync with automatic transaction routing"
  },
  "crew-management": {
    "id": "crew-management",
    "display_name": "Crew & Workforce Management",
    "core_pain": "Scheduling crews across multiple jobs by phone and text; no visibility into who is where",
    "ideal_outcome": "Digital crew schedule with GPS clock-in verification, linked to job cost allocation",
    "key_metric": "Crew utilization rate and labor cost variance by project",
    "user_persona": "Field supervisor, dispatcher, project manager",
    "search_intent_stage": "solution-aware",
    "competing_solutions": ["Crew Boss", "Rhumbix", "Google Sheets schedules"],
    "builddesk_advantage": "Crew scheduling tied to project timelines and automatic labor cost posting"
  },
  "client-portal": {
    "id": "client-portal",
    "display_name": "Client Communication Portal",
    "core_pain": "Clients call constantly for updates; sharing financials requires exporting spreadsheets",
    "ideal_outcome": "Clients log in to see project progress, approve change orders, and review invoices online",
    "key_metric": "Client response time on approvals; reduction in status call volume",
    "user_persona": "Project manager tired of status calls; owner wanting to look professional",
    "search_intent_stage": "solution-aware",
    "competing_solutions": ["Buildertrend client portal", "email updates", "CoConstruct"],
    "builddesk_advantage": "Real-time client portal with change order approval and invoice payment"
  }
}
```

---

### Dimension 3: Business Size

| ID | Display Name | URL Slug | Revenue | Employees |
|----|-------------|----------|---------|-----------|
| `small` | Small Contractor | `small-contractor` | Under $1M | 1–10 |
| `growing` | Growing Contractor | `growing-contractor` | $1M–$5M | 10–30 |
| `mid-size` | Mid-Size Contractor | `mid-size-contractor` | $5M–$20M | 30–50 |

#### Size Context Objects

```json
{
  "small": {
    "id": "small",
    "revenue_range": "Under $1M",
    "employee_range": "1–10",
    "software_maturity": "QuickBooks + spreadsheets, maybe Jobber",
    "price_sensitivity": "Very high — every dollar counts",
    "decision_maker": "Owner (wears every hat)",
    "primary_concern": "Can't afford enterprise software; need something simple that actually helps",
    "builddesk_fit": "Starter tier; unlimited users means the owner and 1–2 office staff at no extra cost"
  },
  "growing": {
    "id": "growing",
    "revenue_range": "$1M–$5M",
    "employee_range": "10–30",
    "software_maturity": "Outgrowing spreadsheets; possibly using Buildertrend or basic QuickBooks",
    "price_sensitivity": "Moderate — will pay if ROI is clear",
    "decision_maker": "Owner with input from office manager or PM",
    "primary_concern": "Losing control of job costs as project count grows; need real-time visibility",
    "builddesk_fit": "Professional tier; the per-seat problem bites hard here — unlimited users is a major win"
  },
  "mid-size": {
    "id": "mid-size",
    "revenue_range": "$5M–$20M",
    "employee_range": "30–50",
    "software_maturity": "May have Procore or Sage; frustrated with complexity or cost",
    "price_sensitivity": "Low — paying $800+/month elsewhere; $350–799 looks great",
    "decision_maker": "Owner or CFO with ops manager input",
    "primary_concern": "Enterprise tools are too complex; spreadsheet-era tools can't handle volume",
    "builddesk_fit": "Professional/Enterprise tier; real-time financial intelligence replaces expensive platforms"
  }
}
```

---

### Dimension 4: Geography

| ID | Display Name | URL Slug | Construction Market Notes |
|----|-------------|----------|--------------------------|
| `texas` | Texas | `texas` | Largest construction market; no state income tax; booming |
| `florida` | Florida | `florida` | Hurricane rebuild cycle; residential boom; no state income tax |
| `california` | California | `california` | Highest construction costs; strict compliance; union-heavy |
| `georgia` | Georgia | `georgia` | Atlanta metro driving strong commercial growth |
| `arizona` | Arizona | `arizona` | Phoenix growth corridor; residential and commercial |
| `colorado` | Colorado | `colorado` | Denver metro boom; mountain resort construction |
| `north-carolina` | North Carolina | `north-carolina` | Charlotte and Triangle growth; affordable housing demand |
| `tennessee` | Tennessee | `tennessee` | Nashville boom; no income tax draws contractors |
| `ohio` | Ohio | `ohio` | Manufacturing sector driving industrial construction |
| `illinois` | Illinois | `illinois` | Chicago metro; union scale; large commercial market |
| `houston` | Houston, TX | `houston-tx` | Nation's largest construction market by volume |
| `dallas` | Dallas-Fort Worth, TX | `dallas-tx` | Fastest-growing metro construction market |
| `phoenix` | Phoenix, AZ | `phoenix-az` | Top 3 residential construction market |
| `atlanta` | Atlanta, GA | `atlanta-ga` | Major commercial expansion hub |
| `denver` | Denver, CO | `denver-co` | Mountain west construction center |

#### Geography Context Objects (sample)

```json
{
  "texas": {
    "id": "texas",
    "display_name": "Texas",
    "market_size": "Largest state construction market at $90B+ annually",
    "growth_trend": "Population and commercial growth driving consistent demand",
    "regulatory_notes": "No state licensing board for GCs; local municipalities vary widely",
    "prevailing_wage": "No state prevailing wage law; Davis-Bacon applies to federal projects",
    "lien_law": "Texas has strict constitutional lien deadlines — software must support lien waiver tracking",
    "weather_risk": "Hurricane/hail cycles in Gulf Coast; extreme heat impacts productivity",
    "peak_season": "Year-round; slowdown only in December"
  },
  "florida": {
    "id": "florida",
    "display_name": "Florida",
    "market_size": "$65B+ annually; top 3 state market",
    "growth_trend": "Migration-driven residential boom; insurance-driven rebuild cycle",
    "regulatory_notes": "State contractor licensing required; reciprocity with some states",
    "prevailing_wage": "No state prevailing wage law",
    "lien_law": "Notice to Owner (NTO) system; strict 45-day preliminary notice deadlines",
    "weather_risk": "Hurricane season May–November creates both risk and demand",
    "peak_season": "October–May (avoiding hurricane season for major starts)"
  }
}
```

---

### Dimension 5: Competitor Comparison

| ID | Display Name | URL Slug | Competitor Profile |
|----|-------------|----------|-------------------|
| `vs-procore` | BuildDesk vs Procore | `vs-procore` | Enterprise tool, $375–$1000+/month per user |
| `vs-buildertrend` | BuildDesk vs Buildertrend | `vs-buildertrend` | Residential-focused, per-seat pricing |
| `vs-coconstruct` | BuildDesk vs CoConstruct | `vs-coconstruct` | Custom home builder tool, limited financials |
| `vs-jobber` | BuildDesk vs Jobber | `vs-jobber` | Service-oriented, not project-cost-focused |
| `vs-quickbooks` | BuildDesk vs QuickBooks | `vs-quickbooks` | Accounting tool, no field/project integration |
| `vs-sage` | BuildDesk vs Sage 100 Contractor | `vs-sage` | Legacy accounting tool, steep learning curve |

---

### Combination Matrix & Tier Priorities

**Total Priority Combinations:**

| Tier | Combination Type | Example | Count | Volume |
|------|-----------------|---------|-------|--------|
| **Tier 1** | Contractor + Pain Point | GC Job Costing Software | 100 | High |
| **Tier 1** | Contractor + Geo (State) | Texas General Contractor Software | 100 | High |
| **Tier 2** | Pain + Size | Job Costing for Small Contractors | 30 | Medium |
| **Tier 2** | Contractor + Size | Software for Small Electrical Contractors | 30 | Medium |
| **Tier 2** | Competitor Comparison | BuildDesk vs Procore | 6 | High intent |
| **Tier 3** | Contractor + Pain + Geo | GC Job Costing in Texas | 200 | Long-tail |
| **Tier 3** | Contractor + Geo (Metro) | General Contractor Software Houston | 150 | Long-tail |
| **Tier 3** | Feature + Contractor | QuickBooks Integration Roofing | 80 | Long-tail |

**Estimated Total Pages:** 1,400–1,800 at full build-out.

---

## PHASE 2: PAGE TYPE DEFINITIONS

---

### PAGE TYPE 1: `CONTRACTOR_PAIN`

**PAGE_TYPE_ID:** `contractor_pain`  
**DISPLAY_NAME:** Contractor Type + Pain Point  
**URL_PATTERN:** `/software/[contractor-type]/[pain-point]`  
**Example URL:** `/software/electrical-contractor/job-costing-software`

**TITLE_TEMPLATE:**  
`"Job Costing Software for Electrical Contractors (2026)"`  
→ `"[Pain Point Display] for [Contractor Type Display] (2026)"`

**META_DESCRIPTION_TEMPLATE:**  
`"BuildDesk gives [contractor_type] real-time [pain_point] without spreadsheets or enterprise complexity. [AI-FILL: 1 sentence on specific pain]. Unlimited users, $350/month."`

**TARGET_QUERY_PATTERN:**  
`"[pain point] software for [contractor type]"` / `"best [pain point] for [contractor type]"`

**SEARCH_VOLUME_TIER:** High

**DATA_SOURCES:**  
- `contractor_types` dimension table  
- `pain_points` dimension table  
- `builddesk_features` table (features relevant to this pair)  
- `testimonials` table filtered by contractor_type  
- `case_studies` table filtered by contractor_type and pain_point  

**MINIMUM_DATA_THRESHOLD:**  
At least 3 features directly addressing this contractor+pain combination.

**COMPONENT_NAME:** `ContractorPainPage`  
**INTERACTIVE_FEATURES:** `["feature-checklist", "comparison-table", "roi-calculator", "demo-cta"]`

**INTERNAL_LINKS_TO:**  
- `CONTRACTOR_SIZE` (same contractor, different angle)  
- `CONTRACTOR_GEO` (same contractor, Texas/Florida)  
- `PAIN_SIZE` (same pain, size angle)  
- `COMPARISON` (relevant competitor)  

**SCHEMA_MARKUP:** `SoftwareApplication`, `FAQPage`  
**FRESHNESS_SIGNAL:** Quarterly (pricing, features may update)  
**USEFUL_WITHOUT_SEARCH:** Yes — answers "does BuildDesk actually solve my specific invoicing problem as an electrical contractor" with specifics, comparisons, and pricing.

---

### PAGE TYPE 2: `CONTRACTOR_GEO`

**PAGE_TYPE_ID:** `contractor_geo`  
**DISPLAY_NAME:** Contractor Type + Geography  
**URL_PATTERN:** `/software/[contractor-type]/[geography]`  
**Example URL:** `/software/roofing-contractor/texas`

**TITLE_TEMPLATE:**  
`"Construction Management Software for Texas Roofing Contractors (2026)"`  
→ `"Construction Management Software for [Geography] [Contractor Type Display] (2026)"`

**META_DESCRIPTION_TEMPLATE:**  
`"BuildDesk helps [geography] [contractor_type] track job costs, manage crews, and bill clients faster. [AI-FILL: 1 sentence on local market context]. Unlimited users, no per-seat fees."`

**TARGET_QUERY_PATTERN:**  
`"construction software for [state] [contractor type]"` / `"[contractor type] software [state]"`

**SEARCH_VOLUME_TIER:** High (state), Medium (metro)

**DATA_SOURCES:**  
- `contractor_types` dimension table  
- `geographies` dimension table  
- `state_regulatory_notes` (lien law, licensing)  
- `testimonials` filtered by geography (if available) or contractor_type  

**MINIMUM_DATA_THRESHOLD:**  
Contractor type context object + geography context object both present.

**COMPONENT_NAME:** `ContractorGeoPage`  
**INTERACTIVE_FEATURES:** `["feature-list", "local-regulatory-callout", "demo-cta"]`

**INTERNAL_LINKS_TO:**  
- `CONTRACTOR_PAIN` (same contractor, pain angle)  
- `PAIN_GEO` (same geography, different angle)  
- Related metro pages if state-level page  

**SCHEMA_MARKUP:** `SoftwareApplication`, `FAQPage`  
**FRESHNESS_SIGNAL:** Semi-annually (regulatory info may change)  
**USEFUL_WITHOUT_SEARCH:** Yes — addresses specific regulatory concerns (Texas lien law, Florida NTO) that a contractor in that state actually needs to know when choosing software.

---

### PAGE TYPE 3: `PAIN_SIZE`

**PAGE_TYPE_ID:** `pain_size`  
**DISPLAY_NAME:** Pain Point + Business Size  
**URL_PATTERN:** `/software/[pain-point]/[size]`  
**Example URL:** `/software/job-costing-software/small-contractor`

**TITLE_TEMPLATE:**  
`"Job Costing Software for Small Contractors (2026)"`  
→ `"[Pain Point Display] for [Size Display] (2026)"`

**META_DESCRIPTION_TEMPLATE:**  
`"BuildDesk gives [size] contractors real-time [pain_point] at a price that makes sense. [AI-FILL: 1 sentence on size-specific pain]. Unlimited users from $350/month."`

**TARGET_QUERY_PATTERN:**  
`"[pain point] for small contractors"` / `"best [pain point] software small construction company"`

**SEARCH_VOLUME_TIER:** Medium

**DATA_SOURCES:**  
- `pain_points` dimension table  
- `business_sizes` dimension table  
- `pricing_tiers` table (relevant to size)  
- `features` filtered by pain point  

**MINIMUM_DATA_THRESHOLD:**  
Pain point context object + size context object both present.

**COMPONENT_NAME:** `PainSizePage`  
**INTERACTIVE_FEATURES:** `["pricing-callout", "feature-checklist", "roi-calculator", "demo-cta"]`

**INTERNAL_LINKS_TO:**  
- `CONTRACTOR_PAIN` (add contractor specificity)  
- `COMPARISON` (competitor who targets this size)  
- `PAIN_GEO` (same pain, location angle)  

**SCHEMA_MARKUP:** `SoftwareApplication`, `FAQPage`  
**FRESHNESS_SIGNAL:** Quarterly  
**USEFUL_WITHOUT_SEARCH:** Yes — small contractor buying journey explicitly focuses on price and simplicity; this page addresses both with specifics.

---

### PAGE TYPE 4: `PAIN_GEO`

**PAGE_TYPE_ID:** `pain_geo`  
**DISPLAY_NAME:** Pain Point + Geography  
**URL_PATTERN:** `/software/[pain-point]/[geography]`  
**Example URL:** `/software/cash-flow-management/texas`

**TITLE_TEMPLATE:**  
`"Cash Flow Management Software for Texas Contractors (2026)"`

**META_DESCRIPTION_TEMPLATE:**  
`"Texas contractors face unique cash flow challenges — [AI-FILL: lien deadlines, payment cycles]. BuildDesk's real-time forecasting gives you 90-day visibility. Unlimited users."`

**TARGET_QUERY_PATTERN:**  
`"[pain point] for [state] contractors"` / `"[state] contractor [pain point] software"`

**SEARCH_VOLUME_TIER:** Medium–Long-tail

**DATA_SOURCES:**  
- `pain_points` dimension table  
- `geographies` dimension table (regulatory notes, market context)  

**MINIMUM_DATA_THRESHOLD:**  
Geography regulatory notes must contain at least 1 item relevant to the pain point (e.g., lien law for cash flow).

**COMPONENT_NAME:** `PainGeoPage`  
**INTERACTIVE_FEATURES:** `["regulatory-callout", "feature-list", "demo-cta"]`

**INTERNAL_LINKS_TO:**  
- `CONTRACTOR_GEO` (add contractor specificity)  
- `CONTRACTOR_PAIN` (add contractor specificity)  
- Related state pages  

**SCHEMA_MARKUP:** `SoftwareApplication`, `FAQPage`  
**FRESHNESS_SIGNAL:** Semi-annually  
**USEFUL_WITHOUT_SEARCH:** Yes — addresses state-specific payment law context (Texas lien deadlines, Florida NTO) alongside software solution.

---

### PAGE TYPE 5: `COMPARISON`

**PAGE_TYPE_ID:** `comparison`  
**DISPLAY_NAME:** BuildDesk vs Competitor  
**URL_PATTERN:** `/compare/[competitor-slug]`  
**Example URL:** `/compare/vs-procore`

**TITLE_TEMPLATE:**  
`"BuildDesk vs Procore: Best Choice for SMB Contractors in 2026"`

**META_DESCRIPTION_TEMPLATE:**  
`"BuildDesk vs [competitor]: honest comparison for [target audience]. [AI-FILL: key differentiator]. Unlimited users at $350/month vs [competitor pricing]."`

**TARGET_QUERY_PATTERN:**  
`"builddesk vs [competitor]"` / `"[competitor] alternative for small contractors"` / `"[competitor] too expensive"`

**SEARCH_VOLUME_TIER:** High intent (bottom-funnel)

**DATA_SOURCES:**  
- `competitor_profiles` table  
- `builddesk_features` table  
- `pricing_comparison` table  
- `testimonials` where reason for switching = this competitor  

**MINIMUM_DATA_THRESHOLD:**  
Competitor profile object complete + at least 5 differentiating feature comparisons.

**COMPONENT_NAME:** `ComparisonPage`  
**INTERACTIVE_FEATURES:** `["comparison-table", "pricing-calculator", "switching-guide", "demo-cta"]`

**INTERNAL_LINKS_TO:**  
- `CONTRACTOR_PAIN` (pages that competitor targets)  
- `PAIN_SIZE` (size segment relevant to this competitor's weakness)  

**SCHEMA_MARKUP:** `FAQPage`, `SoftwareApplication`  
**FRESHNESS_SIGNAL:** Monthly (competitor pricing changes)  
**USEFUL_WITHOUT_SEARCH:** Yes — someone evaluating alternatives gets a structured, honest comparison they can bookmark and share with their team.

---

### PAGE TYPE 6: `CONTRACTOR_SIZE`

**PAGE_TYPE_ID:** `contractor_size`  
**DISPLAY_NAME:** Contractor Type + Business Size  
**URL_PATTERN:** `/software/[contractor-type]/[size]`  
**Example URL:** `/software/hvac-contractor/growing-contractor`

**TITLE_TEMPLATE:**  
`"Construction Software for Growing HVAC Contractors (2026)"`

**META_DESCRIPTION_TEMPLATE:**  
`"BuildDesk is built for HVAC companies with 10–30 employees outgrowing spreadsheets. [AI-FILL: specific growing pain]. Unlimited users. No per-seat fees."`

**TARGET_QUERY_PATTERN:**  
`"software for [size] [contractor type]"` / `"[contractor type] software for growing company"`

**SEARCH_VOLUME_TIER:** Medium

**DATA_SOURCES:**  
- `contractor_types` dimension table  
- `business_sizes` dimension table  

**MINIMUM_DATA_THRESHOLD:**  
Both context objects present.

**COMPONENT_NAME:** `ContractorSizePage`  
**INTERACTIVE_FEATURES:** `["feature-checklist", "pricing-callout", "demo-cta"]`

**INTERNAL_LINKS_TO:**  
- `CONTRACTOR_PAIN` (same contractor, pain angle)  
- `PAIN_SIZE` (same size, pain angle)  
- `COMPARISON` (competitor relevant to this size)  

**SCHEMA_MARKUP:** `SoftwareApplication`, `FAQPage`  
**FRESHNESS_SIGNAL:** Quarterly  
**USEFUL_WITHOUT_SEARCH:** Yes — "I'm a growing HVAC company" is a specific identity; this page speaks directly to that stage and validates that BuildDesk fits.

---

### PAGE TYPE 7: `FEATURE_CONTRACTOR`

**PAGE_TYPE_ID:** `feature_contractor`  
**DISPLAY_NAME:** Feature + Contractor Type  
**URL_PATTERN:** `/features/[feature-slug]/[contractor-type]`  
**Example URL:** `/features/quickbooks-integration/roofing-contractor`

**TITLE_TEMPLATE:**  
`"QuickBooks Integration for Roofing Contractors — BuildDesk (2026)"`

**META_DESCRIPTION_TEMPLATE:**  
`"BuildDesk's QuickBooks integration eliminates double-entry for roofing companies. [AI-FILL: specific roofing QB pain]. Two-way sync. Unlimited users from $350/month."`

**TARGET_QUERY_PATTERN:**  
`"[feature] for [contractor type]"` / `"[contractor type] [feature] software"`

**SEARCH_VOLUME_TIER:** Long-tail, high intent

**DATA_SOURCES:**  
- `features` table (detailed feature specs)  
- `contractor_types` dimension table  
- `integrations` table (if feature = integration)  

**MINIMUM_DATA_THRESHOLD:**  
Feature must directly apply to contractor type (no forcing irrelevant combinations).

**COMPONENT_NAME:** `FeatureContractorPage`  
**INTERACTIVE_FEATURES:** `["feature-demo-embed", "step-by-step-how-it-works", "demo-cta"]`

**INTERNAL_LINKS_TO:**  
- `CONTRACTOR_PAIN` (same contractor + pain this feature solves)  
- `COMPARISON` (competitor with weaker version of this feature)  

**SCHEMA_MARKUP:** `SoftwareApplication`, `HowTo`, `FAQPage`  
**FRESHNESS_SIGNAL:** Quarterly  
**USEFUL_WITHOUT_SEARCH:** Yes — detailed how-it-works explanation for a specific integration + trade combination is genuinely educational.

---

## PHASE 3: JSON SCHEMAS

### Schema 1: ContractorPainSchema

```typescript
interface ContractorPainSchema {
  meta: {
    page_type: "contractor_pain";           // DETERMINISTIC
    generated_at: string;                   // DETERMINISTIC - ISO 8601
    schema_version: "1.0";                  // DETERMINISTIC
    combination: {
      contractor_type: string;              // DETERMINISTIC - from contractor_types dimension
      pain_point: string;                   // DETERMINISTIC - from pain_points dimension
    };
    source_context_ids: {
      contractor_type_id: string;           // FROM-DB
      pain_point_id: string;               // FROM-DB
    };
    freshness_days: 90;                    // DETERMINISTIC
  };

  seo: {
    title: string;                         // DETERMINISTIC - "[Pain] for [Contractor] (2026)"
    description: string;                   // AI-FILL - max 155 chars, must include contractor type and pain point
    keywords: string[];                    // AI-FILL - exactly 6-8, mix of exact-match and semantic
    canonical_url: string;                 // DETERMINISTIC - /software/[contractor]/[pain]
    schema_type: "SoftwareApplication";    // DETERMINISTIC
    og_title: string;                      // AI-FILL - slightly shorter than title, social-optimized
  };

  hero: {
    headline: string;                      // AI-FILL - max 10 words, must name contractor type AND pain point
    subheadline: string;                   // AI-FILL - max 20 words, specific value prop with a number if possible
    intro: string;                         // AI-FILL - exactly 2-3 sentences, name the core failure mode contractors face
    proof_point: string;                   // AI-FILL - 1 sentence with a specific metric or time saving claim
    cta_primary: "Request a Demo";         // DETERMINISTIC
    cta_secondary: "See Pricing";          // DETERMINISTIC
  };

  pain_section: {
    section_title: string;                 // AI-FILL - "Why [Contractor Type] Struggle with [Pain Point]"
    pain_points: {                         // AI-FILL - exactly 3 entries
      title: string;                       // AI-FILL - max 8 words, name the specific failure
      description: string;                 // AI-FILL - exactly 2 sentences, must be specific to this contractor type
      consequence: string;                 // AI-FILL - 1 sentence, the business cost of this failure
    }[];
  };

  solution_section: {
    section_title: string;                 // AI-FILL - "How BuildDesk Solves [Pain] for [Contractor Type]"
    features: {                            // AI-FILL - exactly 4-5 entries
      name: string;                        // AI-FILL - feature name, max 6 words
      description: string;                 // AI-FILL - exactly 2 sentences, how this feature addresses THIS contractor's specific workflow
      contractor_specific_benefit: string; // AI-FILL - 1 sentence specific to this contractor type (not generic)
    }[];
  };

  differentiation: {
    unlimited_users_callout: {
      headline: string;                    // DETERMINISTIC - "Unlimited Users. No Per-Seat Fees."
      description: string;                 // AI-FILL - 2 sentences, how unlimited users specifically benefits THIS contractor type
    };
    vs_spreadsheets: {                     // Include if pain_point is job-costing, cash-flow, or project-budgeting
      headline: string;                    // AI-FILL - max 8 words
      comparison_points: string[];         // AI-FILL - exactly 3 items, specific to this contractor's spreadsheet habits
    };
    // Optional: only include if contractor_type has clear competitor overlap
    vs_competitor?: {
      competitor_name: string;             // FROM-DB - most relevant competitor for this contractor type
      headline: string;                    // AI-FILL
      key_differences: string[];           // AI-FILL - exactly 3 differences
    };
  };

  how_it_works: {
    section_title: string;                 // DETERMINISTIC - "How It Works for [Contractor Type Display]"
    steps: {                               // AI-FILL - exactly 4 steps
      step_number: number;                 // DETERMINISTIC - 1,2,3,4
      title: string;                       // AI-FILL - max 5 words, action-oriented
      description: string;                 // AI-FILL - exactly 2 sentences, workflow-specific to this contractor type
    }[];
  };

  pricing: {
    headline: string;                      // DETERMINISTIC - "Pricing for [Contractor Type Display]"
    starter_price: "$350";                 // DETERMINISTIC
    starter_description: string;          // AI-FILL - 1 sentence on what a small version of this contractor type gets
    professional_description: string;     // AI-FILL - 1 sentence on what a growing version gets
    unlimited_users_emphasis: string;     // AI-FILL - 1 sentence on why unlimited users matters for this contractor type specifically
  };

  faq: {                                   // AI-FILL - exactly 4 entries
    question: string;                      // AI-FILL - real question this contractor type would ask about this pain point
    answer: string;                        // AI-FILL - 2-3 sentences, specific and useful, not generic
  }[];

  related_pages: {                         // exactly 5 entries
    title: string;                         // DETERMINISTIC - from target page title template
    url: string;                           // DETERMINISTIC
    relationship: string;                  // AI-FILL - 1 sentence on why this related page matters to THIS visitor
    page_type: string;                     // DETERMINISTIC - the related page type ID
  }[];
}
```

---

### Schema 2: ContractorGeoSchema

```typescript
interface ContractorGeoSchema {
  meta: {
    page_type: "contractor_geo";           // DETERMINISTIC
    generated_at: string;                  // DETERMINISTIC
    schema_version: "1.0";               // DETERMINISTIC
    combination: {
      contractor_type: string;             // DETERMINISTIC
      geography: string;                   // DETERMINISTIC
      geography_level: "state" | "metro"; // DETERMINISTIC
    };
    source_context_ids: {
      contractor_type_id: string;          // FROM-DB
      geography_id: string;               // FROM-DB
    };
    freshness_days: 180;                  // DETERMINISTIC
  };

  seo: {
    title: string;                        // DETERMINISTIC - "Construction Software for [Geo] [Contractor] (2026)"
    description: string;                  // AI-FILL - max 155 chars, include geo and contractor type
    keywords: string[];                   // AI-FILL - exactly 6-8 including geo-modified terms
    canonical_url: string;                // DETERMINISTIC
    schema_type: "SoftwareApplication";  // DETERMINISTIC
    og_title: string;                     // AI-FILL
  };

  hero: {
    headline: string;                     // AI-FILL - must name both geography and contractor type
    subheadline: string;                  // AI-FILL - reference local market context (e.g., Texas lien law, Florida growth)
    intro: string;                        // AI-FILL - exactly 2-3 sentences, opens with local market fact
    cta_primary: "Request a Demo";        // DETERMINISTIC
    cta_secondary: "See Pricing";         // DETERMINISTIC
  };

  local_context: {
    section_title: string;               // DETERMINISTIC - "Built for [Geo] [Contractor Type]"
    market_overview: string;             // AI-FILL - 2-3 sentences on this contractor type in this geography
    regulatory_callout?: {              // Optional - include if geography has relevant contractor-specific regulations
      headline: string;                 // AI-FILL - "Texas Lien Laws and Your Software"
      description: string;             // AI-FILL - 2-3 sentences, specific to this geo + contractor combination
      builddesk_solution: string;       // AI-FILL - 1 sentence on how BuildDesk addresses this regulatory need
    };
    market_challenges: string[];        // AI-FILL - exactly 3 challenges specific to this geo + contractor
  };

  solution_section: {
    section_title: string;              // AI-FILL
    features: {                         // AI-FILL - exactly 4 entries, framed through local lens
      name: string;                     // AI-FILL
      geo_specific_benefit: string;     // AI-FILL - MUST reference local context, not generic
    }[];
  };

  pricing: {
    headline: string;                   // DETERMINISTIC
    starter_price: "$350";             // DETERMINISTIC
    unlimited_users_emphasis: string;  // AI-FILL - 1 sentence geo-specific (e.g., cost of per-seat in high-crew Texas market)
  };

  faq: {                               // AI-FILL - exactly 4 entries, at least 2 must be geo-specific questions
    question: string;                  // AI-FILL
    answer: string;                    // AI-FILL - 2-3 sentences
  }[];

  related_pages: {                     // exactly 5 entries
    title: string;                     // DETERMINISTIC
    url: string;                       // DETERMINISTIC
    relationship: string;              // AI-FILL
    page_type: string;                 // DETERMINISTIC
  }[];
}
```

---

### Schema 3: ComparisonSchema

```typescript
interface ComparisonSchema {
  meta: {
    page_type: "comparison";                // DETERMINISTIC
    generated_at: string;                   // DETERMINISTIC
    schema_version: "1.0";               // DETERMINISTIC
    combination: {
      competitor_id: string;               // DETERMINISTIC
      competitor_name: string;             // FROM-DB
    };
    source_context_ids: {
      competitor_id: string;               // FROM-DB
    };
    freshness_days: 30;                   // DETERMINISTIC - monthly because pricing changes
  };

  seo: {
    title: string;                         // DETERMINISTIC - "BuildDesk vs [Competitor]: Best for SMB Contractors (2026)"
    description: string;                   // AI-FILL - max 155 chars, mention key differentiator and pricing angle
    keywords: string[];                    // AI-FILL - exactly 6-8 including "[competitor] alternative" terms
    canonical_url: string;                 // DETERMINISTIC
    schema_type: "FAQPage";              // DETERMINISTIC
    og_title: string;                      // AI-FILL
  };

  hero: {
    headline: string;                      // AI-FILL - honest, not attack-ad tone
    subheadline: string;                   // AI-FILL - "Here's the honest comparison for [target audience]"
    intro: string;                         // AI-FILL - exactly 3 sentences, sets up who this page is for
    fairness_disclaimer: string;           // AI-FILL - 1 sentence acknowledging BuildDesk has an obvious perspective
  };

  comparison_table: {
    features: {                            // FROM-DB + AI-FILL - exactly 8-10 features
      feature_name: string;               // FROM-DB - standardized feature names
      builddesk_value: string;            // FROM-DB - BuildDesk's offering
      competitor_value: string;           // FROM-DB - Competitor's offering (researched, accurate)
      winner: "builddesk" | "competitor" | "tie"; // FROM-DB - honest assessment
      why_it_matters: string;             // AI-FILL - 1 sentence on why contractors care about this feature
    }[];
    pricing: {
      builddesk_price: string;            // DETERMINISTIC - "$350/month unlimited users"
      competitor_price: string;           // FROM-DB - competitor pricing (with source date)
      pricing_note: string;              // AI-FILL - 1 sentence on the real-world cost difference
    };
  };

  when_to_choose_builddesk: {
    section_title: string;               // DETERMINISTIC - "Choose BuildDesk When..."
    scenarios: string[];                 // AI-FILL - exactly 4 scenarios, specific and honest
  };

  when_to_choose_competitor: {           // MUST include - intellectual honesty required
    section_title: string;              // DETERMINISTIC - "Choose [Competitor] When..."
    scenarios: string[];                // AI-FILL - exactly 3 scenarios, genuine situations where competitor wins
  };

  switching_guide?: {                   // Optional - include if competitor is used by a significant portion of target market
    headline: string;                   // AI-FILL
    steps: string[];                    // AI-FILL - exactly 4 steps to migrate
    migration_support: string;          // DETERMINISTIC - "BuildDesk provides free migration support"
  };

  faq: {                               // AI-FILL - exactly 5 entries
    question: string;                  // AI-FILL - real questions about this comparison
    answer: string;                    // AI-FILL - 2-3 sentences, honest
  }[];

  related_pages: {                     // exactly 4 entries
    title: string;                     // DETERMINISTIC
    url: string;                       // DETERMINISTIC
    relationship: string;              // AI-FILL
    page_type: string;                 // DETERMINISTIC
  }[];
}
```

---

### Schema 4: PainSizeSchema

```typescript
interface PainSizeSchema {
  meta: {
    page_type: "pain_size";              // DETERMINISTIC
    generated_at: string;               // DETERMINISTIC
    schema_version: "1.0";             // DETERMINISTIC
    combination: {
      pain_point: string;               // DETERMINISTIC
      business_size: string;            // DETERMINISTIC
    };
    source_context_ids: {
      pain_point_id: string;            // FROM-DB
      size_id: string;                  // FROM-DB
    };
    freshness_days: 90;                 // DETERMINISTIC
  };

  seo: {
    title: string;                      // DETERMINISTIC - "[Pain] for [Size] (2026)"
    description: string;               // AI-FILL - max 155 chars
    keywords: string[];                 // AI-FILL - exactly 5-7
    canonical_url: string;             // DETERMINISTIC
    schema_type: "SoftwareApplication"; // DETERMINISTIC
    og_title: string;                   // AI-FILL
  };

  hero: {
    headline: string;                   // AI-FILL - must reference both size and pain
    subheadline: string;               // AI-FILL - address price/complexity concern appropriate to this size
    intro: string;                     // AI-FILL - 2-3 sentences, size-specific framing of the pain
    pricing_hook: string;              // DETERMINISTIC + AI-FILL - pricing tier and why it fits this size
    cta_primary: "Request a Demo";     // DETERMINISTIC
    cta_secondary: "See Pricing";      // DETERMINISTIC
  };

  size_specific_pain: {
    section_title: string;             // AI-FILL
    stage_description: string;        // AI-FILL - 2 sentences on what it's like at this business size
    pain_manifestations: string[];    // AI-FILL - exactly 3, how this pain specifically appears at this business size
  };

  solution_section: {
    features: {                        // AI-FILL - exactly 4 entries
      name: string;                    // AI-FILL
      size_specific_benefit: string;  // AI-FILL - must address why THIS size benefits (not just "all contractors")
    }[];
  };

  pricing: {
    recommended_tier: string;         // DETERMINISTIC - which tier fits this size
    price: string;                    // DETERMINISTIC
    why_fits: string;                 // AI-FILL - 2 sentences on why this pricing fits a company at this stage
    unlimited_users_math: string;     // AI-FILL - show the per-seat math savings at this typical team size
  };

  faq: {                              // AI-FILL - exactly 4 entries
    question: string;                 // AI-FILL - questions a contractor at this SIZE would ask about this pain
    answer: string;                   // AI-FILL - 2-3 sentences
  }[];

  related_pages: {                    // exactly 4-5 entries
    title: string;                    // DETERMINISTIC
    url: string;                      // DETERMINISTIC
    relationship: string;             // AI-FILL
    page_type: string;                // DETERMINISTIC
  }[];
}
```

---

## PHASE 4: GENERATION PROMPT LIBRARY

---

### PROMPT: `contractor_pain`

```
--- PROMPT: contractor_pain ---

SYSTEM:
You are a B2B content specialist for BuildDesk, a construction management SaaS
platform. You produce structured JSON content for programmatic landing pages
targeting SMB construction contractors. You never write freeform content. You
only fill schemas. Your output is always valid JSON that exactly matches the
provided schema. You write in the voice of someone who has worked with
contractors, understands their daily frustrations, and respects their
intelligence. You never use construction clichés like "build your business" or
"solid foundation."

CONTEXT INJECTION:
[CONTRACTOR_CONTEXT]: {{contractor_type_context_object}}
[PAIN_CONTEXT]: {{pain_point_context_object}}
[SITE_CONTEXT]: This content appears on build-desk.com, a construction
management platform positioning itself as a "financial command center" for SMB
contractors. Key differentiators: unlimited users at $350/month, real-time job
costing, QuickBooks integration. Target buyer: owner or operations manager at
a $1M–$20M contractor.

DATA INJECTION:
BuildDesk features relevant to this combination:
{{relevant_features_json}}

Competitor data for this contractor type:
{{competitor_context_json}}

SCHEMA TO FILL:
Fill every field marked AI-FILL. Leave DETERMINISTIC and FROM-DB fields empty.
{{empty_contractor_pain_schema}}

OUTPUT RULES:
1. Return ONLY valid JSON. No markdown. No explanation. No preamble.
2. Every AI-FILL field must be filled. No empty strings.
3. Arrays must respect min/max counts in schema comments.
4. Every pain_section entry must describe a failure specific to {{contractor_type}}, not contractors in general.
5. Every solution feature must reference how it fits {{contractor_type}} workflow specifically.
6. Never use the words "vibrant," "bustling," "streamline," "seamless," or "all-in-one."
7. The pricing section must make the unlimited-users advantage concrete with a number
   (e.g., "A 15-person HVAC team using Procore would pay $X more per month").
8. FAQ questions must be questions THIS contractor type actually asks—not generic software questions.

QUALITY TEST (apply before returning):
For each feature in solution_section, ask:
- Does contractor_specific_benefit mention something unique to {{contractor_type}} workflow?
- Would this sentence be equally true for a roofing contractor AND a concrete contractor?
  If yes, rewrite it to be specific to {{contractor_type}}.

For each faq entry, ask:
- Would a {{contractor_type}} owner actually type this question into Google?
- Is the answer specific enough that it couldn't apply to ANY contractor software?
```

---

### PROMPT: `contractor_geo`

```
--- PROMPT: contractor_geo ---

SYSTEM:
You are a B2B content specialist for BuildDesk. You produce structured JSON
content for geo-targeted landing pages for construction contractors. You
understand local construction markets, state contractor licensing, lien laws,
and regional business conditions. You never write tourism-copy about cities.
You write about construction business realities in specific markets.

CONTEXT INJECTION:
[CONTRACTOR_CONTEXT]: {{contractor_type_context_object}}
[GEO_CONTEXT]: {{geography_context_object}}
[SITE_CONTEXT]: BuildDesk is a construction management platform at build-desk.com.
Unlimited users, $350/month. Financial intelligence for SMB contractors.

SCHEMA TO FILL:
{{empty_contractor_geo_schema}}

OUTPUT RULES:
1. Return ONLY valid JSON. No markdown. No explanation.
2. Every AI-FILL field must be filled.
3. local_context.market_overview must open with a specific market fact about {{geography}}
   (e.g., "Texas has more active construction permits than any other state").
4. regulatory_callout must ONLY appear if {{geography_context.regulatory_notes}} contains
   something directly relevant to {{contractor_type}} operations. Do not invent regulations.
5. Every feature's geo_specific_benefit must reference {{geography}} market conditions—
   not generic benefits.
6. At least 2 FAQ questions must be geographic-specific (lien law, licensing, market conditions).
7. Never describe any city as "thriving," "booming," or "growing" without citing a specific fact.

QUALITY TEST:
For each item in solution_section.features:
- Remove the geo reference. Does the sentence still make sense for any contractor anywhere?
  If yes, rewrite to make the geo connection explicit and meaningful.
```

---

### PROMPT: `comparison`

```
--- PROMPT: comparison ---

SYSTEM:
You are a B2B content writer for BuildDesk. You write honest software
comparison content. You acknowledge where competitors are strong. You never
make false claims about competitors. You never use attack-ad language. Your
tone is "a contractor's trusted advisor who has evaluated both tools." You
write for the contractor who is genuinely evaluating options, not for
someone who has already decided. The when_to_choose_competitor section must
be genuine—reviewers will notice if it's not.

CONTEXT INJECTION:
[COMPETITOR_CONTEXT]: {{competitor_profile_object}}
[BUILDDESK_CONTEXT]: {
  "name": "BuildDesk",
  "price": "$350/month unlimited users",
  "strengths": ["real-time job costing", "unlimited users", "QuickBooks sync",
                "construction-specific financial reports", "client portal"],
  "target_customer": "SMB contractors $1M–$20M revenue"
}

DATA INJECTION:
Feature comparison data (verified, sourced):
{{comparison_table_data}}

Testimonials from customers who switched from {{competitor_name}}:
{{switcher_testimonials}}

SCHEMA TO FILL:
{{empty_comparison_schema}}

OUTPUT RULES:
1. Return ONLY valid JSON. No markdown.
2. comparison_table.features must be honest — if competitor wins on a feature, winner = "competitor".
3. when_to_choose_competitor scenarios must be genuine situations where {{competitor_name}} is
   actually the better choice. Do not write straw-man scenarios.
4. fairness_disclaimer must be a single honest sentence acknowledging BuildDesk's perspective.
5. Every why_it_matters in comparison_table must explain the BUSINESS impact, not just
   the feature difference.
6. pricing_note must include the actual math showing the cost difference for a typical
   {{competitor_name}} customer size.

QUALITY TEST:
Read when_to_choose_competitor. Would a {{competitor_name}} sales rep consider this a fair
representation of their product's strengths? If no, rewrite.
```

---

### PROMPT: `pain_size`

```
--- PROMPT: pain_size ---

SYSTEM:
You are a B2B content specialist for BuildDesk. You write for specific
stages of contractor business growth. A small contractor (under $1M) has
completely different concerns than a mid-size contractor ($5M–$20M). The
same pain point (job costing) looks different at each stage. Your content
must reflect the actual experience of contractors at THIS specific size—
their software maturity, their team structure, their price sensitivity.

CONTEXT INJECTION:
[PAIN_CONTEXT]: {{pain_point_context_object}}
[SIZE_CONTEXT]: {{business_size_context_object}}
[SITE_CONTEXT]: BuildDesk, build-desk.com. Unlimited users. $350–799/month.
SMB contractor focus.

SCHEMA TO FILL:
{{empty_pain_size_schema}}

OUTPUT RULES:
1. Return ONLY valid JSON. No markdown.
2. size_specific_pain.pain_manifestations must describe how THIS pain looks at THIS company size.
   Example for small + job costing: "The owner manually reconciles QuickBooks with a
   spreadsheet every Friday afternoon — a 3-hour exercise that's always one week behind."
3. pricing.unlimited_users_math must show the math: typical team size at this stage ×
   per-seat competitor pricing = monthly savings.
4. FAQ questions must be ones a contractor AT THIS SIZE would ask, not generic questions.
   Small contractors ask about simplicity and time. Mid-size ask about integration and reporting.

QUALITY TEST:
For each FAQ: would a {{business_size}} contractor ask this question, or is this a question
ANY contractor would ask? If generic, make it size-specific.
```

---

## PHASE 5: REACT COMPONENT SPECIFICATIONS

---

### COMPONENT: `ContractorPainPage`

**FILE:** `src/pages/pseo/ContractorPainPage.tsx`  
**DATA SOURCE:** Supabase table `pseo_pages` where `page_type = 'contractor_pain'`  
**QUERY KEY:** `['pseo', 'contractor_pain', contractorType, painPoint]`

**LAYOUT SECTIONS (in order):**
1. **Hero** — headline, subheadline, intro, proof point, dual CTAs
2. **Pain Section** — 3-card pain point display with icon, title, description, consequence
3. **Solution Section** — 4–5 feature cards with contractor-specific benefits
4. **How It Works** — 4-step horizontal process with numbered connectors
5. **Differentiation Block** — unlimited users callout + optional competitor comparison
6. **Pricing Callout** — simplified pricing with unlimited users emphasis
7. **FAQ Accordion** — 4 questions, collapsed by default
8. **Related Pages Grid** — 5 internal links, card format
9. **CTA Block** — demo request with social proof counter

**INTERACTIVE FEATURES:**
- `feature-checklist`: Checkbox list of key features, checked state persists locally (not DB)
- `roi-calculator`: Simple "how many users × competitor per-seat cost = your savings" inline calculator, no external fetch
- `demo-cta`: Sticky bottom bar on mobile with "Request Demo" button

**SCHEMA MARKUP:**
```tsx
// Inject in <head> via react-helmet or document.head
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "BuildDesk",
  "applicationCategory": "BusinessApplication",
  "description": pageData.seo.description,
  "offers": {
    "@type": "Offer",
    "price": "350",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "billingDuration": "P1M"
    }
  }
};
// FAQPage schema from faq array
```

**INTERNAL LINKING RULES:**
- Breadcrumb: `Home > Software > [Contractor Type] > [Pain Point]`
- Related pages grid uses `related_pages` array from schema
- In-content links: Link contractor type name to its `CONTRACTOR_GEO` hub page

**PERFORMANCE REQUIREMENTS:**
- No 3D, no heavy chart libraries on pSEO pages
- Target LCP < 1.8s
- All images: WebP, explicit width/height, lazy-load below fold
- No JavaScript required for above-fold content (static HTML from SSG or edge rendering)
- ROI calculator: vanilla JS only, no library imports

**PROPS INTERFACE:**
```typescript
interface ContractorPainPageProps {
  data: ContractorPainSchema;
  params: {
    contractorType: string; // URL slug
    painPoint: string;       // URL slug
  };
}
```

**COMPONENT SKELETON:**
```tsx
export default function ContractorPainPage({ data, params }: ContractorPainPageProps) {
  return (
    <>
      <SEOHead seo={data.seo} structuredData={buildSoftwareSchema(data)} />
      <Breadcrumb items={buildBreadcrumb(data)} />
      <HeroSection hero={data.hero} />
      <PainSection painSection={data.pain_section} />
      <SolutionSection solution={data.solution_section} />
      <HowItWorks steps={data.how_it_works.steps} />
      <DifferentiationBlock diff={data.differentiation} />
      <PricingCallout pricing={data.pricing} />
      <FAQAccordion faqs={data.faq} />
      <RelatedPagesGrid pages={data.related_pages} />
      <DemoCTABlock />
    </>
  );
}
```

---

### COMPONENT: `ComparisonPage`

**FILE:** `src/pages/pseo/ComparisonPage.tsx`  
**DATA SOURCE:** `pseo_pages` where `page_type = 'comparison'`

**LAYOUT SECTIONS (in order):**
1. **Hero** — headline, subheadline, intro, fairness disclaimer in small text
2. **Comparison Table** — sticky header table, 8–10 feature rows, winner badges
3. **When to Choose BuildDesk** — 4-item bulleted section
4. **When to Choose [Competitor]** — 3-item honest assessment (builds trust)
5. **Pricing Comparison** — side-by-side with real math
6. **Switching Guide** (conditional) — 4-step migration if applicable
7. **FAQ Accordion** — 5 questions
8. **CTA Block** — "Still Deciding? Talk to a Real Contractor User"

**INTERACTIVE FEATURES:**
- `comparison-table`: Sortable by "winner" column; winner badges (BuildDesk/Competitor/Tie)
- `pricing-calculator`: "Enter your team size → see real cost difference" (vanilla JS)

**PERFORMANCE REQUIREMENTS:**
- Comparison table: no virtualization needed (max 10 rows); standard HTML table
- LCP < 1.8s

**PROPS INTERFACE:**
```typescript
interface ComparisonPageProps {
  data: ComparisonSchema;
  params: {
    competitorSlug: string;
  };
}
```

---

## PHASE 6: GENERATION PIPELINE SPECIFICATION

### 6A. Generation Sequence

**Step 1: Combination Validation**
```
For each candidate combination (contractor_type × pain_point, etc.):
  1. Verify both dimension context objects exist in database
  2. Check MINIMUM_DATA_THRESHOLD is met
  3. Flag combinations that would produce near-duplicate content
     (e.g., don't generate both "gc + job-costing" and "commercial + job-costing" 
      if context objects are >80% similar)
  4. Assign tier priority (Tier 1, 2, 3)
  5. Add to generation_queue table with status = 'pending'
```

**Step 2: Batch Prioritization**
```
Order generation queue:
  1. Tier 1 first, within tier: highest estimated search volume first
  2. Batch size: 10 pages per run (prevents API rate limit issues)
  3. Rate limit: 1 generation request per 8 seconds (Claude API)
  4. Daily cap: 50 pages maximum during initial rollout
```

**Step 3: Schema Generation (per page)**
```
  1. Pull dimension context objects from database
  2. Construct empty schema JSON
  3. Inject context objects into prompt template
  4. Call Claude API with filled prompt
  5. Parse JSON response (strip markdown fences if present)
  6. Validate response against TypeScript schema (using Zod)
  7. If validation fails: log error, mark queue item as 'failed', continue
  8. If validation passes: write to pseo_pages table with is_published = false
```

**Step 4: Quality Control (automated)**
```
For each generated page before publishing:
  1. Schema completeness: all AI-FILL fields non-empty
  2. Word count: each AI-FILL text field >= minimum word count
  3. Duplicate detection: compare faq questions with existing published pages
     (cosine similarity > 0.85 = flag for review)
  4. Internal link validity: all related_pages URLs resolve to existing pages
  5. Pricing accuracy: all price references match current pricing config
  6. Forbidden words check: ["vibrant", "bustling", "streamline", "all-in-one"]
  7. If all checks pass: set is_published = true
  8. If any check fails: set status = 'review_needed', log specific failures
```

**Step 5: Progressive Rollout**
```
  Week 1: Publish Tier 1 Contractor+Pain combos only (100 pages max)
  Week 2: Review indexing signals in GSC; adjust if needed
  Week 3: Add Tier 1 Contractor+Geo pages
  Week 4-5: Add Tier 2 pages
  Week 6+: Add Tier 3 long-tail pages
```

---

### 6B. n8n Workflow Structure

**Workflow Name:** `BuildDesk pSEO Page Generator`

**Trigger:**
- Schedule: Every Monday at 6:00 AM CT (weekly batch)
- Manual trigger: Available for single-page regeneration
- Webhook trigger: On pricing update → regenerate comparison pages

**Node Structure:**

```
[Schedule Trigger]
        ↓
[Supabase: Fetch Pending Queue]
  SELECT * FROM pseo_generation_queue 
  WHERE status = 'pending' 
  AND tier <= 2 
  ORDER BY tier ASC, estimated_volume DESC 
  LIMIT 10
        ↓
[IF: Queue Empty?]
  YES → [Slack: "No pages queued"] → END
  NO  → Continue
        ↓
[Loop Over Items]
        ↓
[Supabase: Fetch Context Objects]
  Fetch dimension contexts for this combination
        ↓
[IF: Minimum Data Met?]
  NO  → [Supabase: Update queue status='insufficient_data'] → Next item
  YES → Continue
        ↓
[Function: Build Prompt]
  Inject context objects into prompt template
  Build empty schema JSON
        ↓
[HTTP: Claude API Call]
  POST https://api.anthropic.com/v1/messages
  model: claude-sonnet-4-20250514
  max_tokens: 4000
        ↓
[Function: Parse & Validate Schema]
  Strip markdown fences
  Parse JSON
  Validate with Zod schema
        ↓
[IF: Validation Passed?]
  NO  → [Supabase: Update queue status='failed', log error]
       → [Slack: Alert with error details]
       → Next item
  YES → Continue
        ↓
[Function: Quality Control Checks]
  Run all 7 automated QC checks
        ↓
[IF: All QC Passed?]
  NO  → [Supabase: Insert page with is_published=false, status='review_needed']
       → [Slack: Alert with failed checks list]
  YES → [Supabase: Insert page with is_published=true]
        ↓
[Supabase: Update queue item status='completed']
        ↓
[Slack: Weekly summary on last item]
```

---

### 6C. Supabase Table Definition

```sql
-- =============================================
-- pSEO Pages Table
-- =============================================

CREATE TABLE pseo_pages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type         TEXT NOT NULL CHECK (page_type IN (
                      'contractor_pain', 'contractor_geo', 'pain_size',
                      'pain_geo', 'comparison', 'contractor_size', 'feature_contractor'
                    )),
  combination_key   TEXT NOT NULL UNIQUE, -- e.g., "contractor_pain::gc::job-costing"
  dimension_1       TEXT NOT NULL,         -- primary dimension slug
  dimension_2       TEXT NOT NULL,         -- secondary dimension slug
  dimension_3       TEXT,                  -- tertiary dimension (for 3-way combos)
  
  -- SEO Fields (deterministic, for fast query without parsing JSON)
  seo_title         TEXT NOT NULL,
  seo_description   TEXT NOT NULL,
  canonical_url     TEXT NOT NULL UNIQUE,
  
  -- Full Schema JSON
  page_schema       JSONB NOT NULL,
  schema_version    TEXT NOT NULL DEFAULT '1.0',
  
  -- Publishing State
  is_published      BOOLEAN NOT NULL DEFAULT false,
  generation_status TEXT NOT NULL DEFAULT 'pending' 
                    CHECK (generation_status IN (
                      'pending', 'generated', 'review_needed', 'failed', 'published', 'stale'
                    )),
  qc_failures       JSONB,                 -- array of failed QC check names if any
  
  -- Freshness
  freshness_days    INTEGER NOT NULL,
  next_refresh_at   TIMESTAMPTZ GENERATED ALWAYS AS (
                      created_at + (freshness_days || ' days')::INTERVAL
                    ) STORED,
  
  -- Metadata
  generation_model  TEXT DEFAULT 'claude-sonnet-4-20250514',
  generation_prompt_version TEXT DEFAULT '1.0',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at      TIMESTAMPTZ,
  
  -- Analytics (updated by application)
  view_count        INTEGER NOT NULL DEFAULT 0,
  conversion_count  INTEGER NOT NULL DEFAULT 0
);

-- =============================================
-- Generation Queue Table
-- =============================================

CREATE TABLE pseo_generation_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type         TEXT NOT NULL,
  combination_key   TEXT NOT NULL UNIQUE,
  dimension_1       TEXT NOT NULL,
  dimension_2       TEXT NOT NULL,
  dimension_3       TEXT,
  tier              INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  estimated_volume  TEXT CHECK (estimated_volume IN ('high', 'medium', 'long-tail')),
  status            TEXT NOT NULL DEFAULT 'pending' 
                    CHECK (status IN (
                      'pending', 'in_progress', 'completed', 'failed', 'insufficient_data'
                    )),
  failure_reason    TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Dimension Context Tables
-- =============================================

CREATE TABLE pseo_contractor_types (
  id                TEXT PRIMARY KEY,  -- e.g., "gc", "electrical"
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  context_object    JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pseo_pain_points (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  context_object    JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pseo_geographies (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  geo_level         TEXT NOT NULL CHECK (geo_level IN ('state', 'metro')),
  context_object    JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pseo_business_sizes (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  context_object    JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pseo_competitors (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  url_slug          TEXT NOT NULL UNIQUE,
  competitor_profile JSONB NOT NULL,
  pricing_verified_at TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_pseo_pages_page_type ON pseo_pages (page_type);
CREATE INDEX idx_pseo_pages_is_published ON pseo_pages (is_published);
CREATE INDEX idx_pseo_pages_canonical ON pseo_pages (canonical_url);
CREATE INDEX idx_pseo_pages_dimension_1 ON pseo_pages (dimension_1);
CREATE INDEX idx_pseo_pages_status ON pseo_pages (generation_status);
CREATE INDEX idx_pseo_pages_refresh ON pseo_pages (next_refresh_at) WHERE is_published = true;
CREATE INDEX idx_pseo_queue_tier_status ON pseo_generation_queue (tier ASC, status);

-- Full text search on SEO fields
CREATE INDEX idx_pseo_pages_fts ON pseo_pages 
  USING GIN (to_tsvector('english', seo_title || ' ' || seo_description));

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE pseo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseo_generation_queue ENABLE ROW LEVEL SECURITY;

-- Public can read published pages only
CREATE POLICY "Public can read published pseo pages"
  ON pseo_pages FOR SELECT
  TO anon
  USING (is_published = true);

-- Service role has full access (for generation pipeline)
CREATE POLICY "Service role full access pseo_pages"
  ON pseo_pages FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access queue"
  ON pseo_generation_queue FOR ALL
  TO service_role
  USING (true);

-- =============================================
-- Triggers
-- =============================================

CREATE OR REPLACE FUNCTION update_pseo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.is_published = true AND OLD.is_published = false THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pseo_pages_updated_at
  BEFORE UPDATE ON pseo_pages
  FOR EACH ROW EXECUTE FUNCTION update_pseo_updated_at();

-- Auto-mark stale pages for refresh
CREATE OR REPLACE FUNCTION mark_stale_pseo_pages()
RETURNS void AS $$
BEGIN
  UPDATE pseo_pages
  SET generation_status = 'stale'
  WHERE is_published = true
    AND next_refresh_at < NOW()
    AND generation_status = 'published';
END;
$$ LANGUAGE plpgsql;
```

---

### 6D. Quality Control Checklist

These checks run automatically before `is_published` is set to `true`:

| # | Check | Threshold | Action on Fail |
|---|-------|-----------|---------------|
| 1 | **Schema completeness** | All AI-FILL fields non-null and non-empty | Mark `review_needed` |
| 2 | **Minimum word count** | Hero intro: 40+ words; FAQ answers: 30+ words each | Mark `review_needed` |
| 3 | **Forbidden words** | None of: vibrant, bustling, streamline, all-in-one, game-changer | Mark `review_needed` |
| 4 | **Duplicate FAQ detection** | FAQ questions < 0.85 cosine similarity to any published page's FAQ | Mark `review_needed` |
| 5 | **Internal link validity** | All `related_pages.url` values exist in `pseo_pages.canonical_url` | Remove invalid links; if < 4 remain, mark `review_needed` |
| 6 | **Pricing accuracy** | All price references match `$350` or `$799` from config | Auto-fix from config; log correction |
| 7 | **Array count validation** | Pain points: exactly 3; Features: 4-5; FAQ: 4-5; Related: 4-6 | Mark `review_needed` |
| 8 | **Contractor specificity** | `contractor_specific_benefit` fields must contain the contractor type name | Mark `review_needed` |
| 9 | **JSON validity** | Full schema parses without error | Mark `failed` |
| 10 | **Schema version match** | `meta.schema_version` matches current version in config | Mark `failed` |

---

## PHASE 7: LAUNCH ROADMAP

### 6-Week Progressive Rollout

---

**Week 1: Tier 1 Core Launch — 60 Pages**

Pages: Top 6 contractor types × top 5 pain points = 30 `CONTRACTOR_PAIN` pages  
Plus: Top 6 contractor types × top 5 states = 30 `CONTRACTOR_GEO` pages

Targets:
- `/software/general-contractor/job-costing-software`
- `/software/electrical-contractor/invoicing-software`
- `/software/roofing-contractor/texas`
- `/software/hvac-contractor/florida`
- (etc.)

Actions:
- Submit XML sitemap with these 60 URLs to GSC immediately
- Monitor GSC Coverage report daily for indexing errors
- Monitor Core Web Vitals for LCP compliance

GSC Signals to Watch:
- URL indexed within 14 days: ✅ proceed
- URL not indexed after 14 days: investigate crawlability, check canonical tags
- Discovery method: should be "Sitemap" for all pages

---

**Week 2: Indexing Analysis & Adjustment**

Actions:
- Pull GSC impressions for Week 1 pages (likely 0–10 impressions; normal)
- Check if all 60 URLs appear in GSC "Pages" report
- Identify any pages with "Crawled - not indexed" status → review content quality
- If < 80% of pages indexed: pause expansion, audit content quality

Decision Point:
- ≥ 80% indexed and no manual action notices → proceed to Week 3
- < 80% indexed or quality issues → spend Week 3 fixing before expanding

---

**Week 3: Competitor Comparisons + Pain×Size — 36 Pages**

Pages: 6 comparison pages + 10 pain × 3 size = 36 pages

Targets:
- `/compare/vs-procore`
- `/compare/vs-buildertrend`
- `/software/job-costing-software/small-contractor`
- `/software/cash-flow-management/growing-contractor`
- (etc.)

Note: Comparison pages are highest-intent; prioritize for internal linking from all Tier 1 pages.

---

**Week 4: Remaining Tier 2 — 80 Pages**

Pages: Remaining contractor×size combinations + metro-level geo pages

Targets:
- All 10 contractor types × 3 sizes = 30 pages
- Top 10 metro areas × top 6 contractors = 60 pages (select best fits)

---

**Week 5: Tier 3 Long-Tail Expansion — 150 Pages**

Pages: Three-way combinations (contractor + pain + geo)

Priority order: Texas + top 3 pains + top 5 contractors = 15 pages first  
Then Florida, Georgia, Arizona variations.

---

**Week 6: Full Coverage & Optimization — Remaining Pages**

Actions:
- Complete remaining Tier 3 combinations
- Review GSC performance data; identify highest-impression pages
- Add internal links from main site navigation to top-performing pSEO pages
- Begin refreshing any Tier 1 pages showing "stale" in database

Traffic Projection (Conservative):
- 500 pages published by end of Week 6
- 40% indexing rate at 6 weeks = 200 indexed pages
- Average 15 impressions/month per indexed page = 3,000 impressions
- 2% CTR = 60 clicks/month
- Target: 10% demo request conversion from pSEO clicks = 6 demo requests/month

Traffic Projection (Moderate):
- 60% indexing rate, 25 impressions/page, 3% CTR = 225 clicks/month
- 10% conversion = 22 demo requests/month from pSEO alone by Week 12

---

## DELIVERABLES CHECKLIST

- [x] **Taxonomy:** All dimension values with full context objects (10 contractor types, 10 pain points, 3 sizes, 15 geos, 6 competitors)
- [x] **Combination Matrix:** Tier 1/2/3 priorities defined; estimated 1,400–1,800 total pages
- [x] **Page Type Definitions:** 7 page types fully specified
- [x] **TypeScript Schema Interfaces:** 4 primary schemas (ContractorPain, ContractorGeo, Comparison, PainSize)
- [x] **Generation Prompts:** 4 prompts with system context, injection rules, output rules, and quality tests
- [x] **React Component Specs:** ContractorPainPage and ComparisonPage fully specified; others follow same pattern
- [x] **Supabase Table SQL:** Complete with indexes, RLS, and triggers
- [x] **n8n Workflow:** Full node structure with decision branches and error handling
- [x] **6-Week Rollout Roadmap:** Week-by-week with page counts, GSC signals, and traffic projections
- [x] **Estimated Total Pages:** 1,400–1,800 at full build-out

---

## QUALITY BAR VALIDATION

Random sample test (contractor_pain :: hvac :: cash-flow):

**"Would this page still be useful if search engines didn't exist?"**  
→ Yes. An HVAC contractor evaluating BuildDesk would find real answers about how BuildDesk handles service contract cash flow vs. installation billing — not available anywhere else in this combination.

**"If someone bookmarked this page, would they find it valuable a week later?"**  
→ Yes. The pain_section and how_it_works content speaks to a persistent business problem, not a trending news item.

**"Is there anything on this page that's generic filler rather than specific value?"**  
→ The prompt rules and QC checks specifically prohibit generic content. Contractor-specific pain descriptions are required; forbidden-words list eliminates filler phrases.

**Conclusion:** This system passes the quality bar when prompts and QC checks are followed correctly. The most likely failure mode is generic `contractor_specific_benefit` fields — the quality test in the prompt directly addresses this by requiring regeneration of any benefit that applies equally to two different contractor types.
