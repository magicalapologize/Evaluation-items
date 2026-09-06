---
name: 云渡测评实验室 · 天赋挖掘测试
description: A calm instrument panel for noticing eight recurring talent tendencies.
colors:
  ink-navy: "#142A43"
  mineral-blue: "#2D84C6"
  mist: "#F5F8F6"
  chartreuse: "#C7E83E"
  coral: "#FF8A65"
  paper-white: "#FFFFFF"
  rule: "#DDE7E4"
  soft-text: "#C8D8D5"
  muted-text: "#AFC3BF"
  error: "#C95744"
  progress-track: "#365269"
  active-mist: "#E9F7F4"
  translucent-signal: "#2CB7A522"
  translucent-signal-border: "#2CB7A566"
typography:
  display:
    fontFamily: "Avenir Next, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "clamp(3rem, 7vw, 5.125rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "normal"
  body:
    fontFamily: "Avenir Next, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "normal"
  label:
    fontFamily: "Avenir Next, Helvetica Neue, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.mineral-blue}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "52px"
  card-surface:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: 天赋挖掘测试

## Overview

**Creative North Star: “Editorial Instrument Panel”**

This product should feel like a well-made field notebook crossed with a small data instrument. It gives users enough visual evidence to trust the result, then gets out of the way so the questions and report can be read. The new world replaces the inherited quiz-template composition with an editorial split cover, measured spacing, thin rules, and data-led cards.

The experience is persuasive on the cover and operational during the test. It uses the supplied illustrated assets as evidence of the subject, while the interface itself stays quiet and precise. Saturated color is reserved for meaningful state: the main action, the strongest talent signal, and the report's key navigation.

**Key Characteristics:**
- Ink navy field with mineral-blue panels
- Pale mist content surfaces and hairline rules
- Chartreuse signal color used sparingly for emphasis
- Compact uppercase labels and generous reading width
- Flat cards with restrained 6–8px corners

## Colors

The palette pairs a trustworthy ink field with a clear, mineral blue and one chartreuse signal. Coral is reserved for action guidance, never for general decoration.

### Primary
- **Mineral Blue** (#2D84C6): Primary buttons, progress, and active report signals.
- **Ink Navy** (#142A43): Hero fields, report headers, and high-contrast CTA areas.

### Tertiary
- **Chartreuse Signal** (#C7E83E): Labels, key numbers, and moments that deserve attention.
- **Coral Note** (#FF8A65): Numbered advice markers and small corrective cues.

### Neutral
- **Paper White** (#FFFFFF): Reading surfaces and form cards.
- **Pale Mist** (#F5F8F6): Page ground and secondary cards.
- **Rule Green** (#DDE7E4): Dividers and progress tracks.

### Named Rules
**The Signal-Only Rule.** Chartreuse and coral should point to meaning or action; they are never used as ambient decoration.

## Typography

**Display Font:** Avenir Next with Helvetica Neue and Chinese system fallbacks
**Body Font:** Avenir Next with PingFang SC / Microsoft YaHei fallbacks
**Label Font:** Same family, compact uppercase treatment

**Character:** Avenir's open geometry gives the Chinese interface a clean, contemporary rhythm without the generic Inter look. Heavy display weight is paired with readable, relaxed body copy.

### Hierarchy
- **Display** (800, `clamp(3rem, 7vw, 5.125rem)`, 1.05): Hero promise and result identity.
- **Headline** (800, 26–34px, 1.25): Section titles and report modules.
- **Title** (800, 18–22px, 1.4): Cards, form headings, and question prompts.
- **Body** (400, 15–18px, 1.7–1.8): Explanations and report prose; keep line length near 65ch.
- **Label** (800, 12px, 0.08em): Product index, progress context, and metadata.

## Layout

The cover uses a two-column editorial split with a constrained 1180px shell. The left column carries the proposition and proof numbers; the right column carries the supplied illustration and access form. The quiz narrows to a 900px reading column. The report uses a 1100px white sheet with generous section rhythm and a single vertical reading axis.

At widths below 760px, columns collapse into a single flow, the access form becomes stacked, answer targets remain at least 60px high, report actions become a two-column grid, and cards reduce internal padding without shrinking type into illegibility.

## Elevation & Depth

Depth comes from tonal layering and hard edges, not floating shadows. Navy establishes the outer field, white establishes reading surfaces, and mist cards separate secondary information. Borders remain visible at rest so the report reads like a printed instrument sheet.

## Shapes

The language is rectangular with softened 6px controls and 8px shells. Images clip to the shell radius. Dividers are hairlines. Avoid pills except for short report tags where grouping is necessary.

## Components

### Buttons
- **Shape:** Compact rectangle, 6px radius.
- **Primary:** Mineral blue fill, white text, 52px minimum height.
- **Hover / Focus:** Slight color lift and a visible keyboard outline; do not add a persistent glow.
- **Secondary:** White surface with rule border and mineral-blue text.

### Chips
- **Style:** Mist or translucent mineral-blue fill with a one-pixel rule.
- **State:** Chips identify report tags only; they are not used as navigation.

### Cards / Containers
- **Corner Style:** 6–8px.
- **Background:** White for reading and forms, pale mist for secondary analysis.
- **Shadow Strategy:** No default shadow; contrast comes from fill and border.
- **Border:** #DDE7E4 hairline.
- **Internal Padding:** 16px compact, 24px standard.

### Inputs / Fields
- **Style:** White surface, #DDE7E4 border, 6px radius, 52px minimum height.
- **Focus:** Mineral-blue border with a clear native focus ring.
- **Error / Disabled:** Coral error text; disabled controls reduce opacity without changing layout.

### Navigation

Navigation is minimal: a compact brand mark, product name, and small index label. It should never compete with the report identity or question text.

### Signature Component

The talent radar and eight horizontal signal tracks form the signature instrument. The radar gives a quick shape; the tracks provide the precise comparison. Both use mineral blue for the active signal and maintain the same dimension order.

## Do's and Don'ts

- Do keep the first viewport intelligible without scrolling on desktop.
- Do show the product's real supplied illustration at useful size.
- Do keep question choices visually equal so no answer looks morally or intellectually correct.
- Do use the chartreuse signal only for emphasis that carries meaning.
- Don't return to the prior generic green quiz-template layout.
- Don't use large gradients, ornamental blobs, or excessive shadows.
- Don't turn the report into a wall of identical cards; alternate data tracks, prose, and action blocks.
- Don't use deterministic language such as “天生”“注定” or “保证” for a self-report result.
