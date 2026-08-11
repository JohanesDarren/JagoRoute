---
name: Precision Connectivity
colors:
  surface: '#141124'
  surface-dim: '#141124'
  surface-bright: '#3a374b'
  surface-container-lowest: '#0e0c1e'
  surface-container-low: '#1c192c'
  surface-container: '#201d30'
  surface-container-high: '#2a273b'
  surface-container-highest: '#353247'
  on-surface: '#e5dffa'
  on-surface-variant: '#c3c6d6'
  inverse-surface: '#e5dffa'
  inverse-on-surface: '#312e42'
  outline: '#8d909f'
  outline-variant: '#434653'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#638cff'
  on-primary-container: '#00256c'
  inverse-primary: '#2656c7'
  secondary: '#ccbeff'
  on-secondary: '#351684'
  secondary-container: '#4e359d'
  on-secondary-container: '#beadff'
  tertiary: '#cdc1e5'
  on-tertiary: '#342c49'
  tertiary-container: '#988caf'
  on-tertiary-container: '#2e2642'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e7deff'
  secondary-fixed-dim: '#ccbeff'
  on-secondary-fixed: '#1f0060'
  on-secondary-fixed-variant: '#4c339b'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#cdc1e5'
  on-tertiary-fixed: '#1f1732'
  on-tertiary-fixed-variant: '#4b4260'
  background: '#141124'
  on-background: '#e5dffa'
  surface-variant: '#353247'
typography:
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
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for technical precision and high-performance networking environments. It balances a **Corporate/Modern** foundation with **Glassmorphism** accents to evoke a sense of advanced technology and ethereal speed. The target audience includes network engineers and infrastructure architects who require clarity, data density, and a reliable interface. The visual mood is calm yet innovative, replacing industrial greens with a sophisticated violet-blue spectrum that suggests depth and connectivity.

## Colors
The palette transition shifts from organic greens to a tech-forward violet-blue spectrum. 
- **Primary:** A vibrant Periwinkle Blue used for primary actions and critical system states.
- **Secondary/Tertiary:** Soft Lavender and Slate-Violet tones derived from the reference image, used for secondary data visualizations and subtle UI highlights.
- **Backgrounds:** A deep, "soft lavender-slate" dark mode base that provides high contrast for the lighter violet surfaces.
- **Entity Accents:** Updated to a monochromatic violet scale to maintain harmony. Hardware uses the primary blue; Routes utilize a light lavender; Keys utilize a deep amethyst.

## Typography
The system maintains a dual-font strategy: **Inter** for the core interface and **JetBrains Mono** for technical data and entity identifiers. 
- **Inter** provides high legibility for dense dashboards and administrative controls.
- **JetBrains Mono** is reserved for IP addresses, routing tables, and cryptographic keys, reinforcing the "Precision" aspect of the system.
- Use tight letter-spacing for headlines to maintain a modern, "tech" look.

## Layout & Spacing
This design system utilizes a **Fixed Grid** on desktop and a **Fluid Grid** on mobile. 
- **Desktop:** 12-column grid with a 1440px max-width, 16px gutters, and 32px side margins.
- **Mobile:** 4-column fluid grid with 16px margins.
- **Rhythm:** All spacing (padding, margins) must be increments of the 4px base unit. High-density views (tables/logs) should use 8px (2u) internal padding, while marketing/overview cards should use 24px (6u).

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Backdrop Blurs**:
- **Level 0 (Base):** Deep slate-violet background (#1A1825).
- **Level 1 (Cards/Containers):** Slightly lighter surface (#343148) with a 1px low-contrast violet stroke (10% opacity).
- **Level 2 (Modals/Popovers):** Semi-transparent surfaces using a 12px backdrop blur and a soft, diffused shadow tinted with the primary violet color.
- **Reflections:** Use subtle top-edge highlights (1px white at 5% opacity) to give containers a tactile, glass-like finish.

## Shapes
Following the user's specification, all standard UI elements (buttons, inputs, cards) use an **8px (0.5rem)** corner radius. 
- For larger structural elements like main dashboard containers, use `rounded-lg` (16px).
- Status indicators and small tags should remain consistent at 8px rather than becoming fully pill-shaped, maintaining the technical, structured aesthetic.

## Components
- **Buttons:** Primary buttons use a solid `#638CFF` fill with white text. Secondary buttons use a ghost style with a `#9D86F2` border.
- **Input Fields:** Dark surfaces with 8px rounding. Active states use a 2px outer glow in the primary blue. Labels should use JetBrains Mono for a "terminal-lite" feel.
- **Entity Chips:** Hardware (Blue), Routes (Light Lavender), and Keys (Deep Amethyst) use subtle background tints (15% opacity) with high-contrast text for immediate identification.
- **Cards:** Utilize the 8px rounding. Header areas within cards should be separated by a thin 1px line in the slate-violet shade.
- **Data Tables:** High-density, using JetBrains Mono for numeric values. Row hover states should use a 5% primary color overlay.