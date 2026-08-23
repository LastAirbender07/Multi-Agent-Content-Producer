# Card Components

Bounded content containers. Each entry: description, prop signature, reference PNGs, families that use it.

**Status:** `NEW` / `EXTEND` `shared/*.ts` / `EXISTS`.

---

## make-brand-pill
**Status:** NEW / EXTEND `shared/brand.ts`.
**What:** White rounded-pill w/ hexagon logomark + wordmark. Bottom-left of branded slides.
**Props:** `{logoUrl, wordmark, textColor, bgColor, height, padding, x, y}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image.png` — `nextwork` logomark + wordmark
**Used by:** aurora-compact-*, aurora-nextwork-cover.

## make-url-cta-pill
**Status:** NEW.
**What:** Dark near-black rounded-pill w/ URL in white Bold. Final-slide CTA.
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 8.png` — `nextwork.ai`
**Used by:** aurora-nextwork-body (close-CTA).

## make-name-card
**Status:** NEW.
**What:** Chunky cream card w/ huge Bold first/last name stacked.
**Props:** `{firstName, lastName, cardBgColor: "#F0DFB8", cardRadius: 24, textColor: "#1A1A1A", fontSize: 110, x, y}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 15.png` — Dhatri name card
**Used by:** aurora-nextwork-spotlight-body.

## make-portrait-card
**Status:** NEW.
**What:** Rectangular portrait w/ rounded corners (~20px). Studio headshot.
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 15.png` — Dhatri portrait
**Used by:** aurora-nextwork-spotlight-body.

## make-avatar-chip
**Status:** NEW.
**What:** Small circular avatar (~90px) w/ duotone-processed portrait on coral bg.
**Props:** `{portraitUrl, size: 90, bgColor: "#D46A5E", duotoneHighlight: "#F5EFE0", duotoneShadow: "#8A3A32", x, y}`
**Ref PNGs:**
- `backend/outputs/slide-references/claude/image copy 12.png` — Hofmann + Alistarh avatar chips
- `backend/outputs/slide-references/SahilBloom/image copy 3.png` — tweet avatar
**Used by:** aurora-editorial-quote-tweet, aurora-product-body (stacked-quotes).

## make-portrait-cutout
**Status:** NEW.
**What:** Duotone silhouette (bg removed) composited on coral slide bg. Full-body, no frame.
**Props:** `{subjectImage, duotoneHighlight, duotoneShadow, silhouetteMaskPath, x, y, widthFraction}`
**Ref PNGs:**
- `backend/outputs/slide-references/claude/image copy 10.png` — Dan Alistarh
- `backend/outputs/slide-references/claude/image copy 11.png` — Thomas Hofmann
**Used by:** aurora-compact-quote, aurora-product-body (pull-quote).
**Notes:** MVP = user pre-masked PNG. Phase 4+ = server-side `rembg`.

## make-description-card
**Status:** NEW.
**What:** Cream rounded card w/ burnt-orange Q&A header + body.
**Props:** `{headerQuestion, body, headerColor: "#B85A25", cardBgColor: "#F0DFB8", cardRadius: 14, x, y, w, h}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 15.png` — `Why Dhatri's group?`
**Used by:** aurora-nextwork-spotlight-body.

## make-pull-quote-card
**Status:** NEW.
**What:** Burnt-orange card w/ big cream quote mark + quote body + attribution.
**Props:** `{quote, attribution, cardBgColor: "#B85A25", textColor: "#F5E8D0", fontFamily: "Fraunces"|"Playfair", x, y, w, h}`
**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 15.png` — Dhatri quote card
- `backend/outputs/slide-references/claude/image copy 10.png` — full-slide coral pull-quote
**Used by:** aurora-compact-quote, aurora-nextwork-spotlight-body, aurora-product-body.

## make-brand-cta-card
**Status:** NEW.
**What:** Cream card + globe icon + 2-line pitch + inline yellow pill on final noun.
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 22.png` — nextwork close-CTA card
**Used by:** aurora-nextwork-body (takeaway-recap).

## make-stat-callout-card
**Status:** NEW.
**What:** Dark rounded rect w/ big yellow stat + Bold description + citation.
**Props:** `{stat, statColor: "#E4C93C", description, citation?, cardBgColor: "#1E1E1A", cardRadius: 20, x, y, w, h}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 10.png` — `$112,521`
**Used by:** aurora-nextwork-body (thesis-with-data-callout-card).

## make-tornpaper-card
**Status:** NEW.
**What:** White card w/ jagged torn top-edge. Optional shadow.
**Props:** `{width, height, fillColor, tearEdge: "top"|"bottom"|"both", shadow, x, y}`
**Ref PNGs:** `backend/outputs/slide-references/others/image copy 6.png` — `THIS IS A / Template` torn card
**Used by:** aurora-annotated-example.
**Fabric:** Jagged polyline `Path` OR PNG mask overlay.

## make-framed-illustration
**Status:** NEW.
**What:** FabricImage w/ thin rectangular stroke frame. WSJ book-plate aesthetic.
**Props:** `{url, x, y, width, height, frameStroke: "#000000", frameStrokeWidth: 3}`
**Ref PNGs:**
- `backend/outputs/slide-references/SahilBloom/image copy 4.png` — "Frog Pond Effect"
- `backend/outputs/slide-references/SahilBloom/image copy 5.png` — schematic chart embed
**Used by:** aurora-editorial-cover, aurora-essay-body, aurora-editorial-list-item.
