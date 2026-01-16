# AI Agent Builder Design Guidelines

## Design Approach
**Reference-Based**: Drawing from Bolna's structured approach combined with Linear's clean professionalism and Notion's form clarity. This is a utility-first productivity tool requiring precision and clear information hierarchy.

## Layout Architecture

**Sidebar Navigation (Fixed Left)**
- Width: 280px (desktop), collapsible to 64px icon-only on tablet
- Sections: Agent Library, Templates, Settings, Documentation
- Active state highlighting with subtle background treatment
- Project/agent switcher at top with search capability

**Main Content Area (Right)**
- Max-width: 1400px with horizontal padding
- Three-column configuration grid for Transcriber/LLM/Synthesizer sections
- Each column: equal width on desktop, stacks on mobile/tablet

**Header Bar**
- Fixed top, full width
- Left: Breadcrumb navigation (Home > Agent Builder > [Agent Name])
- Right: Save/Deploy actions, user avatar, help icon
- Height: 64px

## Typography System

**Font Stack**: Inter (primary) via Google Fonts, system-ui fallback
- Headings: 600 weight
- Body: 400 weight  
- Labels/UI: 500 weight

**Scale**:
- Page title: text-2xl (24px)
- Section headers: text-lg (18px)
- Form labels: text-sm (14px)
- Input text: text-base (16px)
- Helper text: text-xs (12px)

## Spacing Primitives
**Core units**: 2, 4, 6, 8, 12, 16 (Tailwind scale)
- Component padding: p-6
- Section gaps: gap-8
- Input spacing: space-y-4
- Card padding: p-8

## Component Library

**Configuration Cards**
- Background: subtle elevated surface
- Border radius: rounded-lg
- Padding: p-8
- Shadow: soft, minimal elevation
- Header with icon + title + description

**Form Elements**
- Input fields: Full-width with clear labels above
- Dropdowns: Custom styled with chevron indicator
- Toggles: Switch style for boolean options
- Text areas: Auto-expanding for prompts/instructions
- Validation: Inline error states below fields

**Task Flow Visualization**
- Horizontal pipeline diagram showing Transcriber → LLM → Synthesizer flow
- Connected nodes with status indicators
- Positioned below header, above configuration sections

**Action Buttons**
- Primary: Filled, prominent (Save, Deploy)
- Secondary: Outlined (Cancel, Reset)
- Tertiary: Ghost style (Additional options)
- Icon buttons: 40x40px touch targets

**Sidebar Elements**
- Agent list: Card-style items with hover elevation
- Quick actions: Icon + label format
- Grouped navigation with subtle dividers

## Navigation Patterns
- Tabbed interface within configuration sections for advanced settings
- Expandable/collapsible sections for complex configurations
- Sticky section headers during scroll

## Data Display
- Status badges: Small, rounded pills for agent states (Active, Draft, Error)
- Configuration preview cards showing current settings at a glance
- Metrics dashboard: Compact stats for usage/performance

## Images Section
**No hero image** - This is a productivity tool interface, not marketing.

**In-app imagery**:
- Empty state illustrations: Place centered in configuration sections when no agent exists (400x300px, simple line art style)
- Template preview thumbnails: 240x180px cards in template gallery
- Icon library: Use Heroicons throughout for consistent visual language

## Responsive Behavior
- Desktop (1024px+): Full three-column layout with expanded sidebar
- Tablet (768-1023px): Two-column config layout, collapsible sidebar
- Mobile (<768px): Single column stack, hamburger menu sidebar

## Animation Guidelines
**Minimal and purposeful only**:
- Sidebar collapse/expand: 200ms ease
- Dropdown menus: 150ms ease-out
- No scroll animations or parallax effects
- Focus on instant feedback for interactions