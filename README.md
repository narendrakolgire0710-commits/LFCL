# LFCL — Latur Football Champions League, Season 1

A responsive presentation website for LFCL. Venue: **Dadaji Turf, Latur**.

## Run locally
1. Extract the ZIP.
2. Open this folder in VS Code.
3. Open `index.html` with Live Server, or double-click it to preview.

## Visual features
- Cinematic stadium home page with an original animated star-ball intro inspired by big European football nights (not an official UEFA/UCL broadcast clip).
- Your four uploaded football photographs integrated into the hero-side collage and About, Experience, Quiz and Contact backgrounds.
- Animated gallery, glowing rings, photo overlays, colourful lighting, scroll reveals, responsive navigation and interactive football quiz.
- Eight franchise teams with the supplied owners, Dadaji Turf venue link and organiser call links.

## Notes
- The four uploaded photos are bundled locally in `assets`, so they remain available offline. Google Fonts and the original stadium background may load from the internet; CSS gradients and local photos provide fallbacks.
- This is a presentation website only: no registration, login, fixtures, live scores or database.


## Latest visual upgrade
- Replaced text/emoji team emblems with club crest image assets from Wikimedia Commons.
- Added crest float, hover glow, animated heading accents and card polish.
- Existing bundled football photos are used throughout the hero, gallery and section backgrounds.
- Club crest images load from Wikimedia Commons, so an internet connection is needed for those external images.

## Pinterest image note
The three supplied `pin.it` short links could not be resolved in this environment. To place those exact pictures in the website (and bundle them so they work offline), download the images from Pinterest and upload the three image files in ChatGPT. The current build keeps the four football photos already included in the original ZIP.


## LFCL visual identity update
- Added an original LFCL lion tournament crest (SVG) to the homepage and navigation.
- Added a subtle rotating Champions League-inspired starball motif in the hero and experience sections.
- Existing football photographs from the supplied ZIP remain distributed across the hero, about, experience, quiz and contact sections.
- Team crest images use their existing official-source image URLs; an internet connection is required for those remote club crests.


### Latest visual update
- Homepage hero background uses the stadium image supplied in chat (`assets/ucl-stadium-night.jpg`).
- Kept the original LFCL crown/wordmark treatment present in the first supplied ZIP (♛ LFCL); the generated lion SVG from the previous revision has been removed.
- Added animated stadium light sweep, slow cinematic background movement, glowing UCL-inspired starball and entrance motion.

## v3 update
- Champions League starball logo (SVG, animated) added on the Messi trophy photo in the hero.
- New auto-scrolling horizontal "moments" gallery in Experience with all supplied photos (Liverpool, PSG, Messi, MSN trio, Lamine Yamal, Messi World Cup, Ronaldo).
- Quiz section has a horizontal crossfading photo stage that changes with each question.
- More animation: staggered reveals, shimmer headings, count-up stat, floating photos, hover glows, quiz correct/wrong effects.

## v4
- Poster crest (gold lion LFCL medal) cut out as assets/lfcl-logo.png and used in the hero and navigation bar with glow, float, shine and sparkle animation.

## v5
- Bright, colourful multi-theme sections; LFCL crest on the Messi Champions League photo; coverflow Legends gallery; Juventus crest bundled locally (assets/juventus.svg); crest fallbacks; canvas particles, confetti, typed text, split-heading, parallax, tilt and counters in script.js.

## v6
- Unified black/gold/white theme with royal-blue accents on every section.
- Hero now shows only the big animated LFCL crest; the Messi/Ronaldo/trio photos moved into the About photo grid.
- Legends slider auto-scrolls with no controls; Venue uses the turf/stadium photo with animated pitch lines and rolling ball; gold ticker and particle fields added.


## Tournament details added
- Player auction: 19 November, 6:30 PM
- Venue: Dadaji Turf
- First leg: 19 and 20 December
- Second leg: 25, 26 and 27 December
- Match timings: 5 PM to 10 PM for all matches
- Transfer window: 21 December only (one day)
- Organised by: Adv Vijaykumar Jadhav (8999482241) and Mojes Aakhade (7558257812)

## Owner portraits
The ten owner portraits and the Juventus/BVB logo images supplied in the PDF are included locally in `assets/` and displayed on the relevant team cards. Pankaj Bidve remains listed as FC Barcelona owner only and is not listed as an organiser.


Latest polish: refined black-and-gold team directory, live team/owner search (Ctrl/⌘+K), enlarged circular owner/organiser portraits, keyboard-accessible portrait viewer, and improved responsive team cards.


Final portrait update: owner and organiser photos open in a large circular lightbox; organiser cards use compact circular portraits; Rajesh Bhise portrait crop is adjusted to keep his face visible. The two Ronaldo images in the About photo strip are replaced with the user-provided featured image. Juventus and BVB crest images are contained on matching neutral circular backgrounds.

Final visual refinement: the supplied Messi/Barcelona shirt photograph replaces the two Ronaldo gallery moments. Owner and organiser profile photos use circular zoom presentation; organiser cards remain compact circles and open a larger profile view. Rajesh Bhise's tall portrait uses a face-forward crop position.

## Colour harmony pass
- One palette across every section: midnight navy, gold and soft royal blue.
- About section changed from white to navy; Teams heading made readable (was navy on black); pink, teal, lime and green tints replaced with gold/blue in Schedule, Quiz, Venue and Contact.

## Update: Schedule, About and smoothness
- About: duplicate Messi photo replaced with the Ronaldo (Manchester United) image from the assets.
- Schedule: redesigned with navy + gold theme, animated gold border on the auction banner, live auction countdown to 19 November 6:30 PM, staggered card animations, floating icons and a gold "view location" button.
- Smoothness: heavy effects (cursor glow, backdrop blur, orbit animations) are switched off on phones and for reduced-motion users.

## Update: photo framing
- About: the Messi "PURE PASSION" photo is now framed on his face (object-position set so the portrait photo is not cropped to the shirt). Same fix applied wherever that photo is reused.

## Update: smooth performance build
- Images compressed (5.6 MB -> 4.4 MB) and logo converted to WebP (940 KB -> 112 KB).
- Large blurred/blended background layers, per-card backdrop blur, endless text-shimmer and zoom animations removed or made static.
- Animations now pause automatically for sections that are off-screen; particle fields are lighter and stop when not visible.
- Scroll, cursor glow and card-tilt code rewritten to avoid layout work on every event (no more sparkle trail DOM spam).
- Scrolling test: average frame time ~95 ms -> ~38 ms in a software-rendered test browser (real phones/PCs with a GPU are much faster).

## v7 update
- Guests: staggered 3D card entrance, floating cards, rotating gold photo rings, spinning light rays + animated entrance for the Chief Guest, tilt on hover.
- About: "Lifting the Cup" now shows the Özil photo; the next card now shows the Manchester United owner photo.
- Venue: automatic one-at-a-time Dadaji Turf slideshow (4 photos) with wipe transition, zoom, light sweep, captions, dots, progress bar, swipe support. Pauses on hover and when off-screen.

## LFCL final polish
- Sponsor logos are slightly larger and have a subtle hover lift / light sweep.
- The View Fixtures panel and match cards have restrained entrance and hover motion.
- Motion respects the visitor's reduced-motion preference; mobile avoids the extra ambient fixture animation.

## Deploy
This is a static HTML/CSS/JavaScript website. Upload the complete `LFCL_Presentation_Website` folder to Netlify (or drag the extracted folder into Netlify Drop). Keep `index.html`, `style.css`, `script.js`, and the `assets` folder together. No build command or publish directory is required when deploying the folder root.

## Deployment and hosting checks

- This is a static HTML/CSS/JavaScript website. No npm install or build command is required.
- Netlify is configured by `netlify.toml`; the publish directory is the project root (`.`).
- Upload the extracted `LFCL_Presentation_Website` folder to Netlify, or connect the repository containing this folder and set the publish directory to `LFCL_Presentation_Website` if it is nested in the repository.
- The configuration applies long-lived caching to `/assets/*` and revalidation to HTML pages, plus basic browser security headers.
- Keep the `assets` folder beside `index.html`, `style.css`, and `script.js`. Do not upload only the HTML file.
- Google Fonts and some club crest URLs use external hosts; the site can still load its local content if those external services are unavailable. Several club crests have local fallback assets.


## v8 — Bug-fix & smoothness build (final)
**Bugs fixed**
- Fixture crests: inline `onerror` threw `URL is not a constructor`, so failed crests never recovered. Now one delegated fallback handler.
- Fixtures match the official LFCL fixture sheet (M1–M32) exactly.
- Owner/organiser photo click opened the profile modal and the lightbox together; closing one unlocked page scroll. Fixed (ref-counted scroll lock); photos inside modals can now open the lightbox.
- Quiz "Next" fired the "LET THE GAME BEGIN" toast + confetti. Fixed. Quiz stage no longer references missing images.
- Duplicate section number "04" fixed (now 01–08). Quiz counter shows 07 questions from first paint.
- Auction countdown pinned to 19 Nov 2026 6:30 PM IST for all visitors.
- Phone links use +91 format. Loader can no longer hang on slow networks. Menu has aria-expanded/Esc/outside-click close. Added favicon, social meta, focus outlines, search empty state.

**Smoothness**
- Off-screen animations now really pause (hero, teams, guests, loader, hidden modals were all still animating). Tab-hidden pauses everything.
- Removed repaint-heavy loops: guest ring custom-property animation, chief card box-shadow pulse, venue background-position drift, `left`-based shines/rolling ball (now `transform`).
- Hover/tilt no longer inherits reveal stagger delay (cards 5–8 felt laggy).


**Optional:** club crests load from Wikimedia (bundled crude fallbacks if offline). For fully offline use, download the official crests into `assets/` and reference them locally.


## v8.1
- Added Chapsi Foods as the 6th sponsor (3 + 3 layout; 2 per row on phones).
- FC Barcelona owner (Pankaj Bidve) photo replaced with the new portrait.

## v9 — Smoother, same look
- Hero crest glow is pre-rendered into `assets/lfcl-logo-glow.webp` (lossless); star-ball glow is a plain shadow; hero photo colour boost is baked into `assets/hero-stadium.jpg` (q96). No live filters on big animated layers any more.
- Test result (same machine, full-page scroll): average frame time ≈ 37 ms vs ≈ 58 ms for the original upload. All images and animations at full quality.

## v7 changes (league-style animated playoff bracket, compact Fan Zone, refined group fixtures)

### v6 changes (speed pass: minified CSS, non-blocking fonts, unused asset removed; visuals unchanged)

### earlier
- Fan Zone: anthem lyrics scroll as a glowing background (pauses off-screen)
- Experience: Real Madrid "Pure football emotion" re-cropped so player faces show
- Venue: 5th slideshow photo (golden-hour footwork)
- Fixtures: emerald theme for group rounds; violet + gold animated playoff bracket diagram
- Responsive polish for phones, tablets, desktops

## v10 — Final deploy build
- Schedule: fixed the gold line that ran through "02 / THE ROAD TO GLORY" (the section divider was being moved by the LFCL watermark rule; watermark now uses `:after`).
- Teams: one owner system for 1 or 2 owners — equal circular photos, face-centred high-res crops (`owner-*-sq.webp`), "&" link and OWNER / CO-OWNER labels, aligned on every device.
- Playoffs: redesigned navy + gold bracket (Top-4 seeds strip, Stage 1 / Stage 2 / Final / Champion, drawn connectors, responsive vertical flow on phones).
- Removed the endless owner-photo float animation and unused files. Images and other animations are unchanged in quality.

## v5 additions
- Guests: added Sangmesh Bembalge (Administrator, MIT World Peace School, Latur); Adv Naresh Kulkarni is now Vice President, Dayanand Law Alumni Association.
- Background music: assets/lfcl-anthem.mp3 (original file, not re-encoded) loops from the moment the site opens. Top-bar button switches music on/off. If a browser blocks autoplay, the loader shows a one-tap ENTER WITH MUSIC button.
