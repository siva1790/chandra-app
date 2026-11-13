# Learn guide review

Status: user-approved for production deployment.
Production URL: https://chandrapanchang.app/learn/panchang-basics
Reviewed locally at: http://127.0.0.1:5177/learn/panchang-basics

## Implementation

- The dedicated guide is prerendered at /learn/panchang-basics, with independent title, description, canonical and social metadata, a sitemap entry and production routing. Slash/index.html variants redirect to the canonical path in Vercel configuration; unknown Learn paths return 404 in local preview.
- All eight topic bodies are present in initial HTML. Native details/summary elements work without JavaScript for individual topics. Topics begin collapsed; any directly linked topic opens and receives focus after hydration.
- A compact “What you’ll learn” overview names the eight subject areas. Topic headers show 01–08 numbering and a short outcome description, visible before opening. The overview is descriptive rather than a second index.
- The separate index was replaced by topic accordions. Several topics can remain open. Expand all / Collapse all affects the eight main topics; the existing glossary controls remain independent.
- Public links use fragments such as #pancha-anga. City pages link to the dedicated guide. Existing /#learn/<topic> links continue to open the shared accordion guide inside the app, preserving in-app return context.
- The dedicated page has a separate client entry and does not mount app settings, profile, subscription or Firebase providers. It does not change stored preferences.
- The service worker uses network HTML for the dedicated route and caches visited pages for offline fallback, rather than serving the app homepage.

## Design-system verification

Reference: chandra-design-system.html. The reading frame stays capped at 760px.
Existing token colors are retained: gold #DDBB6A, primary background #0B1020,
surface #151B2F, elevated #1D2440, primary text #F5F7FA and secondary #B5BDD1.
Cards remain 16px; icon hit areas 8px; controls/insets 12px. Summary controls
have at least 64px height, a visible focus outline and native keyboard support.

## Validation

- Production build and radius policy passed (40 source files).
- Targeted ESLint passed for the Learn components, entries, route helper and Vite config.
- Nine production HTML/build tests passed: all city pages plus Learn's prerendered content, metadata, assets, canonical variants and sitemap.
- Collapsed and expanded topic layouts were checked at 320, 390, 767, 768, 800, 1023, 1024 and 1440px: no horizontal overflow; reading width capped at 760px; 16px card corners retained.
- The overview update was checked at those eight widths in collapsed and expanded states: all eight descriptions remain visible, numbering runs 01–08, and no horizontal overflow occurs. Updated preview images are learn-overview-desktop.png, learn-overview-tablet.png and learn-overview-mobile.png, with learn-overview-validation.json measurements.
- Verified two topics open together, keyboard Space closes a topic, Expand all opens eight, and Collapse all closes all eight.
- Direct #calendar-system opened its topic and focused its summary, with its top below the sticky Back bar.
- Legacy /#learn/nakshatra opened Nakshatra; its Back button returned to Day View.
- The city-page learning link opened the new URL and Pancha Anga topic.
- Browser console check showed no warnings or hydration errors.
- HTTP checks: canonical and index.html preview URLs returned 200 with eight prerendered summaries; /learn/unknown returned 404.

Screenshots and browser measurements are in the chat visualization folder:
learn-accordions-desktop.png, learn-accordions-tablet.png,
learn-accordions-mobile.png and learn-accordions-validation.json.
The broader automated screenshot-comparison suite remains unimplemented;
visual review was performed manually using browser screenshots.
