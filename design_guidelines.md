# First Principles Tutor Design Guidelines

## Design Approach

**Reference-Based Approach**: Duolingo meets Notion aesthetic
- **Duolingo inspiration**: Playful learning engagement, progress visualization, clean quiz interfaces, encouraging micro-interactions
- **Notion inspiration**: Minimalist layouts, excellent typography hierarchy, spacious content areas, sophisticated data organization
- **Differentiation**: Educational focus with emphasis on conceptual clarity and progressive disclosure of complex topics

## Core Design Elements

### A. Typography
- **Primary Font**: Inter or similar modern sans-serif via Google Fonts
- **Heading Hierarchy**:
  - H1: 3xl-4xl (mobile), 5xl-6xl (desktop), font-bold
  - H2: 2xl-3xl, font-semibold
  - H3: xl-2xl, font-medium
  - Body: base-lg, font-normal, leading-relaxed for readability
- **Special Treatment**: Code snippets and technical terms in monospace (JetBrains Mono)

### B. Layout System
- **Spacing Scale**: Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- **Container Strategy**:
  - Homepage hero: Full-width with max-w-4xl inner content
  - Topic pages: max-w-5xl for optimal reading
  - Admin dashboard: max-w-7xl for data tables
- **Grid System**: 12-column responsive grid, 4-8 gap units between elements

### C. Component Library

**Homepage**
- **Hero Section** (60vh): Centered search bar (max-w-2xl), oversized headline, 3-4 example topic pills below, subtle gradient background
- **How It Works**: 3-column grid (stacks on mobile) with icon, title, description per step
- **Featured Topics**: Masonry-style card grid showcasing popular learning paths
- **Social Proof**: Single-row testimonials with user avatars and quotes
- **CTA Section**: Large centered call-to-action with subscription pricing cards side-by-side

**Topic Learning Page**
- **Progress Header**: Sticky top bar with breadcrumb navigation, progress indicator (percentage bar), bookmark icon
- **Content Sections** (sequential vertical flow):
  1. **First Principles Breakdown**: Large cards with numbered principles, expandable details
  2. **Step-by-Step Explanations**: Alternating left/right layout with text + Mermaid diagrams
  3. **Visual Aids**: Full-width image/diagram placements with captions
  4. **Interactive Quiz**: Card-based multiple choice, instant feedback with explanations, progress dots
  5. **Related Topics**: Horizontal scrollable cards with thumbnails
- **Sidebar** (desktop only): Floating table of contents with scroll spy, estimated time remaining

**Authentication Flows**
- **Modal-based**: Centered overlay (max-w-md) with Replit Auth options displayed as large icon buttons, subtle form inputs for email/password
- **Social Login**: Prominent Google/GitHub buttons with recognizable branding

**Dashboard/Profile**
- **Stats Cards**: 2x2 grid (mobile stacks) showing topics learned, quiz scores, streak days, time invested
- **Learning History**: Timeline view with topic cards, completion status badges
- **Subscription Management**: Clear pricing comparison table, Stripe-powered payment forms

**Admin Panel**
- **Sidebar Navigation**: Fixed left sidebar (collapsible on mobile) with icon + label nav items
- **Data Tables**: Sortable columns, pagination, search filters, action buttons per row
- **Analytics Charts**: Simple bar/line charts for usage metrics

### D. Interactive Elements

**Search Bar**: 
- Large rounded input (h-14 mobile, h-16 desktop) with subtle shadow, search icon prefix
- Auto-suggest dropdown with recent/popular topics

**Cards**:
- Rounded-xl borders, subtle shadow on hover (no animation), padding p-6
- Topic cards include: thumbnail/icon, title (font-semibold), description snippet, difficulty badge, time estimate

**Buttons**:
- Primary: Rounded-lg, px-6 py-3, font-medium
- Secondary: Outlined variant with same dimensions
- Text buttons: Minimal padding, underline on hover
- When over images: Backdrop-blur-md with semi-transparent background

**Quiz Interface**:
- Multiple choice options as large clickable cards (min-h-16)
- Correct answers: green accent border with checkmark
- Incorrect: red accent border with explanation reveal
- Next question: Smooth fade transition

**Progress Indicators**:
- Linear progress bars (h-2, rounded-full)
- Circular progress for quiz completion
- Streak calendars with filled/empty day dots

### E. Animations
**Minimal, purposeful only**:
- Page transitions: Subtle fade (200ms)
- Card hover: Slight scale (1.02) and shadow increase
- Quiz feedback: Gentle shake on wrong answer
- Content reveal: Stagger fade-in for principle cards (100ms delay between)

## Page-Specific Layouts

**Homepage**: Single-page scroll with 6 sections (Hero → How It Works → Featured Topics → Testimonials → Pricing → CTA/Footer), generous vertical spacing (py-20 desktop, py-12 mobile)

**Topic Page**: Long-form scrollable with sticky progress header, sequential sections separated by subtle dividers, right sidebar for navigation on desktop

**Dashboard**: App-like layout with persistent left navigation, main content area with cards/tables

## Images

**Hero Section**: Yes, use a large abstract/conceptual image representing learning/knowledge (e.g., interconnected nodes, light bulb moment, book pages transforming into digital elements). Image should be subtle background with overlay gradient to ensure text readability. Position: Background cover with centered content overlay.

**Topic Cards**: Small square thumbnails (w-20 h-20) representing topic categories (use icons or simple illustrations)

**Testimonials**: Circular avatar images (w-12 h-12) for user photos

**Visual Learning Aids**: Within topic content, use full-width Mermaid-generated diagrams for flowcharts, concept maps, and process visualizations

## Accessibility
- Semantic HTML structure with proper heading hierarchy
- ARIA labels for interactive elements
- Keyboard navigation support (focus states with visible outline)
- Dark mode toggle in header (respects system preference by default)
- Minimum touch target size: 44x44px for mobile
- Text contrast ratios meeting WCAG AA standards

## Responsive Behavior
- Mobile-first breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Stack all multi-column layouts to single column below md breakpoint
- Hamburger menu for navigation on mobile
- Search bar remains prominent on all screen sizes
- Touch-optimized quiz buttons with adequate spacing on mobile