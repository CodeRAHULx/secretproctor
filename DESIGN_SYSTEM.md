# SecureMeet Design System

## ✅ Completed Design Consistency Updates

### Icon System - IMPLEMENTED
**Library**: Lucide React (lightweight, professional SVG icons)
**Installation**: `npm install lucide-react`

### Replaced Emojis With Professional Icons

#### Landing Page (`LandingPage.jsx`)
- ✅ 🎥 → `<Video />` - HD Video Conferencing
- ✅ 🤖 → `<Bot />` - AI Meeting Assistant
- ✅ 🔒 → `<Shield />` - Security & Proctoring
- ✅ 💬 → `<MessageSquare />` - Live Translation
- ✅ 📊 → `<BarChart3 />` - Meeting Analytics
- ✅ ⚡ → `<Zap />` - Instant Access

#### Home Screen (`HomeScreen.jsx`)
- ✅ 🔗 → `<Link />` - Share link carousel
- ✅ 🛡️ → `<Shield />` - Proctor watchdog carousel
- ✅ 🔒 → `<Video />` - Protected meeting carousel

#### Sign In Screen (`SignInScreen.jsx`)
- ✅ 🛡️ → `<Shield />` - Display Affinity Watchdog
- ✅ ⚡ → `<Zap />` - Real-time Forensics
- ✅ 🔒 → `<Lock />` - Encrypted WebRTC

#### Meeting Dock (`MeetingDock.jsx`)
- ✅ 🎤/🎤✗ → `<Mic />` / `<MicOff />` - Microphone toggle
- ✅ 📹/📹✗ → `<Video />` / `<VideoOff />` - Camera toggle
- ✅ 📺 → `<MonitorUp />` - Screen share
- ✅ 💬 → `<MessageSquare />` - Chat
- ✅ 🛡️ → `<Shield />` - Security panel
- ✅ 👥 → `<Users />` - Host controls
- ✅ 📞✗ → `<PhoneOff />` - Leave call

#### Video Tile (`VideoTile.jsx`)
- ✅ ⭐ → `<Star fill />` - Host badge
- ✅ 🎤/🎤✗ → `<Mic />` / `<MicOff />` - Audio status
- ✅ ⚠ → `<AlertTriangle />` - Threat warning

#### Waiting Tile (`WaitingTile.jsx`)
- ✅ 🔗 → `<Link2 />` - Share link icon
- ✅ ✓/Copy → `<Check />` / `<Copy />` - Copy button states
- ✅ 🤖 (removed from AI hint text)

## Design Tokens (CSS Variables)

### Colors
```css
--gm-bg: #202124                    /* Main background */
--gm-surface: #28292c               /* Cards, panels */
--gm-surface-hover: #35363a         /* Hover states */
--gm-border: #3c4043                /* Borders */

--gm-text: #e8eaed                  /* Primary text */
--gm-text-secondary: #9aa0a6        /* Secondary text */
--gm-text-muted: #5f6368            /* Muted text */

--gm-blue: #8ab4f8                  /* Accent blue */
--gm-blue-primary: #1a73e8          /* Primary blue */
--gm-blue-hover: #1b66c9            /* Blue hover */

--gm-red: #ea4335                   /* Error/danger */
--gm-green: #34a853                 /* Success */
--gm-yellow: #fbbc04                /* Warning */
```

### Border Radius
```css
--gm-radius-sm: 8px                 /* Small elements */
--gm-radius-md: 12px                /* Medium cards */
--gm-radius-lg: 24px                /* Large panels */
--gm-radius-full: 9999px            /* Circular */
```

### Typography
```css
--font-family: 'Google Sans', 'Inter', -apple-system, sans-serif
--font-mono: 'DM Mono', monospace
```

## Component Spacing Standards

### Padding
- **Small**: 8px - 12px (buttons, badges, pills)
- **Medium**: 16px - 24px (cards, panels)
- **Large**: 32px - 48px (sections, containers)

### Gap/Margin
- **Tight**: 4px - 8px (inline elements, icon spacing)
- **Normal**: 12px - 16px (card grid, list items)
- **Loose**: 24px - 32px (section spacing)

## Icon Usage Guidelines

### Size Standards
- **Small**: 14px - 16px (inline text, badges)
- **Medium**: 20px - 24px (buttons, controls)
- **Large**: 32px - 48px (feature cards, hero sections)
- **Extra Large**: 56px+ (illustrations, empty states)

### Stroke Width
- **Thin**: 1.5 (large decorative icons)
- **Normal**: 2 (default for most icons)
- **Bold**: 2.5 (emphasis, active states)

### Color Usage
- Default: `var(--gm-text)` or `currentColor`
- Active/Success: `var(--gm-green)`
- Error/Danger: `var(--gm-red)`
- Accent: `var(--gm-blue)`
- Muted: `var(--gm-text-secondary)`

## Button System

### Variants
```jsx
<Button variant="primary" />    // Blue, high emphasis
<Button variant="secondary" />  // Outlined, medium emphasis
<Button variant="ghost" />      // Transparent, low emphasis
<Button variant="danger" />     // Red, destructive actions
```

### Sizes
```jsx
<Button size="sm" />   // 32px height
<Button size="md" />   // 40px height (default)
<Button size="lg" />   // 48px height
```

### States
- **Default**: Subtle background
- **Hover**: Slightly darker background, scale(1.05) for dock buttons
- **Active**: Primary color background
- **Disabled**: 40% opacity, no pointer events

## Interactive States

### Hover Effects
```css
transition: all 0.2s ease;
```
- Background darkens by ~10%
- Optional: `transform: scale(1.05)` for important buttons
- Optional: `transform: translateY(-2px)` for cards

### Active States
- Blue background for active toggles
- Icon color change
- Border color change
- Shadow/glow for screen sharing

### Focus States
- Browser default outline for accessibility
- Can be enhanced with custom focus rings

## Animation Guidelines

### Timing
- **Fast**: 0.15s (hover, click feedback)
- **Normal**: 0.2s - 0.3s (most transitions)
- **Slow**: 0.4s - 0.6s (large movements, page transitions)

### Easing
- **Ease-out**: Most hover effects
- **Linear**: Loading spinners, progress bars
- **Custom**: Page transitions, complex animations

### Active Animations
```css
/* Loading spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Pulse (screen sharing) */
@keyframes pulse-share {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52, 168, 83, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(52, 168, 83, 0); }
}

/* Alert pulse */
@keyframes pulseAlert {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(234, 67, 53, 0); }
}
```

## Accessibility

### Color Contrast
- Text on dark background: Use `--gm-text` (#e8eaed) for WCAG AA
- Small text minimum contrast: 4.5:1
- Large text minimum contrast: 3:1
- Icons inherit text color for consistency

### Icon Accessibility
```jsx
<Mic size={20} aria-label="Microphone" />
<button title="Mute microphone">
  <MicOff size={20} />
</button>
```

### Focus Visible
- Ensure keyboard navigation has clear focus indicators
- Use `outline` or custom focus ring
- Test with Tab navigation

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  /* Single column layouts */
  /* Collapsible sidebars */
  /* Larger touch targets (48px minimum) */
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* 2-column grids */
  /* Adaptive sidebar */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Multi-column grids */
  /* Persistent sidebars */
  /* Hover states */
}
```

## AI Panel Guidelines

### Principles
- Subtle, not dominant
- Functional, not decorative
- Collapsible/resizable
- No robot graphics or AI branding
- Clean typography, minimal gradients
- Respect meeting content priority

### Implementation
```jsx
// Good: Subtle functional panel
<AIPanel className="ai-panel-collapsed" />

// Bad: Over-decorated AI branding
<AIPanel className="glowing-robot-ai-magic" />
```

## Future Improvements

### TODO
- [ ] Create icon components wrapper for consistent sizing
- [ ] Add dark/light mode toggle (currently dark only)
- [ ] Create avatar component variations
- [ ] Design loading skeleton states
- [ ] Create empty state illustrations
- [ ] Toast/notification system design
- [ ] Modal/dialog design patterns
- [ ] Form input design system
- [ ] Badge component variations
- [ ] Tooltip design

### Metrics
- Bundle size: ~253KB (before gzip)
- Icon library: 1 package (Lucide React)
- Color variables: 15
- Font families: 2
- CSS file size: ~43KB (before gzip)

## Testing Checklist

- [x] Landing page renders with icons
- [x] Home screen carousel uses icons
- [x] Sign-in screen icons display correctly
- [x] Meeting dock icons functional
- [x] Video tiles show mic/host icons
- [x] Waiting tile displays link icon
- [x] No emoji remnants in UI
- [x] Icons scale properly at different sizes
- [x] Icon colors match design tokens
- [x] Hover states work correctly
- [x] Active states are clear
- [x] Production build succeeds
- [ ] Verify on actual browsers (Chrome, Firefox, Safari)
- [ ] Test responsive layouts
- [ ] Verify accessibility with screen reader
- [ ] Test keyboard navigation
