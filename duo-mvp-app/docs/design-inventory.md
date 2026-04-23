# DUO App — Design Inventory
> Step 1 of porting process. Source: `/Users/thomasmcshane/Downloads/DUO App _standalone_.html`
> Every value here must match byte-for-byte in the React Native implementation.

---

## 1. SCREENS & VIEWS

### Tab Screens (5)
| Tab | Screen | Component Name |
|-----|---------|----------------|
| 1 | Workout (idle) | `WorkoutScreen` |
| 2 | History | `HistoryScreen` |
| 3 | Library | `LibraryScreen` |
| 4 | Coach | `CoachScreen` |
| 5 | Profile | `ProfileScreen` |

### Workout Sub-Views (WorkoutFlow)
| Step | View |
|------|------|
| 1 | Muscle picker (grid or body diagram) |
| 2 | Workout type selector |
| 3 | Session preview |
| 4 | Live set screen |
| 5 | Feedback screen |
| 6 | Rest timer screen |
| 7 | Completion screen |

### Modals / Bottom Sheets
| Name | Trigger | Behavior |
|------|---------|----------|
| `PairSheet` | "Pair tracker" chip | Slides up from bottom, 3 stages |
| `FilterSheet` (History) | Filter icon | Bottom sheet with exercise + date range + PR-only filters |
| `AdjustmentSheet` (Coach) | "Why?" button | Bottom sheet with autoregulation reasons |
| `GoalSetupSheet` | (Coach CTA) | Goal configuration |

### Drill-in / Sub-Pages
| Name | Parent | Back nav |
|------|--------|----------|
| `WorkoutDetailScreen` | History | Back chevron |
| `ExerciseDetailScreen` | Library | Back chevron |
| `BilateralDashboardScreen` | Profile | Back chevron |
| `PreferencesPage` | Profile | Back chevron |
| `DevicesPage` | Profile | Back chevron |
| `GoalsPage` | Profile | Back chevron |
| `NotificationsPage` | Profile | Back chevron |
| `DataExportPage` | Profile | Back chevron |
| `DeleteAccountPage` | Profile | Back chevron |
| `LegalPage` | Profile | Back chevron |

### Live Tracking Overlay (over Workout)
| State | Component |
|-------|-----------|
| Collapsed | `LiveCollapsedStrip` — 52px absolute bar at top |
| Expanded | `LiveExpandedView` — full-screen takeover |

---

## 2. COLORS (Exact Hex)

### Background Hierarchy
| Token | Hex | Usage |
|-------|-----|-------|
| `bg.base` | `#000000` | Screen backgrounds (OLED true black) |
| `bg.surface` | `#0A0A0C` | Cards, list backgrounds |
| `bg.elevated` | `#141418` | Modals, sheets, tab bar, chips, inputs |
| `bg.overlay` | `rgba(0,0,0,0.72)` | Scrim behind sheets |

### Foreground / Text
| Token | Hex | Usage |
|-------|-----|-------|
| `fg.primary` | `#FAFAFA` | Main text, headings |
| `fg.secondary` | `#A0A0A8` | Secondary text, muted UI |
| `fg.tertiary` | `#55555C` | Captions, hints, disabled text |
| `fg.disabled` | `#2A2A30` | Strongly muted, disabled states |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `border.subtle` | `rgba(255,255,255,0.06)` | Card outlines, dividers (default) |
| `border.default` | `rgba(255,255,255,0.10)` | Standard separators |
| `border.strong` | `rgba(255,255,255,0.18)` | Prominent separators, sheet handles |

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `accent.primary` | `#E6FF3D` | Primary CTA, highlights, live indicator, active tab |
| `accent.primaryPressed` | `#C9E032` | Pressed state of primary button |
| `accent.onPrimary` | `#000000` | Text/icons on accent backgrounds |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `semantic.success` | `#4ADE80` | Tracker paired dot, success states |
| `semantic.warning` | `#FBBF24` | Velocity loss ≥20%, speed-strength zone |
| `semantic.danger` | `#F87171` | Velocity loss ≥35%, speed zone |
| `semantic.info` | `#60A5FA` | Strength zone, bilateral left |

### Velocity Zones (5 bands)
| Zone | m/s Range | Hex | Label |
|------|-----------|-----|-------|
| Absolute Strength | < 0.50 | `#60A5FA` | "Abs. strength" |
| Strength | 0.50–0.75 | `#67E8F9` | "Strength" |
| Power | 0.75–1.00 | `#E6FF3D` | "Power" |
| Speed-Strength | 1.00–1.30 | `#FBBF24` | "Speed-strength" |
| Speed | > 1.30 | `#F87171` | "Speed" |

### Bilateral
| Token | Hex | Usage |
|-------|-----|-------|
| `bilateral.left` | `#60A5FA` | Left sensor (blue) |
| `bilateral.right` | `#E6FF3D` | Right sensor (chartreuse) |

---

## 3. TYPOGRAPHY

### Type Scale
| Variant | Size (px) | Line-Height (px) | Weight | Letter-Spacing | Text-Transform |
|---------|-----------|-----------------|--------|----------------|----------------|
| displayXL | 56 | 60 | 500 | -0.02em (-1.12px) | none |
| displayLG | 40 | 44 | 500 | -0.02em (-0.80px) | none |
| displayMD | 28 | 34 | 500 | -0.01em (-0.28px) | none |
| titleLG | 20 | 26 | 600 | -0.005em (-0.10px) | none |
| titleMD | 17 | 22 | 600 | 0 | none |
| bodyLG | 17 | 24 | 400 | 0 | none |
| bodyMD | 15 | 22 | 400 | 0 | none |
| bodySM | 13 | 18 | 400 | 0 | none |
| caption | 11 | 14 | 600 | 0.08em (0.88px) | uppercase |

### Font Families
| Role | Web Stack | RN Equivalent |
|------|-----------|---------------|
| Display / Headings | SF Pro Display, system-ui | System default (iOS = SF Pro) |
| Body / UI | SF Pro Text, system-ui | System default (iOS = SF Pro) |
| Mono | JetBrains Mono, SF Mono | `JetBrainsMono_400Regular` / `JetBrainsMono_600SemiBold` |

### Special Typography
| Element | Size | Weight | Family | Color | Notes |
|---------|------|--------|--------|-------|-------|
| Giant velocity number | 96px | 500 | System | `accent.primary` | lh 96, ls -0.04em (-3.84px), tabular nums |
| Velocity unit "m/s" | 20px | 400 | Mono | `fg.secondary` | Bottom-aligned to number |
| Zone dot | 6×6px | — | — | Zone color | `borderRadius: 1` (square-ish) |
| Stat value | 24px | 500 | System | `fg.primary` | ls -0.02em |
| Stat unit | 11px | 400 | Mono | `fg.tertiary` | Bottom-aligned |
| Tab icon | 22px | — | SVG | active: accent, inactive: `fg.tertiary` | — |
| PR badge text | 9px | 700 | Mono | `accent.onPrimary` | uppercase, `#000` bg |
| Section header | 13px | — | System | `fg.tertiary` | Uppercase, ls -0.08em |

---

## 4. SPACING

### Token Scale (4pt grid)
| Token | px Value |
|-------|----------|
| `space.xs` | 4 |
| `space.sm` | 8 |
| `space.md` | 12 |
| `space.lg` | 16 |
| `space.xl` | 24 |
| `space.xxl` | 32 |
| `space.xxxl` | 48 |
| `space.huge` | 64 |

### Key Applications
| Context | Value |
|---------|-------|
| Screen horizontal padding | 24px (`xl`) |
| Card padding | 16px (`lg`) |
| Section vertical gap | 24px (`xl`) |
| Icon-to-text gap | 8px (`sm`) |
| List row min-height | 52px |
| Header min-height | 44px |
| Input height | 44px |
| Tab bar height (pill) | 64px |
| Tab bar bottom inset | 24px from safe area |
| Tab bar horizontal margin | 16px (`lg`) each side |
| Sheet handle: width | 36px |
| Sheet handle: height | 4px |
| Sheet handle: margin-bottom | 24px (`xl`) |
| Sensor graphic height | 100px |
| Live collapsed strip height | 52px |
| Live collapsed strip top | 54px (below status bar) |
| Scroll padding-bottom | 120px (tab bar clearance) |
| Modal top border-radius | 24px (`xl`) |

---

## 5. BORDER RADIUS

| Token | px | Usage |
|-------|----|-------|
| `radius.sm` | 8 | Icon backgrounds, small chips, toggle tracks |
| `radius.md` | 12 | Buttons, inputs, exercise cards |
| `radius.lg` | 16 | Main cards, content containers |
| `radius.xl` | 24 | Modal top corners, large sheets |
| `radius.pill` | 9999 | Tab bar, search bar, status chips, pill buttons |

**One-offs (not tokenized):**
- Device frame corners: 48px
- Sensor pulse circle: 40px radius (80px diameter)
- Sensor inner circle: 27px radius (54px diameter)
- Rep bar items: 3px
- Zone indicator dot: `borderRadius: 1` (6×6px, slightly squared)
- PR badge: `borderRadius: 3`

---

## 6. INTERACTIVE ELEMENTS

### Primary Button ("Start workout", "Done", etc.)
| Property | Value |
|----------|-------|
| Height | 56px (`lg` size) |
| Horizontal padding | 24px |
| Font size | 17px |
| Font weight | 600 |
| Border radius | 12px (`radius.md`) |
| Background (default) | `#E6FF3D` |
| Background (pressed) | `#C9E032` |
| Text color | `#000000` |
| Press scale | 0.98 |
| Transition duration | 120ms |
| Transition easing | `cubic-bezier(0.2, 0, 0, 1)` |
| Disabled opacity | 0.4 |

### Ghost Button
| Property | Value |
|----------|-------|
| Background | transparent |
| Border | 1px `rgba(255,255,255,0.10)` |
| Text color | `#FAFAFA` |
| Press scale | 0.98 |

### Bare Button
| Property | Value |
|----------|-------|
| Background | transparent |
| Text color | `#A0A0A8` |
| No border | — |
| Press scale | 0.98 |

### Button Sizes
| Size | Height | H-Padding | Font Size | Radius |
|------|--------|-----------|-----------|--------|
| sm | 36px | 16px | 13px | 12px |
| md | 48px | 24px | 15px | 12px |
| lg | 56px | 24px | 17px | 12px |

### Search Input
| Property | Value |
|----------|-------|
| Height | 44px |
| Background | `#141418` |
| Border | 1px `rgba(255,255,255,0.06)` |
| Border radius | 9999px (pill) |
| Padding left | 16px |
| Padding right | 16px |
| Gap (icon to input) | 8px |
| Placeholder | "search exercises" (lowercase) |
| Placeholder color | `#55555C` |
| Text color | `#FAFAFA` |
| Font size | 15px |
| Clear button | Visible when text non-empty, `×` icon, `fg.tertiary` |

### Tracker Status Chip
| State | Dot color | Glow | Text |
|-------|-----------|------|------|
| Paired | `#4ADE80` | `0 0 8px #4ADE80` | "DUO · 92%" |
| Unpaired | `#55555C` | none | "Pair tracker" |
| Height | 28px | — | — |
| H-Padding | 12px | — | — |
| Border radius | 9999px | — | — |
| Background | `#141418` | — | — |
| Border | 1px `rgba(255,255,255,0.06)` | — | — |
| Dot size | 6×6px | — | — |
| Font size | 12px | — | — |
| Font weight | 500 | — | — |

### Filter Chips (History, Library)
| State | Background | Border | Text color | Weight |
|-------|-----------|--------|------------|--------|
| Inactive | transparent | 1px `rgba(255,255,255,0.06)` | `#55555C` | 400 |
| Active | `#E6FF3D` | none | `#000000` | 600 |
| Height | 32px | — | — | — |
| H-Padding | 12px | — | — | — |
| Border radius | 9999px | — | — | — |
| Font size | 13px | — | — | — |

### Toggle Switch (Profile Preferences)
| Property | Value |
|----------|-------|
| Track width | 44px |
| Track height | 26px |
| Track border radius | 9999px |
| Track (off) background | `rgba(255,255,255,0.10)` |
| Track (on) background | `#E6FF3D` |
| Thumb diameter | 22px |
| Thumb color | `#000000` (when on) / `#FAFAFA` (when off) |
| Thumb position (off) | `left: 2px` |
| Thumb position (on) | `left: 22px` |
| Transition | 200ms `cubic-bezier(0.2, 0, 0, 1)` |

### Settings Row
| Property | Value |
|----------|-------|
| Min-height | 52px |
| H-Padding | 24px |
| Icon square size | 28px |
| Icon square border-radius | 8px (`radius.sm`) |
| Icon square background | `#141418` |
| Icon size | 16px |
| Gap (icon to text) | 12px |
| Chevron size | 12px |
| Separator | 1px `rgba(255,255,255,0.06)` at bottom |

### Tab Bar (Pill style — currently active)
| Property | Value |
|----------|-------|
| Position | absolute |
| Bottom | 24px + safe area |
| Left/Right | 16px |
| Height | 64px |
| Background | `#141418` |
| Border | 1px `rgba(255,255,255,0.06)` |
| Border radius | 9999px |
| Active tab color | `#E6FF3D` |
| Active indicator dot | 4px diameter, `#E6FF3D`, `box-shadow: 0 0 8px #E6FF3D` |
| Inactive tab color | `#55555C` |
| Icon size | 22px |
| Dot position | 6px from top of tab area |

---

## 7. ANIMATIONS

### Duration Tokens
| Name | ms | Usage |
|------|----|-------|
| instant | 120 | Button press feedback, state changes |
| fast | 200 | Tab transitions, dot size change, simple fades |
| medium | 320 | Sheet open/close, screen transitions |
| slow | 520 | Sensor pairing animation, major reveals |

### Easing Tokens
| Name | Cubic-Bezier | Usage |
|------|-------------|-------|
| standard | `cubic-bezier(0.2, 0, 0, 1)` | General motion |
| enter | `cubic-bezier(0, 0, 0, 1)` | Entrance animations |
| exit | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |

### Keyframe Animations
| Name | Keyframes | Duration | Easing | Trigger |
|------|-----------|----------|--------|---------|
| `duoPulse` | `scale(0.7) opacity 0.6` → `scale(1.3) opacity 0` | 1200–1400ms | ease-out | Live indicator dot, sensor searching pulse |
| `fadeIn` | `opacity 0, translateY(4px)` → `opacity 1, translateY(0)` | variable | standard | Screen entry |
| `duoBreathe` | `opacity 0.94` ↔ `opacity 1.00` | 4000ms | ease-in-out | Static CTA "breathing" liveness effect |
| `duoShimmer` | `bg-position -100%` → `bg-position 100%` | 1200ms | linear | Loading skeletons |
| `duoPushIn` | `translateX(24px) opacity 0` → `translateX(0) opacity 1` | 200–320ms | standard | Right-to-left slide-in |
| `duoPopIn` | `translateX(-24px) opacity 0` → `translateX(0) opacity 1` | 200–320ms | standard | Left-to-right slide-in |
| `duoEdgeGlow` | `opacity 0` → `0.7` → `0` | 800ms | — | Sensor pairing connection pulse |
| `duoReveal` | `translateY(20px) opacity 0 blur(6px)` → `translateY(0) opacity 1 blur(0)` | 320–520ms | enter | Major screen reveals |
| `duoRevealSlow` | `translateY(30px) opacity 0` → `translateY(0) opacity 1` | 520ms+ | enter | Staggered list items |
| `duoWordmarkReveal` | `ls -0.01em opacity 0 blur(8px)` → `ls 0.1em opacity 1 blur(0)` → `ls -0.04em opacity 1 blur(0)` | 400–520ms | — | DUO wordmark intro |
| `duoGlowPulse` | `drop-shadow 8px` ↔ `drop-shadow 24px` | 1600–2000ms | ease-in-out | Velocity readout during live tracking |

### Specific Component Animations
| Component | What animates | Duration | Easing |
|-----------|--------------|----------|--------|
| Button press | `scale(0.98)`, background color | 120ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Tab dot active | dot size 6→10px, color tertiary→accent | 200ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Toggle thumb | `left: 2px` → `left: 22px` | 200ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Toggle track | background color change | 200ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Bottom sheet | `translateY(100%)` → `translateY(0)` | 320ms | enter easing |
| Sheet close | `translateY(0)` → `translateY(100%)` | 320ms | exit easing |
| Sensor left pulse | `duoPulse` loop, delay 0ms | 1200ms | ease-out |
| Sensor right pulse | `duoPulse` loop, delay 300ms | 1200ms | ease-out |
| Sensor bar (connect) | background: gray → gradient | 520ms | standard |
| Exercise clip | `requestAnimationFrame` loop, linear t | clip.duration ms | per-keyframe easeStd |
| Rep bar growth | height animates on new rep data | 200ms | standard |

---

## 8. STATE CHANGES

### Button States
| State | Style Delta |
|-------|------------|
| Default | as specified above |
| Pressed | `scale(0.98)`, bg → pressed color, 120ms |
| Disabled | `opacity: 0.4`, no interaction |

### Chip / Filter Chip States
| State | Background | Text | Border |
|-------|-----------|------|--------|
| Inactive | transparent | `#55555C` | 1px `rgba(255,255,255,0.06)` |
| Active | `#E6FF3D` | `#000000` | none |
| Pressed | `scale(0.98)` | — | — |

### Tracker Chip States
| State | Dot color | Glow | Text |
|-------|-----------|------|------|
| Paired | `#4ADE80` | `0 0 8px #4ADE80` | "DUO · 92%" |
| Unpaired | `#55555C` | none | "Pair tracker" |

### Velocity Display States (Idle vs Live)
| State | Color | Animation |
|-------|-------|-----------|
| Idle | `#E6FF3D` | none |
| Live (new rep) | zone color | `duoGlowPulse` 1600ms |
| Zone changes | color transition 200ms | — |

### Velocity Loss Indicator
| Loss % | Color |
|--------|-------|
| < 20% | `#55555C` (tertiary) |
| ≥ 20% | `#FBBF24` (warning) |
| ≥ 35% | `#F87171` (danger) |

### PairSheet Stages
| Stage | Sensor graphic | Button 1 | Button 2 | Title |
|-------|---------------|----------|----------|-------|
| intro | Static gray dots | "Start pairing" (primary) | "Not now" (bare) | "Pair your DUO" |
| searching | Pulse animation active | "Cancel" (ghost) | — | "Searching…" |
| found | Gradient bar + filled dots | "Done" (primary) | — | "Ready to go" |

### Bilateral Display States
| Condition | Display |
|-----------|---------|
| Balanced (< 2%) | Neutral, no flag |
| Imbalanced (≥ 10%) | Flagged — colored, text "L X% slower" / "R X% slower" |
| Left weaker | Blue text, left label colored |
| Right weaker | Chartreuse text, right label colored |

---

## 9. COPY STRINGS (Exact)

### Navigation
- "Workout" | "History" | "Library" | "Coach" | "Profile"

### Workout Screen (Idle)
- "Peak velocity · last set"
- "0.82" (velocity value — mocked)
- "m/s" (unit)
- "Power zone · strength-speed" (zone label)
- "Session" | "52" | "min"
- "Volume" | "9,432" | "lb" (or "4,280" | "kg")
- "Reps" | "98"
- "Today"
- "Start workout"
- "DUO · 92%" (paired chip)
- "Pair tracker" (unpaired chip)

### PairSheet
- "Pair your DUO" (intro title)
- "Twist to wake both sensors. Hold them near your phone." (intro description)
- "Start pairing" (intro primary button)
- "Not now" (intro bare button)
- "Searching…" (searching title)
- "Looking for sensors on Bluetooth…" (searching description)
- "Cancel" (searching ghost button)
- "Ready to go" (found title)
- "Both sensors connected. Calibrated." (found description)
- "Done" (found primary button)

### History Screen
- "History" (screen title)
- "PR" (badge text, on workout rows and detail)
- "Back" (back navigation)

### Library Screen
- "Library" (screen title)
- "search exercises" (input placeholder — lowercase)
- "No exercises match." (empty state)
- Muscle filters: "Muscle" (label), "Back", "Chest", "Quads", "Delts", "Glutes", "Core"
- Equipment filters: "Equipment" (label), "barbell", "dumbbell", "cable", "bodyweight", "machine"
- "Add to workout" (exercise detail CTA)
- "Back" (back navigation)

### Coach Screen
- "Coach" (screen title)
- "Primed" | "Ready" | "Manage load" | "Back off" | "Recover" (readiness labels)
- "Why?" (button to open adjustment sheet)
- "Start session" (CTA in session card)

### Profile Screen
- "Jordan Lee" (mock athlete name)
- "JL" (initials avatar)
- "128 workouts" (stat)
- "384,200 lb" / "174,300 kg" (volume stat, unit-aware)
- "12 day streak" (stat)
- "3 PRs this month" (stat)
- "Performance" (section header)
- "Goals" (section header / row)
- "Devices" (section header / row)
- "Preferences" (section header / row)
- "Notifications" (section header / row)
- "Data" (section header)
- "Export data" (row)
- "Delete account" (row, danger color)
- "About" (section header)
- "Version 1.0.0 (1)" (about row)
- "Legal" (about row)
- "Units" (preference row)
- "lbs" | "kg" (unit picker options)
- "Rest timer" (preference row)
- "30s" | "60s" | "90s" | "2m" | "3m" | "4m" | "5m" (rest timer options)
- "Haptics" (toggle label)
- "AI Coaching" (toggle label)
- "Notify PRs" (toggle label)
- "Notify streaks" (toggle label)
- "Jordan's DUO" (device name)
- "Just now" (device last seen)
- "2.1.4" (firmware version)
- "L" | "R" (sensor labels)
- "Back" (back navigation)

### Live Tracking
- "LIVE · DUO" (single sensor mode)
- "LIVE · L R" (bilateral mode)
- "awaiting rep…" (no rep yet)
- "L X% slower" | "R X% slower" (bilateral imbalance)
- "Set X of Y" (set counter caption)
- "Pause"
- "Done"

### Velocity Zone Labels
- "Abs. strength" (< 0.50 m/s)
- "Strength" (0.50–0.75 m/s)
- "Power" (0.75–1.00 m/s)
- "Speed-strength" (1.00–1.30 m/s)
- "Speed" (> 1.30 m/s)

---

## 10. ICONS

All icons: SVG, stroke-width 1.75 (unless noted), stroke = `round`, fully stroked (not filled unless noted).

| Name | ViewBox | Path Summary | Fill/Stroke |
|------|---------|-------------|-------------|
| `dumbbell` | 0 0 24 24 | `M3 10v4 M6 8v8 M18 8v8 M21 10v4 M6 12h12` | stroke |
| `history` | 0 0 24 24 | Circle 9 + back arrow + `M12 7v5l3 2` | stroke |
| `library` | 0 0 24 24 | Three stacked book shapes | stroke |
| `coach` | 0 0 24 24 | 5-point star | stroke |
| `profile` | 0 0 24 24 | Circle head + arc shoulders | stroke |
| `bolt` | 0 0 14 14 | Lightning bolt | fill |
| `plus` | 0 0 18 18 | Cross, stroke-width 2 | stroke |
| `arrowRight` | 0 0 16 16 | Line + arrowhead right | stroke |
| `chevron` | 0 0 8 14 | Right-facing angle | stroke |
| `search` | 0 0 20 20 | Circle + diagonal line | stroke |
| `bluetooth` | 0 0 14 14 | Bluetooth logo shape | stroke 1.5 |
| `settings` | 0 0 22 22 | Gear: circle + 8 spokes | stroke |
| `battery` | 0 0 18 10 | Outer rect + fill rect + terminal | stroke + fill |
| `check` | 0 0 16 16 | Checkmark, stroke-width 2 | stroke |
| `close` | 0 0 14 14 | X (two diagonal lines) | stroke |
| `pause` | 0 0 14 14 | Two vertical rects | fill |

**Tab icons at 22px size.** All other UI icons at their natural viewbox scaled to usage context.

---

## 11. LAYOUT

### Screen Structure
```
View (flex: 1, bg: #000000)
  ├── StatusBar area: 54px height (paddingTop: insets.top)
  ├── ScreenHeader: min-height 44px, horizontal padding 24px
  ├── ScrollView (flex: 1)
  │     └── content: paddingHorizontal 24px, paddingBottom 120px
  └── Tab Bar: absolute, bottom 24px, left 16px, right 16px
```

### Three-Stat Grid
```
flexDirection: 'row'
gap: 16px (space.lg)
Each cell: flex 1, paddingTop 12px, borderTopWidth 1, borderTopColor rgba(255,255,255,0.06)
```

### Calendar Grid (History)
```
flexDirection: 'row', flexWrap: 'wrap'
Each cell: width '14.285%' (1/7), aspectRatio 1
Monday-first (offset = (firstDay.getDay() + 6) % 7)
Workout day: bg #E6FF3D, text #000
Today: border 1.5px #E6FF3D, no fill
PR dot: 4px, #E6FF3D, absolute top-right
```

### Exercise Detail Hero
```
height: 240px, bg: bg.surface
Centered AnimatedFigure or icon placeholder
```

### Session Card (Coach)
```
Card with bg.surface, border border.subtle, radius.lg, padding lg
Header: exercise name + intensity + tag pill
Exercise rows: sets × reps · load · intensity, in bodySM
Footer: "Start session" primary button full-width
```

### Readiness Ring (Coach)
```
SVG, 200×200
Background circle: r=90, stroke border.default, strokeWidth 10
Progress arc: r=90, stroke readinessColor, strokeWidth 10,
              strokeDasharray = 2π×90 = 565.49px
              strokeDashoffset = 565.49 × (1 - score/100)
              rotation = -90° (start at top)
Center text: score (32px, 500, fg.primary) + label (13px, fg.tertiary)
```

### Weekly Strip (Coach)
```
flexDirection: 'row', gap 12px, justifyContent: 'center'
7 dots total (Mon–Sun)
Active (today): 10×10, #E6FF3D
Future: 6×6, rgba(255,255,255,0.10)
Past with workout: 6×6, #E6FF3D
Past without: 6×6, rgba(255,255,255,0.10)
```

### Goal Progress Bar (Coach / Profile)
```
Track: height 4px, bg border.subtle, radius 2
Fill: height 4px, bg #E6FF3D, radius 2, width as % of track
```

---

## 12. SVG COMPONENTS

### DuoMark Wordmark
```svg
viewBox="0 0 22 14"
Circle cx=4 cy=7 r=3.5 stroke fg.primary strokeWidth=1.4
Circle cx=18 cy=7 r=3.5 stroke fg.primary strokeWidth=1.4
Path d="M7.5 7h7" stroke fg.primary strokeWidth=1.4 strokeLinecap=round
```
Size prop: width = size + 8, height = size (base size=14 → 22×14)

### Readiness Ring
```svg
width=200 height=200 viewBox="0 0 200 200"
G rotation=-90 origin="100,100"
  Circle cx=100 cy=100 r=90 stroke=border.default strokeWidth=10 fill=none
  Circle cx=100 cy=100 r=90 stroke=readinessColor strokeWidth=10 fill=none
    strokeDasharray={2 * Math.PI * 90}
    strokeDashoffset={(1 - score/100) * 2 * Math.PI * 90}
    strokeLinecap=round
Overlaid View (absolute center):
  Text 32px 500: score value
  Text 13px fg.tertiary: label
```

### Set Sparkline
```svg
Full-width, height 48px
Path: M/L commands through set peakV points, stroke fg.secondary strokeWidth 1.5
Dots: Circle r=3 fill zone-color at each point
```

### Sensor Graphic
```
Width: 220px, Height: 80px (relative layout)
Connecting bar: absolute, top 38px, left 40px, right 40px, height 4px
  Color: gray (intro) → gradient #60A5FA → #E6FF3D (found), transition 520ms
Left dot: circle 80px diameter, centered at x=40
  Outer ring: r=40, stroke border.default or accent.left, opacity 0.3, pulse anim
  Inner circle: r=27 diameter, bg.surface, border 1.5px, label "L"
Right dot: same at x=180, label "R", delay 300ms for pulse
```

---

## 13. GLASSMORPHISM & VISUAL EFFECTS

### Status Chip / Tab Bar Glass (bg.elevated)
In the HTML these use a solid `bg.elevated` (`#141418`) — NOT a true blur/glass effect. The pill tab bar is solid, not frosted.

### Sheet Scrim
```
bg: rgba(0,0,0,0.72)
backdropFilter: blur(8px)   ← NOTE: React Native cannot do backdropFilter. Use solid scrim only.
```

### Live Glow Background
```
Position: absolute, inset: 0, pointerEvents: none
background: radial-gradient(circle at 50% 30%, rgba(230,255,61,0.08) 0%, transparent 60%)
```
⚠️ RN limitation: `radial-gradient` not supported natively. Approximate with a centered `rgba(230,255,61,0.08)` View with large borderRadius and no interaction.

### Active Tab Dot Glow
```
box-shadow: 0 0 8px #E6FF3D
```
In RN: `shadowColor: '#E6FF3D', shadowRadius: 8, shadowOpacity: 1, elevation: 4` (limited fidelity — flag).

### Tracker Dot Glow (Paired)
```
box-shadow: 0 0 8px #4ADE80
```
Same RN limitation as above.

---

## 14. GAPS / FLAGS FOR REVIEW

The following reference values have **no direct RN equivalent** and require a decision before implementation:

| # | Reference behavior | RN limitation | Options |
|---|-------------------|---------------|---------|
| 1 | `backdrop-filter: blur(8px)` on sheet scrim | Not supported in RN | Use solid `rgba(0,0,0,0.72)` scrim only |
| 2 | `radial-gradient` live glow | Not natively supported | Skip, or use `expo-linear-gradient` with approximation |
| 3 | `box-shadow` glow on dots | RN `shadow*` props are limited; no spread/color on Android | Accept degraded fidelity or use `react-native-shadow-2` |
| 4 | `filter: blur(6px)` on `duoReveal` animation | Not supported in RN | Skip blur component, animate only opacity + translateY |
| 5 | `font-variant-numeric: tabular-nums` | Not in RN | JetBrains Mono is inherently tabular — use mono family |
| 6 | `css keyframe` animations | No direct equivalent | Port to Reanimated 2 `withTiming` / `withSequence` |
| 7 | `requestAnimationFrame` exercise clip | Must use Reanimated shared values | Port RAF loop to `useFrameCallback` or `useSharedValue` + `withRepeat` |
| 8 | `duoWordmarkReveal` letter-spacing animation | `letterSpacing` not animatable in RN StyleSheet | Animate opacity + translateY only; skip letter-spacing anim |
| 9 | `backdrop-filter` on iOS keyboard mock | Not needed (native keyboard used in RN) | N/A — skip keyboard mock |
| 10 | CSS `gap` on `flexWrap` containers | Supported in RN ≥ 0.71 — verify version | Check `package.json` RN version |

---

## 15. MOCK DATA SUMMARY

| Field | Value |
|-------|-------|
| Athlete name | "Jordan Lee" |
| Initials | "JL" |
| Total workouts | 128 |
| Total volume | 384,200 lb / 174,300 kg |
| Streak | 12 days |
| PRs this month | 3 |
| Device name | "Jordan's DUO" |
| Last seen | "Just now" |
| Firmware | "2.1.4" |
| Battery | 92% |
| Idle velocity | 0.82 m/s |
| Session duration | 52 min |
| Session volume | 9,432 lb / 4,280 kg |
| Session reps | 98 |
| Zone | Power zone · strength-speed |
| Sleep hours | 6.5 h |
| Soreness | 3 / 5 |
| Back squat 1RM | current / target (kg) |

---

*End of inventory. Review and confirm before Step 2 begins.*
