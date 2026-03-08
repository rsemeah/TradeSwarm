# TradeSwarm Design Tokens

## CSS Variables (globals.css)

```css
:root {
  /* Background */
  --background: #0c0c0c;
  --foreground: #f5f5f5;
  
  /* Card */
  --card: #141414;
  --card-foreground: #f5f5f5;
  
  /* Borders */
  --border: #1f1f1f;
  --border-muted: #171717;
  
  /* Muted */
  --muted: #1a1a1a;
  --muted-foreground: #737373;
  
  /* Primary (Forest Green) */
  --primary: #1a5c3a;
  --primary-foreground: #f5f5f5;
  --primary-hover: #1f6b44;
  
  /* Accent (Gold) */
  --accent: #c9a227;
  --accent-foreground: #0c0c0c;
  --accent-hover: #d4af37;
  
  /* Signals */
  --bullish: #22c55e;
  --bearish: #ef4444;
  --neutral: #737373;
  
  /* Status */
  --warning: #f59e0b;
  --danger: #ef4444;
  --success: #22c55e;
  --info: #3b82f6;
  
  /* Tags */
  --tag-broker: #3b82f6;
  --tag-swarm: #22c55e;
  --tag-truthserum: #a855f7;
  --tag-calibration: #f59e0b;
  --tag-ops: #6b7280;
  --tag-account: #737373;
  
  /* Tiers */
  --tier-s: #c9a227;
  --tier-a: #22c55e;
  --tier-b: #3b82f6;
  --tier-c: #737373;
  
  /* Radius */
  --radius: 8px;
}
```

## Tailwind Usage

### Backgrounds
```
bg-[var(--background)]     // App background
bg-[var(--card)]           // Card surfaces
bg-[var(--muted)]          // Secondary surfaces
bg-[var(--primary)]        // Primary buttons
bg-[var(--accent)]         // Accent buttons
```

### Text
```
text-[var(--foreground)]        // Primary text
text-[var(--muted-foreground)]  // Secondary text
text-[var(--accent)]            // Links, highlights
```

### Borders
```
border-[var(--border)]          // Standard borders
border-[var(--border-muted)]    // Subtle borders
```

### Signals
```
text-[var(--bullish)]    // GO, gains
text-[var(--bearish)]    // NO, losses
text-[var(--neutral)]    // WAIT, neutral
bg-[var(--bullish)]      // GO badge
bg-[var(--bearish)]      // NO badge
```

### Tags
```
bg-[var(--tag-broker)]       // BROKER tag
bg-[var(--tag-swarm)]        // SWARM tag
bg-[var(--tag-truthserum)]   // TRUTHSERUM tag
bg-[var(--tag-calibration)]  // CALIBRATION tag
```

### Shortcuts (for v0.dev)

When working in v0.dev, use these direct hex values but prefer CSS vars in final code:

| Token | Hex |
|-------|-----|
| background | #0c0c0c |
| card | #141414 |
| foreground | #f5f5f5 |
| muted-foreground | #737373 |
| border | #1f1f1f |
| primary | #1a5c3a |
| accent | #c9a227 |
| bullish | #22c55e |
| bearish | #ef4444 |

## Component Patterns

### Card
```tsx
<div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
  <h3 className="text-[var(--foreground)]">Title</h3>
  <p className="text-[var(--muted-foreground)]">Description</p>
</div>
```

### Button (Primary)
```tsx
<button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[var(--foreground)] hover:bg-[var(--primary-hover)]">
  Action
</button>
```

### Button (Accent/CTA)
```tsx
<button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]">
  Execute
</button>
```

### Verdict Badge
```tsx
// GO
<span className="rounded bg-[var(--bullish)] px-2 py-1 text-xs font-bold text-white">GO</span>

// WAIT
<span className="rounded bg-[var(--neutral)] px-2 py-1 text-xs font-bold text-white">WAIT</span>

// NO
<span className="rounded bg-[var(--bearish)] px-2 py-1 text-xs font-bold text-white">NO</span>
```

### Tag
```tsx
<span className="rounded bg-[var(--tag-broker)] px-2 py-0.5 text-[10px] font-bold text-white">BROKER</span>
```
