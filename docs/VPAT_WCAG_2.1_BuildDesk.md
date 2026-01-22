# Voluntary Product Accessibility Template (VPAT)
# WCAG 2.1 Level AA Conformance Report

**Product Name:** BuildDesk Construction Management Platform
**Product Version:** 2.4
**Report Date:** January 22, 2026
**Contact:** accessibility@builddesk.com
**Evaluation Methods:** Automated testing (axe-core, Lighthouse, Playwright), manual testing, screen reader testing (NVDA, VoiceOver)

---

## Summary

BuildDesk is committed to providing accessible software that conforms to WCAG 2.1 Level AA standards. This VPAT documents the accessibility features and conformance status of the BuildDesk platform.

**Overall Conformance Level:** WCAG 2.1 Level AA - Supports

---

## Table 1: Success Criteria, Level A

| Criteria | Conformance Level | Remarks and Explanations |
|----------|-------------------|--------------------------|
| **1.1.1 Non-text Content** | Supports | All images have alt attributes. Decorative images use `alt=""` or `role="presentation"`. Icons use `aria-hidden="true"` with accessible text alternatives. |
| **1.2.1 Audio-only and Video-only** | Supports | Not applicable - platform does not include audio-only or video-only content. |
| **1.2.2 Captions (Prerecorded)** | Supports | Not applicable - platform does not include prerecorded video content. |
| **1.2.3 Audio Description or Media Alternative** | Supports | Not applicable - platform does not include prerecorded video content. |
| **1.3.1 Info and Relationships** | Supports | Semantic HTML used throughout. Proper heading hierarchy enforced via ESLint. Forms use proper label associations. Tables have captions and proper headers. ARIA landmarks define page structure. |
| **1.3.2 Meaningful Sequence** | Supports | DOM order matches visual order. Content reads logically with screen readers. |
| **1.3.3 Sensory Characteristics** | Supports | Instructions do not rely solely on color, shape, or location. Status indicators include text and icons. |
| **1.4.1 Use of Color** | Supports | Color is not the only visual means of conveying information. Error states include icons and text. Status indicators use multiple visual cues. |
| **1.4.2 Audio Control** | Supports | Not applicable - platform does not auto-play audio. |
| **2.1.1 Keyboard** | Supports | All functionality accessible via keyboard. Focus trap implemented for modals. Arrow key navigation for lists and tables. Skip links provided. |
| **2.1.2 No Keyboard Trap** | Supports | Focus can be moved away from all components. Escape key closes modals and returns focus. |
| **2.1.4 Character Key Shortcuts** | Supports | Keyboard shortcuts use modifier keys (Alt+Shift). No single-character shortcuts that could be triggered accidentally. |
| **2.2.1 Timing Adjustable** | Supports | No time limits imposed on user interactions. Session timeouts provide warning and extension options. |
| **2.2.2 Pause, Stop, Hide** | Supports | Animations respect `prefers-reduced-motion`. User can enable reduced motion mode. No auto-updating content. |
| **2.3.1 Three Flashes or Below Threshold** | Supports | No content flashes more than three times per second. |
| **2.4.1 Bypass Blocks** | Supports | Skip links allow users to bypass repetitive navigation. Skip to main content, navigation, and search. |
| **2.4.2 Page Titled** | Supports | All pages have descriptive, unique titles. Title updates on route changes. |
| **2.4.3 Focus Order** | Supports | Focus order follows logical reading sequence. Tab order preserved in modals with focus trap. |
| **2.4.4 Link Purpose (In Context)** | Supports | Link text is descriptive. External links marked with icon and sr-only text "(opens in new window)". |
| **2.5.1 Pointer Gestures** | Supports | All functionality available via simple pointer inputs. No complex gestures required. |
| **2.5.2 Pointer Cancellation** | Supports | Actions triggered on up-event. Users can move pointer away to cancel. |
| **2.5.3 Label in Name** | Supports | Accessible names match visible labels. Form inputs have associated labels. |
| **2.5.4 Motion Actuation** | Supports | No motion-activated functionality. All features accessible via standard input. |
| **3.1.1 Language of Page** | Supports | HTML lang attribute set to "en" on all pages. |
| **3.2.1 On Focus** | Supports | No context changes on focus. Navigation predictable. |
| **3.2.2 On Input** | Supports | Form submissions require explicit user action. No automatic context changes. |
| **3.3.1 Error Identification** | Supports | Errors identified with text and icons. Error messages linked to inputs via `aria-describedby`. First error field receives focus. |
| **3.3.2 Labels or Instructions** | Supports | All form inputs have visible labels. Required fields indicated with asterisk and aria-required. Help text provided via aria-describedby. |
| **4.1.1 Parsing** | Supports | HTML validated. No duplicate IDs. Proper nesting of elements. |
| **4.1.2 Name, Role, Value** | Supports | Custom components use appropriate ARIA roles. Name and value exposed via ARIA attributes. State changes announced. |

---

## Table 2: Success Criteria, Level AA

| Criteria | Conformance Level | Remarks and Explanations |
|----------|-------------------|--------------------------|
| **1.2.4 Captions (Live)** | Not Applicable | Platform does not include live video content. |
| **1.2.5 Audio Description (Prerecorded)** | Not Applicable | Platform does not include prerecorded video content. |
| **1.3.4 Orientation** | Supports | Content displays in both portrait and landscape. No orientation restrictions. |
| **1.3.5 Identify Input Purpose** | Supports | Input fields use appropriate autocomplete attributes where applicable. |
| **1.4.3 Contrast (Minimum)** | Supports | Text has minimum 4.5:1 contrast ratio. Large text has 3:1 ratio. High contrast mode available for enhanced visibility. Outdoor mode provides maximum contrast. |
| **1.4.4 Resize Text** | Supports | Text resizable up to 200% without loss of functionality. Font size settings allow small, large, and extra-large text. |
| **1.4.5 Images of Text** | Supports | No images of text used. All text rendered as actual text. |
| **1.4.10 Reflow** | Supports | Content reflows at 320px width without horizontal scrolling. Responsive design adapts to all viewport sizes. |
| **1.4.11 Non-text Contrast** | Supports | UI components and graphical objects have 3:1 contrast ratio. Focus indicators visible against backgrounds. |
| **1.4.12 Text Spacing** | Supports | Content adapts to user-specified text spacing without loss of functionality. |
| **1.4.13 Content on Hover or Focus** | Supports | Tooltips dismissible with Escape. Hover content remains visible while pointer over it. |
| **2.4.5 Multiple Ways** | Supports | Multiple navigation methods: main nav, breadcrumbs, search, site map, direct URLs. |
| **2.4.6 Headings and Labels** | Supports | Headings are descriptive. Labels clearly indicate purpose. Heading order enforced via ESLint. |
| **2.4.7 Focus Visible** | Supports | Focus indicator visible on all interactive elements. Enhanced focus mode available with custom ring styles. |
| **3.1.2 Language of Parts** | Supports | Not applicable - content is in English only. Language attribute would be used if multilingual content added. |
| **3.2.3 Consistent Navigation** | Supports | Navigation consistent across pages. Same structure and order maintained. |
| **3.2.4 Consistent Identification** | Supports | Components with same functionality use consistent labeling. Icon meanings consistent throughout. |
| **3.3.3 Error Suggestion** | Supports | Error messages provide specific suggestions for correction. Validation messages guide users. |
| **3.3.4 Error Prevention (Legal, Financial, Data)** | Supports | Form submissions reviewable before final submission. Delete actions require confirmation. Data changes reversible. |
| **4.1.3 Status Messages** | Supports | Status messages announced via `aria-live` regions. Toast notifications use role="status". Error counts announced to screen readers. |

---

## Table 3: Success Criteria, Level AAA (Partial)

| Criteria | Conformance Level | Remarks and Explanations |
|----------|-------------------|--------------------------|
| **1.4.6 Contrast (Enhanced)** | Partially Supports | High contrast mode achieves 7:1+ ratio for most text. Normal mode uses 4.5:1 minimum. |
| **2.4.8 Location** | Supports | Breadcrumbs indicate current location. Active navigation item highlighted. |
| **2.4.9 Link Purpose (Link Only)** | Supports | Most links have descriptive text. Generic links include context via aria-label. |

---

## Accessibility Features

### Visual Accessibility
- **High Contrast Mode**: Black/white theme with maximum contrast
- **Outdoor Mode**: Enhanced visibility for bright conditions
- **Font Sizes**: Adjustable (normal, large, extra-large)
- **Color-blind Friendly**: Status indicators use icons and patterns, not just color

### Keyboard Accessibility
- **Full Keyboard Navigation**: All features accessible via keyboard
- **Skip Links**: Skip to main content, navigation, search
- **Keyboard Shortcuts**: Alt+Shift combinations for quick access
- **Focus Trap**: Modals trap focus until dismissed
- **Visible Focus**: Ring indicators on all interactive elements

### Screen Reader Support
- **ARIA Landmarks**: header, nav, main, aside, footer
- **Live Regions**: Status announcements via aria-live
- **Descriptive Labels**: All interactive elements labeled
- **Semantic HTML**: Proper heading hierarchy, lists, tables

### Mobile Accessibility
- **Touch Targets**: Minimum 44x44px touch targets
- **Responsive Design**: Adapts to all screen sizes
- **VoiceOver/TalkBack**: Compatible with mobile screen readers
- **Pinch-to-Zoom**: Not restricted

### User Preferences
- **Reduced Motion**: Respects prefers-reduced-motion
- **Persistent Settings**: Preferences stored in localStorage
- **System Detection**: Auto-detects system accessibility preferences

---

## Testing Methodology

### Automated Testing
- **axe-core**: WCAG 2.1 AA rule set
- **ESLint jsx-a11y**: 27 accessibility rules enforced
- **Lighthouse**: Accessibility audits in CI/CD
- **Playwright**: Automated accessibility tester with 10 rule checks

### Manual Testing
- **Keyboard Navigation**: All features tested keyboard-only
- **Screen Readers**: NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android)
- **High Contrast**: Windows High Contrast mode compatibility
- **Zoom**: 200% browser zoom functionality verified

### User Testing
- **User Feedback**: Continuous feedback incorporated
- **Accessibility Panel**: User-facing settings tested with diverse users

---

## Known Limitations

1. **Third-Party Content**: Some embedded content (maps, videos) from third-party providers may have limited accessibility. We work with providers to improve.

2. **Complex Data Visualizations**: Charts include alt text descriptions. Full data available via downloadable tables.

3. **PDF Documents**: Some legacy PDFs may not be fully accessible. Contact us for accessible alternatives.

---

## Remediation Process

1. **Issue Identification**: Automated and manual testing identify issues
2. **Prioritization**: Critical/serious issues prioritized
3. **Resolution**: Issues addressed in development sprints
4. **Verification**: Fixes verified through testing
5. **Documentation**: Changes documented in release notes

---

## Contact Information

**Accessibility Feedback:**
- Email: accessibility@builddesk.com
- Phone: 1-800-BUILD-DK (1-800-284-5335)
- Response Time: 2 business days

**Accessibility Statement:** https://builddesk.com/accessibility-statement
**Accessibility Settings:** https://builddesk.com/accessibility

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 22, 2026 | Initial VPAT publication |

---

*This VPAT is based on the ITI VPAT 2.4 template and documents conformance to WCAG 2.1 Level AA.*
