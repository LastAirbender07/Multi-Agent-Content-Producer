# Icon Components

Icon-strip / topic-badge / registry helpers.

**Status:** all NEW.

---

## make-aws-icon-strip
**What:** Horizontal row of N rounded-square AWS-service icons (aws wordmark + EC2 + S3 + Lambda + RDS + CloudWatch + IAM, etc.). Cover-only chrome.
**Props:** `{icons: [{service: string}], size: 85, gap: 10, radius: 18, x, y}`
**Ref:** `backend/outputs/slide-references/nextwork/image.png` — 7-icon VPC preview
**Used by:** aurora-nextwork-cover.

## make-aws-icon-registry
**What:** Shipped registry mapping AWS-service key → PNG asset (30+ services).
**Assets:** `backend/assets/icons/aws/` — EC2, S3, Lambda, RDS, DynamoDB, CloudWatch, IAM, VPC, CloudFront, Route 53, API Gateway, ECS, EKS, SNS, SQS, Kinesis, ELB, etc.
**Used by:** make-aws-icon-strip, make-topic-badge, aurora-nextwork-body body slides.

## make-resource-mini-card
**What:** Cyan-outlined name pill for AWS Console resources (e.g. `nextwork-vpc`).
**Props:** `{label, borderColor: "#0FA8B5", fillColor: "#FFFFFF", cornerRadius: 8, size, outlined?: "warn"|"success"|"default"|null}`
**Ref:** `backend/outputs/slide-references/nextwork/image copy 3.png` — VPC + subnet mini-cards
**Used by:** make-aws-console-mockup.

## make-topic-badge
**What:** Small floating service-icon in top-right of body slide. Anchors slide to a parent service. `style: "single-hexagon" | "vertical-icon-stack"`.
**Props:** `{iconUrl OR icons: [...], size, position: "top-right", cornerRadius, style}`
**Ref:**
- `backend/outputs/slide-references/nextwork/image copy 2.png` — VPC purple hexagon
- `backend/outputs/slide-references/nextwork/image copy 7.png` — twin-icon stack (lock + aws)
**Used by:** aurora-nextwork-body.

## make-nextwork-globe-icon
**What:** Thin-line black globe/lattice mark — nextwork brand logomark. ~1px stroke SVG.
**Assets:** `backend/assets/brand/nextwork/globe.svg`
**Used by:** make-brand-cta-card, make-brand-pill (nextwork variant).

## make-company-logo-card-row
**What:** White card w/ N real company logos side-by-side (Google, Cisco, McKinsey, etc.). Social-proof anchor.
**Props:** `{logos: [{name, logoUrl, size}], cardBgColor: "#FFFFFF", cardRadius: 24, x, y, w, h, gap}`
**Ref:** `backend/outputs/slide-references/nextwork/image copy 21.png` — Google + Cisco + McKinsey card
**Used by:** aurora-nextwork-body (authority-list slides).

## make-number-badge
**What:** Numbered circle badge. Two variants:
- `style: "outlined"` — thin stroke, no fill (SahilBloom editorial style)
- `style: "filled"` — coloured fill (compact-list-item / nextwork step colours)
**Props:** `{number, size: 60, borderColor, textColor, fill, style: "outlined"|"filled"}`
**Ref:**
- `backend/outputs/slide-references/SahilBloom/image copy.png` — outlined (items 1-4)
- `backend/outputs/slide-references/nextwork/image copy 2.png` — filled (colour-coded bullets)
**Used by:** aurora-editorial-list-item, aurora-compact-list-item, aurora-compact-step.
