# BasicsTutor.com Design Guidelines

## Design Approach

**Reference-Based Approach**: Apple product pages meet Google Material Design 3
- **Apple inspiration**: Generous white space, refined typography, sophisticated minimalism, premium feel, soft gradients, human-centered messaging
- **Google MD3 inspiration**: Adaptive color systems, dynamic elevation, purposeful motion, warm and approachable aesthetics
- **Differentiation**: Premium educational platform emphasizing clarity, trust, and delightful simplicity

## Core Design Elements

### A. Typography
- **Primary Font**: SF Pro Display (fallback: Inter) for headings, SF Pro Text (fallback: Inter) for body via Google Fonts
- **Heading Hierarchy**:
  - H1: 4xl-5xl (mobile), 6xl-7xl (desktop), font-semibold, tracking-tight, leading-tight
  - H2: 3xl-4xl, font-semibold, tracking-tight
  - H3: xl-2xl, font-medium
  - Body: lg (18px), font-normal, leading-relaxed (1.75) for exceptional readability
- **Special Treatment**: Code/technical terms in JetBrains Mono with subtle rounded background
- **Warm Copy**: Use conversational, encouraging language ("Let's explore" vs "Learn", "Your journey" vs "Progress")

### B. Layout System
- **Spacing Scale**: Tailwind units of 4, 6, 8, 12, 16, 24, 32, 40 for generous breathing room
- **Container Strategy**:
  - Homepage sections: max-w-6xl with py-24 to py-40 spacing between sections
  - Content pages: max-w-4xl for optimal reading (prose-like)
  - Dashboard: max-w-7xl
- **Vertical Rhythm**: Consistent py-32 (desktop) / py-20 (mobile) section padding

### C. Component Library

**Homepage (8 Sections)**

1. **Hero Section** (80vh): Full-width gradient background (soft purple-to-violet radial), centered content (max-w-3xl), oversized headline, subtitle with leading-relaxed, primary CTA + secondary "See how it works" link, subtle floating product screenshot mockup
   
2. **Trust Indicators**: Single row of 4-5 subtle logo badges (universities, companies), centered, grayscale with low opacity

3. **How It Works**: 3 large cards in horizontal layout (stacks mobile), each with icon (w-16 h-16 in soft circle), headline, description, generous p-12 padding, subtle shadow

4. **Feature Showcase**: Alternating left/right sections (3 features), each with large image/screenshot on one side, text content on other, py-24 spacing between

5. **Interactive Demo**: Full-width embedded quiz example with live interaction preview, backdrop showing sample learning interface

6. **Social Proof**: 3-column testimonial grid with generous cards (p-8), circular avatars (w-16 h-16), quote text, name + role

7. **Pricing**: Side-by-side comparison cards (max 2 plans), rounded-2xl borders, featured plan with subtle purple gradient background, clear feature lists, prominent CTA buttons

8. **Final CTA**: Centered section with compelling headline, description, large primary button, subtle text link below

**Topic Learning Page**

- **Hero Header**: Full-width with subtle gradient, breadcrumb nav, topic title (text-5xl), estimated time + difficulty badges, "Start Learning" CTA
- **Progress Bar**: Sticky top bar (backdrop-blur-lg) showing percentage completion, minimalist design
- **Content Flow** (sequential):
  1. **Introduction Card**: Large rounded card (p-12) with overview text, learning objectives list
  2. **First Principles** (3-5 cards): Numbered cards with generous spacing (gap-8), expandable sections with smooth transitions
  3. **Visual Explanations**: Full-width Mermaid diagrams with captions, alternating with text blocks (max-w-3xl)
  4. **Interactive Quiz**: Single question at a time, large answer cards (min-h-24), instant feedback with green/red subtle accents, explanation reveal, progress dots
  5. **Summary Card**: Key takeaways with checkmarks
  6. **Related Topics**: 3-4 horizontal cards with thumbnails, hover lift effect
- **Floating TOC** (desktop): Right sidebar (w-64) with scroll-spy, smooth scrolling links

**Authentication**

- **Centered Modal**: max-w-md card with p-10, headline, Replit Auth + social login buttons (large, rounded-xl, icon + text), subtle divider with "or", minimal form inputs

**Dashboard**

- **Header**: Welcome message with user name, current streak indicator, quick search
- **Stats Grid**: 2x2 cards (lg:grid-cols-4 for single row) with large numbers, icons, subtle backgrounds
- **Recent Activity**: Timeline-style list with topic cards, completion badges
- **Continue Learning**: Horizontal scroll of in-progress topics with progress bars
- **Recommendations**: 3-column grid of suggested topics

**Admin Panel**

- **Sidebar**: Fixed left (w-64), icon + label navigation, subtle active state with purple accent
- **Content Area**: Data tables with clean rows, sortable headers, search + filters, action menus
- **Analytics**: Card-based metrics with simple charts, KPIs highlighted

### D. Interactive Elements

**Buttons**:
- Primary: rounded-full, px-8 py-4, font-medium, soft purple gradient background, white text
- Secondary: rounded-full, outlined with purple border, px-8 py-4
- Buttons over images: backdrop-blur-md, bg-white/20, dark:bg-black/20, rounded-full
- No hover states on blurred buttons

**Cards**: 
- rounded-2xl, p-8 to p-12, shadow-sm, hover:shadow-md transition, border border-gray-100

**Search**:
- Extra-large input (h-16), rounded-full, subtle shadow, icon prefix, auto-suggest dropdown with generous spacing

**Progress Indicators**:
- Thin bars (h-1.5), rounded-full, purple gradient fill
- Circular progress with stroke-2 thickness

**Quiz Cards**:
- Large clickable areas (p-6), rounded-xl, border-2, hover:border-purple-300 transition
- Correct: border-green-400 with checkmark icon
- Incorrect: border-red-400 with gentle explanation reveal

### E. Animations

**Subtle and purposeful**:
- Page transitions: 300ms fade
- Card hover: translate-y-[-4px] with shadow increase
- Section reveals: Staggered fade-in on scroll (150ms delays)
- Quiz feedback: Smooth color transition (400ms)
- No animations on blurred buttons over images

## Images

**Hero Section**: Yes - large, high-quality abstract imagery representing learning/knowledge discovery. Soft focus background with overlay gradient (purple-to-transparent) ensuring text remains crisp. Alternatively, floating product screenshot with subtle shadow.

**Feature Sections**: High-fidelity product screenshots showing interface in use, with subtle device frames or floating card presentation

**Testimonial Avatars**: Circular photos (w-16 h-16) with subtle border

**Topic Thumbnails**: Rounded square icons (w-24 h-24) with subtle backgrounds representing categories

## Accessibility

- Semantic HTML throughout
- ARIA labels on all interactive elements
- Keyboard navigation with visible focus rings (ring-2 ring-purple-400)
- Dark mode with equally premium aesthetic (deep backgrounds, refined contrast)
- Touch targets minimum 48px
- WCAG AA contrast ratios maintained

## Responsive Behavior

- Mobile-first with breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- All grids stack to single column below md
- Hamburger menu with slide-out drawer on mobile
- Maintain generous spacing on mobile (reduce by 40%)
- Touch-optimized inputs and buttons