---
name: Cyber Duck Terminal
colors:
  surface: '#10141a'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#bbc9c9'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#859393'
  outline-variant: '#3c4949'
  surface-tint: '#48dadc'
  primary: '#48dadc'
  on-primary: '#003737'
  primary-container: '#00babc'
  on-primary-container: '#004445'
  inverse-primary: '#00696b'
  secondary: '#ffe9b9'
  on-secondary: '#3e2e00'
  secondary-container: '#ffc703'
  on-secondary-container: '#6e5400'
  tertiary: '#ddb7ff'
  on-tertiary: '#490080'
  tertiary-container: '#c78eff'
  on-tertiary-container: '#5a009c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bf7f8'
  primary-fixed-dim: '#48dadc'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#004f50'
  secondary-fixed: '#ffdf94'
  secondary-fixed-dim: '#f5bf00'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#594400'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  title-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

The design system establishes a high-performance cyber-terminal environment tailored for peer-to-peer coding campuses, competitive hackers, and elite engineering alumni. It draws heavily from the raw, gritty autonomy of developer school culture (such as peer evaluations, late-night clusters, black-hole deadlines, and debug ducks) blended with the polish of modern luxury developer utilities and high-tier competitive gaming interfaces.

The aesthetic fuses **Glassmorphic Cyber-Minimalism** with **Tactile Terminal Precision**. The interface avoids bloated skeuomorphism while rejecting sterile corporate minimalism. Instead, it relies on high-density data visualizations, luminous accent glows on dark carbon surfaces, sharp monospace telemetry, and frosted vitreous panes that feel like heads-up displays running inside an advanced development environment.

Interactions are immediate, crisp, and tactile. Micro-interactions utilize micro-springs, subtle electromagnetic glow pulses on hover, and high-contrast state transitions to evoke an ultra-responsive runtime application.

## Colors

The palette revolves around deep void canvases punctured by electric diagnostic colors. 

### Canvas & Surface Hierarchy
- **Base Void (`#080B0F` & `#0D1117`)**: Primary background layers for deep canvas immersion.
- **Surface Elevation 1 (`#12161E`)**: Structural containers, left-hand cluster rails, and terminal consoles.
- **Surface Elevation 2 (`#161B22`)**: Foreground cards, floating toolbars, and evaluation panels.
- **Surface Elevation 3 (`#21262D`)**: Interactive input fields, idle state triggers, and active list highlights.
- **Glass Tint (`rgba(22, 27, 34, 0.72)`)**: Combined with `backdrop-filter: blur(12px)` for floating HUD elements.

### Accent & Diagnostic Colors
- **Cyber-Teal (`#00BABC`)**: Primary action token, active status indicators, git branch merges, and core system telemetry.
- **Rubber Duck Gold (`#FFC700` / `#FFD700`)**: Secondary token reserved for gamification milestones, evaluation tokens, peer XP, and critical warning alerts.
- **Neon Synth-Purple (`#A855F7`)**: Tertiary role designated for alumni status, guild designations, and special legendary quest tracks.
- **Electric Cyan (`#00F0FF`)**: High-luminance micro-accents for glowing borders, code diff highlights, and command-line cursors.
- **Vampire Red (`#F85149`)**: Black-hole countdown timers, compiler errors, failing unit tests, and defense failures.

All interactive elements maintain strict accessibility contrast against dark surfaces while retaining luminous edge highlights using colored ambient drop-shadows.

## Typography

The typographical engine orchestrates two precise typefaces: **Inter** for clean, readable narrative prose and UI controls, and **JetBrains Mono** for all operational parameters, code snippets, gamified statistics, tags, and terminal telemetry.

### Typographic Hierarchy Rules
- **Structural Identity**: Headlines take advantage of tight letter-spacing and heavy weights to create a punchy, technical editorial presence.
- **Telemetry & Data**: Any dynamic numerical value (such as peer evaluation points, wallet balances, rank levels, commit hashes, or cluster coordinates) must be rendered in `label-sm`, `label-md`, or `code-*` styles via `JetBrains Mono`.
- **Labels & Tags**: System tags and status badges are rendered in uppercase using `JetBrains Mono` with expanded tracking (`0.04em` to `0.06em`) to ensure legibility on dense layouts.

## Layout & Spacing

The layout runs on an **adaptable 12-column terminal grid** prioritizing maximum viewport utility and real-time dashboard instrumentation.

### Grid & Breakpoints
- **Mobile (< 768px)**: 4-column layout, `1rem` outer margins, dynamic vertical stack. Navigation moves to a collapsed bottom command bar and drawer launcher.
- **Tablet (768px - 1199px)**: 8-column layout, `1.5rem` outer margins. Persistent collapsed micro-rail sidebar (64px width) alongside split multi-pane content.
- **Desktop (1200px+)**: 12-column layout with max-width bounding box at `1680px` (or 100% fluid within specialized workstation multi-monitor setups). Left navigation rail (240px) + content core (flex) + contextual telemetry drawer (320px).

### Spacing Philosophy
- Base layout rhythm is anchored to a strict **4px/8px incremental grid**.
- High data density is preserved in cards and lists with compact internal spacing (`space-sm` to `space-md`), balancing breathing room with rapid visual scanning.

## Elevation & Depth

Visual hierarchy uses a combination of **translucent vitreous surfaces**, **luminescent edge tracing**, and **tinted dark atmospheric shadows**. Standard drop shadows are insufficient; depth in this design system must communicate electrical conductivity.

### Layer Stack
1. **Base Layer (Ground)**: Deep matte `#080B0F` canvas with an optional sub-surface dot-matrix grid at 5% opacity.
2. **Cluster Shell (Elevation 1)**: Solid `#12161E` backing panels with hairline borders (`1px solid rgba(255, 255, 255, 0.08)`).
3. **Glass HUD Modules (Elevation 2)**: Translucent `#161B22` with `rgba(22, 27, 34, 0.8)` fill, `backdrop-filter: blur(16px)`, bordered by `1px solid rgba(0, 186, 188, 0.18)`.
4. **Active & Overlaid Panes (Elevation 3)**: `#1E2530` panels floating with elevated shadow: `0 12px 32px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12)`.

### Luminous Borders & Glow Accents
Interactive cards and focus states introduce subtle ambient glows rather than heavy structural shadows:
- **Cyber-Teal Active Aura**: `box-shadow: 0 0 20px -3px rgba(0, 186, 188, 0.25), inset 0 0 12px -2px rgba(0, 186, 188, 0.1)`.
- **Rubber Duck Milestone Aura**: `box-shadow: 0 0 24px -2px rgba(255, 199, 0, 0.3), inset 0 0 10px -1px rgba(255, 199, 0, 0.15)`.
- **Borders**: All surface edges rely on sub-pixel or 1px strokes with semi-transparent alpha overlays (`rgba(255, 255, 255, 0.08)` up to `rgba(255, 255, 255, 0.2)`).

## Shapes

The design system relies on a **Soft-Tech (Level 1)** shape language. The philosophy draws from performance developer monitors and terminal emulators: sleek, modern, but disciplined and structured. 

- **Base Radius (`0.25rem` / 4px)**: Checkboxes, badges, command tags, code tokens, and inner toolbars.
- **Medium Radius (`0.5rem` / 8px)**: Standard buttons, text inputs, chat bubbles, avatar frames, and nested container blocks.
- **Large Radius (`0.75rem` / 12px)**: Dashboard cards, modal sheets, floating launcher pallets, and cluster map modules.
- **Pills**: Strictly restricted to live telemetry status indicators (e.g., `ONLINE`, `EVALUATING`, `IN PEER REVIEW`) and numeric ping badges. Circle geometry is reserved for user avatars and circular progress dials.

## Components

### Buttons & Interactive Triggers
- **Primary Cyber Button**: Background `#00BABC`, text `#080B0F` (bold weight). On hover: shifts to `#00D2D4` with `0 0 16px rgba(0, 186, 188, 0.45)`. On active: scales to `0.98`.
- **Secondary Ghost Button**: Transparent background, `1px solid rgba(255, 255, 255, 0.15)`, text `#E6EDF3`. Hover triggers border transition to `#00BABC` and subtle teal-tinted background `rgba(0, 186, 188, 0.08)`.
- **Milestone / Duck Button**: Solid `#FFC700`, text `#080B0F`. Used exclusively for critical peer evaluation requests, gamified trophy claims, and black-hole freeze extensions. Glow: `0 0 18px rgba(255, 199, 0, 0.4)`.

### Chips & Badges
- Constructed with `JetBrains Mono` label typography.
- Bordered with subtle `1px` translucent strokes matching their respective accent tones (Teal, Gold, Purple, Red).
- Feature a leading 6px glowing indicator dot for real-time states (e.g., active cluster slot or online evaluation status).

### Cards & HUD Containers
- Glassmorphic foundations using `#161B22` background with 80% opacity, layered over dark canvas with `16px` backdrop blur.
- Outer border `1px solid rgba(255, 255, 255, 0.08)`.
- Cards include a micro-header metadata strip: small terminal breadcrumbs (e.g., `ROOT // CLUSTER_B1 // ROW_04`) set in muted monospace text.

### Form Inputs & Terminal Command Inputs
- Dark inset backgrounds (`#0D1117`) bordered by `#30363D`.
- Text styled in `Inter` for standard forms, shifting to `JetBrains Mono` for search bars, query inputs, and command palettes.
- Focus state activates an electric cyan hairline border (`#00F0FF`) and a concentrated outer field glow (`0 0 0 3px rgba(0, 240, 255, 0.15)`).

### Checkboxes, Radios & Toggles
- Custom square-cut check indicators (`0.25rem` radius) with deep dark background and `#00BABC` check fills.
- Toggle switches resemble sleek hardware switches: dark track with active Cyber-Teal illumination and a pure white thumb indicator.

### Gamified & Developer-Specific Components
- **Cluster Map Matrix**: Interactive grid showing live coding campus seats. Free computers glow muted teal; occupied seats show peers' avatars; inactive terminals remain matte dark gray.
- **Evaluation Point Counter**: Monospace golden ticker with an iconographic Rubber Duck glyph, paired with a progress bar tracking mandatory peer evaluation quotas.
- **Black Hole Defense Ring**: Circular SVG radial progress element with Vampire Red gradient tracking days remaining before curriculum timeout.
- **Terminal Command Palette (HUD Launcher)**: Global modal triggered via `Cmd+K` / `Ctrl+K`. Translucent deep-black backdrop with neon-accented autocomplete fuzzy search.