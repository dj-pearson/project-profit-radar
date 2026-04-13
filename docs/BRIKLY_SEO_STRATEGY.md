# Brikly SEO Strategy — Post-Rebrand Playbook

**Version**: 1.0
**Last Updated**: 2026-04-13
**Owner**: Marketing & Growth
**Canonical Domain**: `https://brikly.net`

---

## 1. Context & Why This Exists

We rebranded from our previous name to **Brikly** due to a trademark conflict. This
document replaces the old SEO strategy and gives the team one clear playbook for:

1. Seeding the Brikly brand from zero authority.
2. Preserving our hard-won category rankings (job costing, Procore alternative, etc.).
3. Migrating database-stored content (blog posts, pSEO pages, schema data) under the
   Brikly name without breaking URLs or losing equity.

---

## 2. Starting Position

| Asset                              | Pre-Rebrand State                | Post-Rebrand Target                  |
| ---------------------------------- | -------------------------------- | ------------------------------------ |
| Primary domain                     | previous-name.com                | **brikly.net**                       |
| Brand search volume                | Established                      | Near zero — must be rebuilt          |
| Category rankings                  | Top-10 for ~40 category terms    | Preserve via 301s + canonical reset  |
| Domain authority                   | Moderate (DR ~25)                | Rebuild by redirect equity + content |
| Indexed pages                      | ~250 (marketing + pSEO + blog)   | All re-indexed under brikly.net      |
| Branded schema (`name`/`sameAs`)   | Old brand references             | All schema updated to `Brikly`       |

**Strategic reality**: nobody is searching "Brikly" yet. Every piece of content we ship
has to (a) rank for a non-branded query and (b) plant the Brikly name in the reader's
head so the next search includes "Brikly" as a qualifier.

---

## 3. Pillars of the New Strategy

### 3.1 Brand Seeding (the urgent one)

Goal: make "Brikly" a known entity to both humans and LLMs in 90 days.

Tactics:

- **Entity-first homepage copy**: Lead with "Brikly is [category]" so every crawler
  (Google, GPTBot, PerplexityBot, ClaudeBot — already allowed in `robots.txt`) can
  associate the Brikly entity with "construction management software".
- **Schema.org `Organization` + `SoftwareApplication`** on every page with
  `name: "Brikly"`, `alternateName`, `sameAs` pointing to LinkedIn/Twitter/YouTube/IG
  Brikly handles. Already wired via `COMPANY_INFO` in `src/config/seoConfig.ts`.
- **Wikipedia + Wikidata entity**: create a Brikly entry referencing press, funding,
  product launches. LLM training sets pull from here heavily.
- **Digital PR**: pitch the rebrand story ("SMB contractor platform rebrands from X
  to Brikly") to Construction Dive, ENR, and ForConstructionPros.
- **G2 / Capterra / Software Advice profiles**: update listing names and request
  review portability where possible.
- **Owned handle consistency**: linkedin.com/company/brikly, @brikly on X,
  @brikly.net Threads, youtube.com/@brikly, instagram.com/brikly.

### 3.2 Equity Preservation (don't lose the category rankings)

- **301 redirects** from every old-domain URL to the matching brikly.net URL.
  Same path, same slug — the only thing that changes is the host.
- **`rel="canonical"`** on every brikly.net page points to itself (already enforced
  by `DynamicSEOOptimizer` / `PageSEO`).
- **Change-of-address in Google Search Console**: file the day the 301s go live.
- **Reverify Bing Webmaster Tools** under the new property.
- **Disavow file**: port over any existing disavow list to the new property.
- **XML sitemap** (`public/sitemap.xml`) now resolves from `https://brikly.net/sitemap.xml`
  — ping both Google and Bing via their sitemap submission endpoints.

### 3.3 Content Retrofit

Every piece of content (database-backed blog posts, static blog MD files, pSEO pages,
knowledge base articles, resource guides) must be updated to:

1. Replace old-brand mentions with "Brikly".
2. Update all outbound links and image paths to `brikly.net`.
3. Refresh `seo_title`, `seo_description`, `meta` JSON to include "Brikly" as a
   brand mention within the first 60 characters.
4. Keep the URL slug identical (URL stability > cosmetic tidiness).

See Section 6 for the database migration that automates this.

### 3.4 Programmatic SEO (pSEO) Realignment

The pSEO system (`pseo_pages`) generates ~thousands of intent-targeted pages from
dimensions: contractor type × pain point × geography × business size × competitor.

Every generated page is now templated around Brikly — `pseo_contractor_types`,
`pseo_pain_points`, `pseo_competitors`, and the `page_schema` JSON all need the
name swap. The migration in Section 6 handles this in-place.

### 3.5 Topical Authority (E-E-A-T)

- **Author bios** on every blog post with LinkedIn link, credentials, and years in
  the construction SaaS space.
- **Case studies with named customers**: convert at least 10 existing customer
  testimonials into long-form case studies hosted on `/resources/case-studies/*`.
- **Original research**: publish "2026 SMB Contractor Benchmark Report" using
  aggregated anonymized Brikly data — highly linkable asset.
- **Expert contributor roundups**: "We asked 27 GCs how they track job cost variance"
  style articles.

### 3.6 AI / LLM Visibility (GEO)

Our `robots.txt` already allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
Applebot-Extended, YouBot, Bingbot. Our `.well-known/llms.txt` is live. To actually
get cited in AI Overviews and chat answers:

- **Answer-first content**: open each article with a 40-80 word direct answer.
- **`FAQPage` schema** on every resource, pricing, and feature page.
- **Comparison tables** with structured data (Procore vs Brikly, Buildertrend vs
  Brikly, CoConstruct vs Brikly) — LLMs love lifting these.
- **Keep `.well-known/llms.txt` synchronized** with feature and pricing changes.

---

## 4. Keyword Targeting (Post-Rebrand)

### 4.1 Branded (currently 0 volume — our job is to create it)

| Keyword                         | Page            | Intent     |
| ------------------------------- | --------------- | ---------- |
| brikly                          | `/` and `/brikly` | Navigational |
| brikly construction software    | `/brikly`       | Navigational |
| brikly pricing                  | `/pricing`      | Commercial |
| brikly reviews                  | `/resources/reviews` (create) | Commercial |
| brikly vs procore               | `/procore-alternative` | Commercial |
| brikly vs buildertrend          | `/brikly-vs-buildertrend-comparison` | Commercial |
| what is brikly                  | `/about`        | Informational |
| brikly login                    | `/auth`         | Navigational |
| brikly app                      | `/mobile`       | Navigational |
| brikly.net                      | `/`             | Navigational |

### 4.2 Category (where we must keep our rankings)

| Cluster                      | Primary target                                    |
| ---------------------------- | ------------------------------------------------- |
| Construction management      | `construction management software`                |
| Job costing                  | `construction job costing software`               |
| Alternatives                 | `procore alternative`, `buildertrend alternative` |
| Trade-specific               | `plumbing contractor software`, etc.              |
| Scheduling                   | `construction scheduling software`                |
| OSHA / Safety                | `osha compliance software`                        |
| Field management             | `construction field management software`          |

### 4.3 Long-tail (pSEO territory)

The pSEO system auto-generates pages targeting `{contractor_type} + {pain_point}` and
`{contractor_type} + {geo}` combinations. No manual work needed beyond keeping the
templates branded correctly — handled by the DB migration.

---

## 5. Technical SEO Checklist (ship within 2 weeks of the rebrand commit)

- [ ] **301 redirect map** deployed at the old domain (Cloudflare worker handles
      every path → `https://brikly.net{path}`).
- [ ] **Canonicals** on every brikly.net page → `https://brikly.net{path}` (verified).
- [ ] **`hreflang`** — none needed while we are US-only (revisit when we expand).
- [ ] **Sitemap** at `https://brikly.net/sitemap.xml` submitted to Google Search
      Console and Bing Webmaster Tools.
- [ ] **`robots.txt`** sitemap directive pointing at `brikly.net` (already updated).
- [ ] **Brand entity schema** (`Organization` with `sameAs`) on every page
      (enforced in `UnifiedSEOSystem`).
- [ ] **Logo redirect**: `/logo.png` and `/BriklyLogo.png` both serve 200s.
- [ ] **Open Graph image** (`/og-image.png`) is regenerated with the Brikly wordmark.
- [ ] **Favicon + manifest** updated (already done in `public/manifest.json`).
- [ ] **Service worker cache** bumped so returning visitors grab the new branding.
- [ ] **Sentry / PostHog project names** renamed so analytics align with the brand.

---

## 6. Database Content Migration

All user-facing content stored in Supabase tables needs the brand swap. The
migration lives at:

```
supabase/migrations/20260413000000_rebrand_content_to_brikly.sql
```

It performs a **single-transaction** `UPDATE` across:

| Table                       | Columns rebranded                               |
| --------------------------- | ----------------------------------------------- |
| `blog_posts`                | `title`, `body`, `excerpt`, `seo_title`, `seo_description` |
| `blog_content_analysis`     | any stored content snippets                     |
| `blog_topic_history`        | `topic`, `description`                          |
| `pseo_pages`                | `seo_title`, `seo_description`, `page_schema` (JSONB) |
| `pseo_contractor_types`     | `display_name`, `context_object` (JSONB)        |
| `pseo_pain_points`          | `display_name`, `context_object`                |
| `pseo_competitors`          | `display_name`, `competitor_profile`            |
| `seo_meta_tags`             | `title`, `description`, `og_title`, `og_description` |
| `seo_configurations`        | any JSONB fields containing brand strings       |
| `knowledge_base_articles`   | `title`, `body`, `excerpt`                      |
| `knowledge_base_categories` | `name`, `description`                           |
| `email_templates`           | `subject`, `body`                               |
| `email_marketing_templates` | `subject`, `body_html`, `body_text`             |
| `social_media_templates`    | `content`                                       |
| `communication_templates`   | `subject`, `body`                               |

**Replacement rules** (case-preserving, applied in this order):

1. `build-desk.com` → `brikly.net`
2. `BuildDesk` → `Brikly`
3. `Build Desk` → `Brikly`
4. `Build-Desk` → `Brikly`
5. `BUILDDESK` → `BRIKLY`
6. `BUILD DESK` → `BRIKLY`
7. `builddesk` → `brikly`
8. `build-desk` → `brikly`

The migration is **idempotent** — re-running it on already-migrated content is a
no-op. A read-only dry-run query is included at the top of the file so the team
can preview the change counts before committing.

Running manually in staging first is **strongly recommended**:

```bash
supabase db push --db-url "$STAGING_DB_URL"
```

After it succeeds, run in production during a low-traffic window (we are US-only,
so 02:00–05:00 ET is ideal).

---

## 7. Rebrand Announcement Content

A new resource post is staged at
`src/content/blog/brikly-rebrand-announcement.md`. It:

- Explains the rebrand in customer-friendly language.
- Reassures customers that pricing, data, logins, and contracts are unchanged.
- Points out new URLs, new support email, and new social handles.
- Targets the branded queries "brikly rebrand", "brikly announcement",
  "brikly new name" to capture early brand searches.

We also:

- Email every active customer on day 0.
- Push a banner on the old-domain 301 landing pages for 30 days.
- Update the in-app welcome tour.

---

## 8. Monitoring & Success Metrics

Track in the SEO dashboard (`src/pages/UnifiedSEODashboard.tsx`) and a new
GrowthBook/PostHog board:

| Metric                               | Day 0 | Day 30 target | Day 90 target |
| ------------------------------------ | ----- | ------------- | ------------- |
| "brikly" branded monthly searches    | 0     | 500           | 3,000         |
| Branded impressions (GSC)            | 0     | 10k           | 75k           |
| Non-branded category impressions     | Baseline | ≥ baseline | +20%          |
| Top-10 category keywords retained    | 40    | ≥ 35          | ≥ 42          |
| Indexed pages on brikly.net          | 0     | ≥ 95% old count | 100%+       |
| Referring domains to brikly.net      | 0     | 50            | 200           |
| Rebrand announcement organic traffic | 0     | 2k sessions   | 5k sessions   |
| LLM citations (monitored via `AIVisibilityMonitoring`) | Baseline | ≥ baseline | +50% |

---

## 9. Risks & Mitigations

| Risk                                       | Mitigation                                                 |
| ------------------------------------------ | ---------------------------------------------------------- |
| Ranking dip in 30-60 day transition window | Aggressive 301s, Search Console change-of-address, focused link outreach |
| LLM caches stale old-brand references      | Updated `.well-known/llms.txt` + resubmit to training crawlers; Perplexity indexer has faster refresh |
| Customer confusion from name swap          | In-app announcement, emails, support macro, 30-day banner  |
| Broken absolute links inside old blog HTML | DB migration rewrites `build-desk.com` → `brikly.net`      |
| Backlinks still pointing at old domain     | Cloudflare worker preserves equity via 301; do manual outreach on top 50 linking domains |

---

## 10. Rollout Timeline

- **Day 0 (this PR)**: code rebrand shipped, SEO config updated, DB migration
  staged, announcement post drafted, sitemap/robots/llms.txt regenerated.
- **Day 1**: deploy to brikly.net, set up 301s from old domain, submit GSC
  change-of-address, ping social handles.
- **Day 7**: run DB migration in production, resubmit sitemap, email customers.
- **Day 30**: first performance review — compare rankings, impressions, branded
  volume against baselines.
- **Day 90**: strategic review — double down on winning clusters, cut losers,
  reinvest in pSEO pages with the highest CTR.

---

## 11. Ownership

- **SEO lead**: owns this document, GSC/Bing properties, rank tracking.
- **Engineering**: owns 301 infrastructure, canonical correctness, sitemap gen.
- **Content**: owns announcement post, customer emails, case studies, blog.
- **Product marketing**: owns brand consistency, schema data, social handles.

Questions or updates: open an issue tagged `seo-rebrand`.
