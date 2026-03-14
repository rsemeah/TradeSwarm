# TradeSwarm Brand Palette (Gemini-Derived)

## Source
Derived from Gemini-generated logo assets showing:
- Mechanical wasp with gold outlines and deep green fill
- Candlestick chart patterns in wings
- Dark charcoal/slate backgrounds
- "TRADE" in forest green, "SWARM" in gold

---

## Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Forest Green** | `#1a5c3a` | Primary brand, nav active states, primary buttons |
| **Rich Gold** | `#c9a227` | Accent, CTAs, highlights, links |
| **Gold Hover** | `#d4af37` | Gold hover state |
| **Green Hover** | `#1f6b44` | Green hover state |

## Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#0c0c0c` | App background |
| **Card** | `#141414` | Card surfaces, elevated elements |
| **Muted** | `#1a1a1a` | Secondary surfaces |
| **Border** | `#1f1f1f` | Primary borders |
| **Border Muted** | `#171717` | Subtle borders |
| **Foreground** | `#f5f5f5` | Primary text |
| **Muted Foreground** | `#737373` | Secondary text, labels |

## Signal Colors (Trading)

| Name | Hex | Usage |
|------|-----|-------|
| **Bullish / GO** | `#22c55e` | Positive signals, gains, GO verdict |
| **Bearish / NO** | `#ef4444` | Negative signals, losses, NO verdict |
| **Neutral / WAIT** | `#737373` | Neutral state, WAIT verdict |

## Status Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#22c55e` | Success states |
| **Warning** | `#f59e0b` | Warnings, caution |
| **Danger** | `#ef4444` | Errors, danger |
| **Info** | `#3b82f6` | Informational |

## Tag Colors (Nav Spec)

| Tag | Hex | Usage |
|-----|-----|-------|
| **BROKER** | `#3b82f6` | Broker-dependent screens |
| **SWARM** | `#22c55e` | Swarm intelligence screens |
| **TRUTHSERUM** | `#a855f7` | TruthSerum/verification screens |
| **CALIBRATION** | `#f59e0b` | Calibration/outcomes screens |
| **OPS** | `#6b7280` | Operations screens |
| **ACCOUNT** | `#737373` | Account screens |

## Tier Colors

| Tier | Hex | Usage |
|------|-----|-------|
| **S-Tier** | `#c9a227` | Gold - top tier |
| **A-Tier** | `#22c55e` | Green - excellent |
| **B-Tier** | `#3b82f6` | Blue - good |
| **C-Tier** | `#737373` | Gray - acceptable |

---

## Usage Rules

### Backgrounds
- Always use `--background` for app background
- Use `--card` for elevated surfaces (cards, modals, dropdowns)
- Use `--muted` for secondary/nested surfaces

### Text
- Primary text: `--foreground`
- Secondary text: `--muted-foreground`
- Never use pure white (`#ffffff`) - use `--foreground` (`#f5f5f5`)

### Accents
- Use `--accent` (gold) for CTAs and interactive highlights
- Use `--primary` (green) for brand elements and nav active states
- Signal colors for trading states only

### Charts
- Bullish candles: `--bullish`
- Bearish candles: `--bearish`
- Gridlines: `--border`
- Labels: `--muted-foreground`

### No Random Hex
All new UI must use CSS variables. No hardcoded hex values in components.
