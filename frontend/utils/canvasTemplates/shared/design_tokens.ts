/**
 * Phase 2 — Compact template family design tokens.
 *
 * Extracted from 85-image analysis of top-performing Instagram carousels
 * (see Docs/design/SLIDE_REFERENCES_FULL.md + PART2 + Docs/design/templates/).
 *
 * These tokens are consumed by the 5 core compact templates:
 *   - aurora-compact-hook
 *   - aurora-compact-fact
 *   - aurora-compact-step
 *   - aurora-compact-list-item
 *   - aurora-compact-quote
 *
 * Compact templates deliberately DIVERGE from the base AURORA/LUMINA
 * tokens in canvasTokens.ts:
 *   - Cream background (not dark)
 *   - Playfair Display Bold Italic for editorial pull quotes
 *   - Inter Black (weight 900) for huge headlines
 *   - Terracotta accent for the quote family
 *   - Peach accent for pills and interactive chrome
 */

export interface CompactTokens {
  // Backgrounds
  bgCream:       string;  // Cream neutral — main compact family background
  bgAccent:      string;  // Terracotta — used by compact-quote only
  bgWhite:       string;  // Pure white — used for photo-caption cards

  // Text
  textDark:      string;  // Near-black — headlines on cream
  textMuted:     string;  // Muted grey — body copy on cream
  textOnAccent:  string;  // Cream — text on terracotta bg (quote family)

  // Interactive chrome
  peach:         string;  // Peach pill background
  peachStroke:   string;  // Peach pill stroke (slightly darker)
  peachText:     string;  // Text inside peach pills

  // Fonts (CSS font stacks with fallback)
  fontDisplay:   string;  // Inter Black — huge headlines
  fontBody:      string;  // Inter (falls back through system sans)
  fontSerif:     string;  // Playfair Display — italic bold pull quotes
  fontMono:      string;  // Monospace label

  // Sizing
  canvasSize:    number;  // 1080 (matches AURORA/LUMINA)
  headlineMax:   number;  // 140pt — biggest a compact headline can go
  headlineMin:   number;  // 52pt — smallest a compact headline should go
  bodyDefault:   number;  // 26pt body copy default

  // Spacing
  padX:          number;  // 88px horizontal safe zone
  padY:          number;  // 96px vertical safe zone

  // Progress dot indicator
  dotSize:       number;  // 8px
  dotGap:        number;  // 12px
  dotColor:      string;  // Neutral grey for inactive dots
  dotColorActive:string;  // Dark near-black for active dot
}

export const COMPACT_TOKENS: CompactTokens = {
  bgCream:        "#F5F0E8",
  bgAccent:       "#C4614A",  // Terracotta — measured from quote references
  bgWhite:        "#FFFFFF",

  textDark:       "#1A1A1A",
  textMuted:      "#6B6B6B",
  textOnAccent:   "#F5F0E8",

  peach:          "#E8CBA3",
  peachStroke:    "#D9B78E",
  peachText:      "#3D2A1A",

  fontDisplay:    "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontBody:       "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontSerif:      "'Playfair Display', Georgia, serif",
  fontMono:       "'SF Mono', 'Menlo', 'Consolas', monospace",

  canvasSize:     1080,
  headlineMax:    140,
  headlineMin:    52,
  bodyDefault:    26,

  padX:           88,
  padY:           96,

  dotSize:        8,
  dotGap:         12,
  dotColor:       "#C9C4BD",
  dotColorActive: "#1A1A1A",
};

// Type helper for template builders that need a subset of tokens
export type CompactTokenKey = keyof CompactTokens;
