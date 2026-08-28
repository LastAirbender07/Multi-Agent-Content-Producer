# Mockup Components

UI-fakes (fake screenshots of real apps) rendered in Fabric primitives. Each is a self-contained composite that can slot into a `heroEmbed` or body zone.

**Status:** all NEW unless noted.

---

## make-aws-console-mockup
**What:** White card w/ Preview-panel header + N resource mini-cards + L-shape connector lines mimicking real AWS Console UI. All Fabric primitives, no PNG.
**Props:** `{panelTitle, leftPanel, rightPanel, connectorColor: "#0FA8B5" cyan, x, y, width, height}`
**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 3.png` — VPC + 3 subnets tree
- `backend/outputs/slide-references/nextwork/image copy 5.png` — Security-group rules table
- `backend/outputs/slide-references/nextwork/image copy 7.png` — Subnets list
**Used by:** aurora-nextwork-body.

## make-browser-window-mockup
**What:** Generic web-app-in-browser mockup: macOS traffic-lights + URL pill + arbitrary content group inside.
**Props:** `{url, titleBarStyle: "macos"|"chrome"|"safari", contentEmbed: FabricGroup, width, height, x, y}`
**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 8.png` — nextwork.ai product mockup
- `backend/outputs/slide-references/nextwork/image copy 18.png` — Rezi.ai
- `backend/outputs/slide-references/nextwork/image copy 19.png` — Novorésumé
**Used by:** aurora-nextwork-cover (close-CTA), aurora-nextwork-body (myth/stat slides).

## make-terminal-mockup
**What:** Dark near-black card + traffic-lights + monospace lines w/ syntax colouring. Optional embedded success-card.
**Props:** `{title, lines: [{text, syntax: "commit-hash"|"graph-line"|"message"|"dimmed"}], successCard?: {icon, headline, subline}, cardFillColor: "#1E1E1E", x, y, w, h}`
**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 30.png` — `git log --graph`
- `backend/outputs/slide-references/nextwork/image copy 31.png` — `docker ps` table output
- `backend/outputs/slide-references/nextwork/image copy 33.png` — `kubectl get pods`
**Used by:** aurora-nextwork-body (Platform Engineer body slides).

## make-dashboard-mockup-card
**What:** Chrome + status-pills + application-tree diagram. Argo CD-style dashboard.
**Props:** `{chromeTitle, chromeSubtitle, statusPills: [{label, tone}], tree: {root, children}, cardFillColor: "#1E1E1E", x, y, w, h}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 32.png` — Argo CD Application/Deployment/Service tree
**Used by:** aurora-nextwork-body.

## make-dashboard-kpi-grid
**What:** Dark card w/ 2×2 KPI grid + status pill. DORA metrics-style.
**Props:** `{chromeTitle, chromeSubtitle, chromeStatusPill, kpis: [{label, value, valueColor: "white"|"mint"|"warn"}], gridColumns: 2|3, cardFillColor, x, y, w, h}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 36.png` — DORA KPI grid
**Used by:** aurora-nextwork-body (KPI capstone slide).

## make-form-mockup-card
**What:** White card w/ dark title-bar + N labelled input fields (optional highlighted field) + helper text + orange CTA button.
**Props:** `{chromeStyle: "dark-title-bar", brandIcon, brandName, subtitle, fields: [{label, value, highlighted?, backgroundTint?}], helperText, ctaButton: {label, color}, x, y, w, h}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 34.png` — Backstage service-scaffolder form
**Used by:** aurora-nextwork-body (Golden paths).

## make-imessage-mockup
**What:** iPhone iMessage screen — status bar + blue/grey bubbles + optional emoji-picker keyboard PNG.
**Props:** `{wallpaperUrl, statusBarTime, messages: [{text, sender: "user"|"other"}], emojiPickerOpen?}`
**Ref PNGs:** `backend/outputs/slide-references/others/image copy 7.png` — `WHAT'S THE VIBE`
**Used by:** aurora-carousel-cover-hero (imessage variant).

## make-calendar-mockup
**What:** iPhone Calendar w/ month grid + polaroid-taped photos on specific days.
**Props:** `{monthLabel, year, photos: [{day, url, tilt}], baseImageUrl, footerLabel}`
**Ref PNGs:** `backend/outputs/slide-references/others/image copy 5.png` — `CHECK MY CALENDAR`
**Used by:** aurora-carousel-cover-hero (calendar variant).

## make-ig-post-chrome
**What:** IG-post-preview UI: post-header (avatar + handle) + footer (heart/comment/share/bookmark + boost button).
**Props:** `{handle, subtitle, showBoostButton, footerIcons}`
**Ref PNGs:** `backend/outputs/slide-references/others/image copy 6.png` — `HOLD & SCROLL` embedded post preview
**Used by:** aurora-annotated-example.

## make-tweet-slide
**What:** Whole tweet-as-slide: circular avatar + display name + blue checkmark + @handle + tweet body.
**Props:** `{avatar, displayName, handle, verified: boolean, body, style: "twitter"|"x", showFooter?: boolean}`
**Ref PNGs:** `backend/outputs/slide-references/SahilBloom/image copy 3.png` — SahilBloom tweet
**Used by:** aurora-editorial-quote-tweet.

## make-verified-badge
**What:** SVG blue-and-white Twitter checkmark badge (or black X variant).
**Props:** `{style: "twitter-blue"|"x-black", size}`
**Ref PNGs:** `backend/outputs/slide-references/SahilBloom/image copy 3.png`
**Used by:** make-tweet-slide.

## make-overlapping-mockup-pair
**What:** 2 dark mockup cards w/ rotational offset (±2°) + overlap (~30-45%). "Stacked index cards" hero.
**Props:** `{backCard: {type, content, tilt: -2}, frontCard: {type, content, tilt: +2, overlapPct: 40}}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 33.png` — kubectl-terminal + Crossplane-YAML overlap
**Used by:** aurora-nextwork-body (overlapping-mockups bodyLayout).

## make-mockup-chrome
**What:** Unified chrome primitive for all mockup types. `style: "mac-traffic-lights" | "dark-title-bar" | "browser-url" | "no-chrome"`.
**Used by:** all mockups above.

## make-tilted-phone-mockup
**What:** iPhone silhouette (rounded-rect body + notch + speaker + home indicator) with a screen slot that can hold an image, GIF, or nested Fabric group. The **whole mockup group is rotated** (default `-6 deg`) and has a drop shadow. Designed to be placed at the **left ~40%** of a container and to **intentionally overflow** that container's boundary.
**Props:**
```ts
{
  screenImage: string | FabricImage | FabricGroup,   // fills the screen slot, cover-fitted
  overlayCards?: Array<{
    x: number, y: number,       // relative to screen slot
    width: number, height: number,
    content: FabricGroup,       // e.g. a mocked IG comment card
  }>,
  tilt: number,                 // default -6; positive = clockwise
  phoneFrameColor: "#111111",
  phoneFrameThickness: 12,
  cornerRadius: 60,             // outer corner radius (iPhone-style)
  width: 360,                   // phone body width
  height: 780,                  // phone body height (~2.16 aspect)
  shadow: { y: 12, blur: 36, opacity: 0.25 },
  x: number, y: number,         // group top-left before rotation
  allowOverflow: true,          // do not clip to parent bounds
}
```
**Ref PNGs:**
- `backend/outputs/slide-references/others/image copy 3.png` — "Fake Post" — iPhone with 2 overlay comment cards on top of a Reel-frame screen.
- `backend/outputs/slide-references/others/image copy 6.png` — "Hold & Scroll" (variant with different overlays).
**Used by:** `aurora-carousel-cover-hero` (`mockupType: "phone-post"`).
**Contract:**
- The rotation MUST apply to the entire group (frame + screen + shadow + overlays), not just the frame.
- The screen slot is a clipped rounded-rect region; `screenImage` is `cover`-fitted inside it.
- `overlayCards` render **above** the screen but **inside** the rotated group so they tilt with the phone.

## make-tilted-image-pair
**What:** Two rounded-corner images stacked with independent tilts (default `[-6 deg, +4 deg]`) and a small overlap — used for the "Google, Where Am I?" variant where the mockup is not a phone but a paper-cutout + tablet-screenshot combo.
**Props:**
```ts
{
  images: [
    { src: string, tilt: number, width: number, height: number, cornerRadius: number, shadow?: {...} },
    { src: string, tilt: number, width: number, height: number, cornerRadius: number, shadow?: {...} },
  ],
  overlapPct: 20,              // second image overlaps the first by ~20% of its width
  x: number, y: number,        // top-left of the pair's bounding group before rotation
  allowOverflow: true,
}
```
**Ref PNGs:**
- `backend/outputs/slide-references/others/image copy 4.png` — "Google, Where Am I?" — paper-cutout of a person + tablet mockup showing a Google-Images result grid.
**Used by:** `aurora-carousel-cover-hero` (`mockupType: "image-pair"`).
**Contract:**
- Each image is a rounded-rect-clipped `FabricImage`. Both must have independent drop shadows to sell the 3D-stacked feel.
- Group's overall bbox may exceed the parent card — do not clip.
