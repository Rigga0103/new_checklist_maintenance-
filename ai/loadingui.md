# Next.js Dashboard Data Loading Rules

## Objective

Ensure dashboard UI renders immediately while dynamic data loads asynchronously to improve perceived performance and user interaction.

---

## Core Principles

### 1. Never Block Entire Page Rendering

* Do NOT show full page loading spinners
* Static layout must render instantly
* Sidebar, header, cards, containers should be visible immediately

---

### 2. Use Suspense Boundaries

Wrap dynamic components with Suspense.

Example:

* Static shell outside Suspense
* Data components inside Suspense

Benefits:

* Streaming UI
* Partial hydration
* Faster first paint

---

### 3. Use Skeleton Loaders

Replace spinners with layout-matching placeholders.

Requirements:

* Match real component size
* Use subtle animation
* Avoid layout shift

---

### 4. Separate Static vs Dynamic Content

Static Content:

* Navigation
* Page structure
* Titles
* Card containers

Dynamic Content:

* Charts
* Metrics
* Tables
* Live status

Static must render first.

---

### 5. Data Fetching Strategy

Preferred:

* Server Components
* Edge caching
* Incremental revalidation

Avoid:

* Fetching everything on client mount
* Blocking initial render

---

### 6. Caching Strategy

Use:

* fetch cache options
* revalidate intervals

Goals:

* Reduce server load
* Instant repeat navigation
* Faster hydration

---

### 7. Progressive Enhancement

Load in this order:

1. Static Layout
2. Skeleton State
3. Partial Data
4. Fully Interactive State

---

### 8. UX Standards

* No sudden layout jumps
* Smooth transitions
* Predictable loading regions
* Maintain visual stability

---

## Result

Following these rules ensures:

* Professional SaaS experience
* Higher perceived speed
* Better user engagement
* Improved Core Web Vitals
* Scalable dashboard architecture
