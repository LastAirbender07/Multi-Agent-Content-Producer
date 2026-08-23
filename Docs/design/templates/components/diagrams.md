# Diagram Components

Flow / architecture / annotation primitives for building teaching diagrams.

**Status:** all NEW.

---

## make-vpc-boundary-box
**What:** Dashed rounded-rect (mint stroke, ~3px, dash `[8,6]`) w/ optional purple hexagon icon + "your VPC" label at top-left. Represents any "logical container" (VPC, subnet, availability zone, security group, K8s namespace, Docker container).
**Props:** `{label, hexagonIconUrl, dashStroke: "#4AC48D", dashPattern: [8,6], cornerRadius: 18, children, x, y, w, h}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy.png` — VPC boundary in concept-contrast
**Used by:** aurora-compact-comparison, aurora-nextwork-body.

## make-concept-contrast-diagram
**What:** 2-column layout builder for "without X vs with X" teaching. Each column: header + shared-input pill + directional arrow (colour-coded) + main icon + optional boundary + outcome caption.
**Props:** `{leftColumn, rightColumn, gap, x, y, width, height}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy.png` — without/with VPC
**Used by:** aurora-compact-comparison, aurora-nextwork-body.

## make-client-server-loop-diagram
**What:** 2-node request/response loop. Client (left box) + arrows (labeled "request" / "response") + Server (right box) + italic caption below.
**Props:** `{clientLabel, serverLabel, requestArrowLabel, responseArrowLabel, captionText, cardFillColor: "#F0EAD8", x, y, width, height}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 24.png` — System Design Basics slide
**Used by:** aurora-nextwork-body.

## make-load-balancer-fanout-diagram
**What:** 1-to-N distribution visual: real-brand logo top + fanout lines + N destination boxes + caption.
**Props:** `{balancerIcon, balancerLabel, serverBoxes: [{label}], fanoutStrokeColor, cardFillColor: "#F0EAD8", caption, x, y, w, h}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 25.png` — NGINX → 3 Server boxes
**Used by:** aurora-nextwork-body.

## make-request-flow-comparison-card
**What:** 2 side-by-side cards teaching stateful vs stateless (request-in / reply-out flows). One card has mint reply-out arrow (allowed), other has red-X reply-out arrow (blocked).
**Props:** `{title, subtitle, accentColor, requestInArrow, replyOutArrow: {color, blocked?}, outcomeCaption}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 6.png` — Security groups vs Network ACLs
**Used by:** aurora-nextwork-body (comparison-diagram).

## make-architecture-flow-diagram
**What:** Top-down flow of N ordered stages w/ directional arrows + optional boundary containers grouping child stages + highlighted vs dimmed states.
**Props:** `{stages: [{type: "pill"|"subnet-card"|"container-boundary", label, style: "default"|"highlighted"|"dimmed", children?, arrowToNext?: {color, style}}], x, y, width, gap}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 4.png` — internet → gateway → VPC(subnets)
**Used by:** aurora-nextwork-body.

## make-app-tree-diagram
**What:** Parent-node → N-children fan-out w/ right-angle-elbow connectors. Argo CD-style.
**Props:** `{root: {label, sublabel}, children: [{label, status}], connectorStyle: "right-angle-elbow"|"curved"}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 32.png` — Argo CD Application tree
**Used by:** make-dashboard-mockup-card.

## make-labelled-box
**What:** Generic labelled rectangle node for diagram building. `variant: "default"|"inverse"|"highlighted"|"dimmed"`.
**Props:** `{label, fillColor, borderColor, textColor, cornerRadius, padding, variant}`
**Used by:** all diagram builders above.

## make-tree-fanout-connector
**What:** Thin hairlines fanning from single point to N target points, w/ small terminal dots.
**Props:** `{from: {x,y}, to: [{x,y}], strokeColor, strokeWidth, terminationDot: boolean}`
**Used by:** make-load-balancer-fanout-diagram, make-app-tree-diagram.

## make-connector-l-shape
**What:** L-shape orthogonal connector for tree/hierarchy diagrams (goes right, then vertical, then right).
**Props:** `{from: {x,y}, to: {x,y}, stroke, strokeWidth}`
**Used by:** AWS Console mockup (VPC → subnets tree).

## make-doodle-arrow
**What:** Pen-stroke curved arrow (SVG path). Variants: `curve-right`, `curve-left`, `swoop-down`, `underline`, `zigzag`, `loop`.
**Props:** `{variant, angle, color, strokeWidth, size, x, y}`
**Ref PNGs:** `backend/outputs/slide-references/others/image copy 6.png` — pen-stroke curved arrow to mockup
**Used by:** aurora-compact-annotated-shot, aurora-annotated-example.

## make-hand-drawn-callout-arrow
**What:** Curved Bézier arrow (with slight hand-drawn jitter) linking annotation label to target on a mockup.
**Props:** `{from: {x,y}, to: {x,y}, style: "pen-stroke"|"pencil"|"marker", color, strokeWidth, curl?: boolean}`
**Ref PNGs:**
- `backend/outputs/slide-references/claude/image copy.png` — protein binder annotations
- `backend/outputs/slide-references/nextwork/image copy 5.png` — Security-group red arrow
**Used by:** make-handwritten-annotation.

## make-highlight-circle
**What:** Rough hand-drawn ellipse (imperfect closure, marker-like feel) annotating a specific region.
**Props:** `{color: "#E85582" pink | "#E4C93C" yellow | custom, roughness, angle, width, height, x, y}`
**Ref PNGs:** `backend/outputs/slide-references/others/image copy 6.png` — pink highlight circle around IG dots
**Used by:** aurora-compact-annotated-shot.
**Fabric:** SVG path with `strokeLineCap: 'round'`, slight jitter, `fill: 'none'`.
