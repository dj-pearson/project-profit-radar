<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# can you put this into a document format like MD and then add a nice checklist to the bottom

Below is a cleaned‑up Markdown document version of the guide, with a structured checklist at the end.

***

# iOS App Store Submission \& Optimization Guide

Launching a successful iOS app requires complete, accurate App Store Connect metadata, strong compliance with App Review, privacy, accessibility, and monetization rules, plus strategic use of product pages and events for ASO.[^1][^2][^3]

## 1. Account, Build, and Technical Prerequisites

Before touching metadata, ensure the following are set:[^4][^5][^1]

- Active Apple Developer Program membership with two‑factor authentication enabled.
- App built and archived with a current Xcode version using the latest supported iOS SDK.
- No crashes, major freezes, or obvious bugs in release builds tested on real devices.
- No placeholder or test data, debug logs, or hidden test screens in the production build.


## 2. Core App Store Metadata (App Store Connect)

Every app needs complete App Store Connect metadata before submission.[^4][^1]

- App Information (global):
    - App Name (up to 30 characters, unique in store).
    - Subtitle (short summary under the name).
    - Primary and secondary category.
    - Age rating (via Apple’s content questionnaire).
    - App icon (required sizes per platform).
- Version Information (per version/platform):
    - Description (up to 4,000 characters).
    - Promotional text (editable without new build).
    - Keywords (comma‑separated, not user‑visible).
    - Screenshots for required devices.
    - Optional app previews (video).
- Additional info:
    - Copyright.
    - Contact information for App Review and users.


## 3. Product Page Assets and Copy

Apple expects a complete, accurate, and non‑misleading product page.[^2][^3][^1]

- App name and subtitle:
    - Use concise, human‑readable phrasing with relevant keywords.
    - Avoid price mentions, claims like “\#1,” or competitor names.
- Description:
    - Lead with a strong value prop and key use cases.
    - Use short paragraphs and bullet points for scannability.
- Screenshots and app previews:
    - Show real UI, not mocks; match the current version.
    - Provide device‑specific assets (don’t stretch iPhone shots for iPad).
- Keywords:
    - Relevant search terms, no spam or repetition of app name/category.


## 4. Mandatory URLs and Contact Details

Certain URLs are required and affect approval and trust.[^6][^7][^1]

- Support URL (required):
    - Public page where users can get help or contact support.
- Marketing URL (optional but recommended):
    - Main marketing or product landing page.
- Privacy Policy URL (required if any data is collected):
    - Must describe data collection, use, sharing, and user rights.
- Contact info:
    - Valid email and phone for App Review questions.


## 5. App Review Requirements and Common Rejections

Apps are reviewed against the App Store Review Guidelines across safety, performance, business, design, and legal.[^3][^1]

- Frequent rejection reasons:
    - Crashes or obvious bugs during review.
    - Misleading or incomplete metadata (descriptions, screenshots, keywords).
    - Unclear or missing privacy policy or data disclosures.
    - Missing in‑app account deletion where accounts can be created.
    - Use of private APIs or violating technical restrictions.
- Design/usability issues:
    - Poor navigation, confusing flows, or non‑standard controls.
    - Minimal functionality or “wrapper” apps around a website.


## 6. Metadata Rules and Naming Constraints

Metadata must accurately represent the app and follow strict rules.[^8][^3]

- App name:
    - Max 30 characters; avoid generic or misleading names.
- Prohibited metadata patterns:
    - Prices, discount language, or time‑limited offers in name/screenshots.
    - Competitor names or trademarks you do not own.
    - Unrelated keywords stuffed into name, subtitle, or keyword field.
- Screenshots:
    - No error states or test content.
    - No explicit or prohibited content inconsistent with age rating.


## 7. Privacy Nutrition Label and Data Practices

You must complete the app’s privacy details for every submission.[^9][^1][^2]

- Data disclosure:
    - Types of data collected (e.g., contact info, usage data, identifiers).
    - Whether data is linked to the user’s identity.
    - Whether data is used for tracking across apps/sites.
- Third‑party SDKs:
    - Include data collected by analytics, ads, and other SDKs.
    - Keep disclosures updated as SDKs or behavior change.


## 8. Privacy Policy and In‑App Account Deletion

Apple enforces strong user control over data and accounts.[^10][^11][^1]

- Privacy policy:
    - Required URL in App Store metadata if any data is collected.
    - Should be accessible within the app.
- Account deletion:
    - Apps that let users create an account must allow initiating account deletion inside the app.
    - Deletion should be at least as easy as account creation and clearly labeled.


## 9. Accessibility Expectations

Apps must be broadly usable, and poor accessibility can cause rejections and user churn.[^9][^1][^3]

- VoiceOver and Voice Control:
    - Provide meaningful accessibility labels for controls and images.
    - Ensure UI elements have proper traits and hints.
- Dynamic Type and text:
    - Support system text size settings where appropriate.
    - Avoid tiny fixed‑size text blocks.
- Visual accessibility:
    - Sufficient color contrast for text and important controls.
    - Respect Reduce Motion and other system accessibility settings.
- Focus and navigation:
    - Logical focus order when navigating with VoiceOver or hardware keyboards.
    - Clear indication of current focus state.


## 10. Pricing and Availability

Configure how, where, and at what price the app is offered.[^7][^1][^4]

- Pricing:
    - Choose free or a paid price tier for the app.
    - For paid apps, consider local pricing and perceived value.
- Availability:
    - Select countries/regions where the app is distributed.
    - Optionally schedule availability and limit to certain storefronts.
- Agreements, tax, and banking:
    - Complete Paid Apps agreements and banking/tax details to receive revenue.[^12]


## 11. In‑App Purchases (IAPs) and Subscriptions

Monetization items are configured separately and reviewed individually.[^13][^1][^9]

- IAP product types:
    - Consumable (used once, e.g., coins).
    - Non‑consumable (permanent unlocks).
    - Non‑renewing subscriptions (time‑limited access without auto‑renew).
- Subscriptions:
    - Auto‑renewable subscriptions grouped into subscription groups.
    - Each group and product needs localization and pricing per region.
- Metadata per IAP:
    - Reference name (internal).
    - Product ID (immutable once used).
    - Display name and description (user‑visible).
    - Price tier and availability.


## 12. Offer Codes, Promo Codes, and Discounts

Use codes and offers to support marketing and trials without changing list price.[^14][^1]

- Promo codes:
    - Provide free copies of paid apps or IAPs for testing, reviewers, and partners.
- Offer codes:
    - Configurable discounts or free periods for eligible users.
    - Can target new, existing, or lapsed subscribers/customers.
- Best practices:
    - Align codes with marketing campaigns and track redemption.
    - Avoid mentioning specific code values in static metadata (keep it evergreen).


## 13. In‑App Events

In‑app events promote time‑bound experiences from your product page and discovery surfaces.[^15][^3]

- Event requirements:
    - Must fit defined types (e.g., challenge, competition, live event, major update).
    - Must describe the event itself, not just the app.
    - Have specific start and end times and a clear call‑to‑action.
- Metadata:
    - Event name and short description.
    - Long description, event badge, and media.
    - Indicate whether additional purchases are required.


## 14. Custom Product Pages

Custom product pages let you tailor content to specific audiences and campaigns.[^2][^14][^4]

- Page variants:
    - Up to several alternate pages each with its own screenshots, app previews, and promotional text.
- Use cases:
    - Tailored pages for different user segments (e.g., business vs consumer).
    - Different creatives linked from ad campaigns or web funnels.
- Implementation:
    - Create and name each page in App Store Connect.
    - Use unique URLs in marketing channels to route traffic.


## 15. Product Page Optimization (PPO)

PPO enables A/B testing of key assets directly in App Store Connect.[^1][^4][^2]

- Testable elements:
    - App icon, screenshots, and app previews.
- Experiment setup:
    - Define variants and traffic split.
    - Run for sufficient time to gather statistically meaningful results.
- Best practices:
    - Focus each test on a single hypothesis (e.g., showcasing feature A vs B).
    - Promote winning variants consistently to improve conversion over time.


## 16. ASO Signals: Keywords, Ratings, and Localization

Visibility and ranking depend on metadata relevance and user response.[^3][^9][^1][^2]

- Keywords and search:
    - Use high‑intent, relevant keywords in app name, subtitle, and keyword field.
    - Avoid repeating category names or obvious spam.
- Ratings and reviews:
    - Use Apple’s in‑app rating prompt APIs responsibly after positive moments.
    - Respond to critical reviews via App Store Connect to show support.
- Localization:
    - Localize title, subtitle, description, screenshots, and keywords for top markets.
    - Adapt messaging to local use cases, not just translate text.


## 17. Practical Pre‑Submission Flow

A standard pre‑submission flow reduces friction and rejections.[^16][^17][^9][^1]

- Technical:
    - Test across devices, orientations, dark/light mode, and network conditions.
    - Validate builds with Xcode and confirm correct provisioning profiles.
- App Store Connect:
    - Resolve any “Missing Metadata” or error banners.
    - Ensure all mandatory fields (age rating, export compliance, privacy, pricing) are complete.
- Review readiness:
    - Provide a demo/test account for reviewers if login is required.
    - Ensure backend and third‑party services are production‑ready.

***

# iOS App Store Submission \& Optimization Checklist

Use this as a high‑level checklist before hitting “Submit for Review.”[^8][^9][^1]

## A. Account, Agreements, and Build

- [ ] Apple Developer Program membership is active and 2FA is enabled.
- [ ] Paid Apps / Agreements, Tax, and Banking are completed (for any paid content).[^12]
- [ ] Release build archived with current Xcode and latest iOS SDK.[^5][^4]
- [ ] Build validated in Xcode and successfully uploaded to App Store Connect.[^4][^1]
- [ ] No crashes, major bugs, or placeholder/test data in the production build.[^9][^1]


## B. Core App Store Metadata

- [ ] App Name set (≤30 chars) and unique.[^3]
- [ ] Subtitle written with concise value prop + keywords.[^1][^3]
- [ ] Primary and secondary categories selected correctly.[^17][^1]
- [ ] Age rating questionnaire completed.[^18][^1]
- [ ] App icon uploaded in all required sizes.[^8][^1]


## C. Product Page Content

- [ ] Description clearly explains features, benefits, and key use cases.[^1]
- [ ] Promotional text completed (for time‑sensitive messaging).[^2][^4]
- [ ] Keywords field filled with relevant terms, no spam or repetition.[^3][^1]
- [ ] Screenshots uploaded for all required devices (iPhone, iPad, etc.), no stretched assets.[^18][^1]
- [ ] App previews (video) added if helpful and aligned with real UX.[^1]


## D. URLs, Support, and Legal

- [ ] Support URL points to a working support/contact page.[^6][^1]
- [ ] Marketing URL (if used) points to a live landing page.[^1]
- [ ] Privacy Policy URL present if any data is collected and reflects actual practices.[^10][^1]
- [ ] Contact details for App Review are accurate and monitored.[^9][^1]


## E. Privacy, Permissions, and Account Deletion

- [ ] App privacy “nutrition label” fully completed in App Store Connect.[^2][^1]
- [ ] Third‑party SDK data collection is reflected in privacy disclosures.[^9][^2]
- [ ] Any permission prompts (location, camera, etc.) explain the “why” clearly.[^9]
- [ ] If the app supports account creation, in‑app account deletion flow is implemented and tested.[^11][^10]


## F. Accessibility

- [ ] All tappable elements have meaningful accessibility labels and traits.[^3][^9]
- [ ] Dynamic Type supported where appropriate and text is legible at larger sizes.[^3]
- [ ] Color contrast meets accessibility guidelines for text and important controls.[^3]
- [ ] App respects system accessibility settings (Reduce Motion, etc.).[^1][^3]


## G. Monetization: Pricing, IAP, and Subscriptions

- [ ] Pricing and Availability set (free or paid tier, storefronts selected).[^7][^1]
- [ ] All IAP products created with product IDs, localized names, descriptions, and prices.[^13][^1]
- [ ] Subscription groups configured with localized display names and terms.[^13][^9]
- [ ] Purchase and subscription flows tested with Sandbox/TestFlight accounts.[^9]
- [ ] No external payment methods used for in‑app digital goods where Apple requires IAP.[^3]


## H. Marketing Tools: Codes, Events, and Product Pages

- [ ] Promo codes and/or offer codes generated for launch partners and testing.[^14][^1]
- [ ] Any in‑app events defined with proper metadata, media, and schedule.[^15][^3]
- [ ] Custom product pages created for key campaigns/audiences, with aligned screenshots and copy.[^14][^2]
- [ ] Product Page Optimization experiments planned or configured (icon/screenshots tests).[^2][^1]


## I. ASO and Localization

- [ ] App name, subtitle, and keywords reflect target queries and value props.[^9][^1][^3]
- [ ] High‑priority languages/regions localized (title, description, screenshots, keywords).[^2][^1]
- [ ] In‑app rating prompt integrated and triggered at appropriate positive moments.[^9][^3]


## J. Final Pre‑Submission Review

- [ ] All App Store Connect warnings and errors resolved (no “Missing Metadata”).[^4][^1]
- [ ] Test/demo account credentials added in App Review Information (if login required).[^9]
- [ ] Backend, APIs, and third‑party services are production‑ready and stable.[^16][^1]
- [ ] Release strategy chosen (manual release vs automatic after approval).[^4]
- [ ] “Submit for Review” clicked only after confirming everything above.[^4][^1]

You can drop this Markdown directly into a repo, internal wiki, or Notion and then customize sections (especially ASO, monetization, and accessibility) per app.
<span style="display:none">[^19][^20][^21][^22]</span>

<div align="center">⁂</div>

[^1]: https://blog.appmysite.com/checklist-for-publishing-ios-apps-how-to-prepare-for-submission-on-the-apple-app-store/

[^2]: https://developer.apple.com/app-store/submitting/

[^3]: https://developer.apple.com/app-store/review/guidelines/

[^4]: https://www.mobileaction.co/blog/how-to-use-app-store-connect/

[^5]: https://developer.apple.com/news/upcoming-requirements/

[^6]: https://appinstitute.com/app-store-submission-checklist-for-beginners/

[^7]: https://www.itpathsolutions.com/basic-information-required-to-publish-an-app-in-the-apple-app-store

[^8]: https://github.com/rossbeale/iOS-App-Store-Submission-Checklist

[^9]: https://www.dappinity.com/blog/the-exact-checklist-ios-developers-follow-before-app-store-submission

[^10]: https://www.termsfeed.com/blog/apple-requirement-in-app-deletion-accounts/

[^11]: https://developer.apple.com/news/?id=mdkbobfo

[^12]: https://www.luciq.ai/blog/how-to-submit-app-to-app-store

[^13]: https://www.reddit.com/r/AppDevelopers/comments/1o26fuf/dealing_with_app_store_submission_headaches_my/

[^14]: https://adapty.io/blog/wwdc25-what-apple-announced/

[^15]: https://developer.apple.com/app-store/in-app-events/

[^16]: https://www.bridge-global.com/blog/apple-store-app-submission-checklist/

[^17]: https://www.spaceotechnologies.com/templates/app-store-submission-checklist/

[^18]: https://www.youtube.com/watch?v=EcPdP5dnBa8

[^19]: https://www.cleverchecklist.com/templates/information-and-communication-technology/development-and-programming/ios-app-store-submission-checklist/

[^20]: https://buddyboss.com/resources/wp-content/uploads/2021/11/Apple-App-Store-Publishing-Checklist.pdf

[^21]: https://www.reddit.com/r/iOSProgramming/comments/1l1iekm/app_store_submission_checklist/

[^22]: https://docs.expo.dev/submit/ios/

