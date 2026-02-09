# React & Next.js Performance / UX Rules

## (AI Editor Instruction Context File)

### Purpose

This document defines rules the AI must follow when generating or modifying code in a React / Next.js project.
The goal is to ensure optimal UI responsiveness, scalable data handling, and modern React architecture usage.

The AI MUST prioritize:

* Non-blocking UI rendering
* Component-level loading states
* Efficient data fetching
* Proper pagination strategies
* Modern React & Next.js features

---

# 1️⃣ Rendering & Loading Behavior

## 1.1 Never Block Entire UI

* DO NOT freeze or replace the entire page with a loading screen when fetching data.
* Loading states MUST be scoped to the smallest meaningful component boundary.
* Only the component that depends on the data should display loading feedback.

### Required Approaches

* Use Suspense boundaries where applicable
* Use skeleton placeholders instead of spinners
* Preserve layout stability during loading

### Example Intent

* Table loading → table skeleton only
* Card loading → card skeleton only
* Sidebar unaffected → remains interactive

---

## 1.2 Skeleton UI Requirement

* Prefer skeleton loaders over spinners
* Skeleton must match final layout dimensions
* Avoid layout shift between loading and loaded state

Skeleton should:

* Preserve spacing
* Maintain alignment
* Reflect typography blocks

---

## 1.3 Progressive Rendering

If multiple independent data sources exist:

* Render components as data becomes available
* DO NOT wait for all requests to finish
* Split fetch boundaries logically

---

# 2️⃣ React Data Handling Rules

## 2.1 Avoid Fetching Inside Render Logic

* Never fetch directly inside component body
* Use proper hooks or server data methods

Allowed:

* React Query / TanStack Query
* Next Server Components
* useEffect (only when justified)

---

## 2.2 Memoization

AI MUST consider:

* useMemo for heavy computation
* useCallback for stable handlers
* React.memo for stable UI blocks

But:

* Do NOT over-memoize trivial logic

---

## 2.3 Component Isolation

* Split large components
* Keep state localized
* Avoid unnecessary parent re-renders

Target:

* High cohesion
* Low coupling

---

# 3️⃣ Next.js Specific Rules

## 3.1 Server vs Client Components

Prefer:

Server Components for:

* Data fetching
* Static rendering
* SEO content
* Heavy logic

Client Components for:

* Interactivity
* State
* Event handling

AI must not mark components as `"use client"` unless required.

---

## 3.2 Streaming & Suspense

Where supported:

* Use streaming UI
* Wrap async components with Suspense
* Provide fallback skeletons

---

## 3.3 Route-Level Loading

* Use route loading files ONLY for navigation-level fetches
* Never rely solely on route loading for component fetch states

---

# 4️⃣ Large Data Handling

## 4.1 Pagination (MANDATORY)

When data size grows:

AI MUST use TanStack pagination strategies

### Requirements

* Client pagination only for small datasets
* Server pagination for large datasets
* Maintain page state
* Cache pages when possible

### Never:

* Load entire large datasets at once
* Render massive arrays without control

---

## 4.2 Virtualization

If list size is large:

Use virtualization strategies:

* Window rendering
* Viewport-based rendering

---

# 5️⃣ UX Responsiveness

## 5.1 Preserve Interactivity

User should always be able to:

* Scroll
* Navigate
* Click unrelated UI
* Open menus

Even while data loads

---

## 5.2 Optimistic UI (When Applicable)

For mutations:

* Update UI immediately
* Rollback on failure

---

## 5.3 Error Boundaries

Each async section must handle:

* Error state UI
* Retry mechanism
* No crash propagation

---

# 6️⃣ Performance Priorities

## AI Optimization Order

1. Prevent blocking UI
2. Reduce re-renders
3. Minimize network payload
4. Stream data when possible
5. Lazy load components
6. Code split routes

---

# 7️⃣ Code Generation Expectations

When producing code, AI MUST:

✅ Implement localized loading states
✅ Use skeleton placeholders
✅ Structure fetch boundaries
✅ Apply pagination where needed
✅ Separate server/client concerns
✅ Maintain responsive UX
✅ Avoid unnecessary global state
✅ Avoid monolithic components

AI MUST NOT:

❌ Block entire UI
❌ Load large datasets blindly
❌ Use full-screen spinners
❌ Fetch in render body
❌ Overuse `"use client"`
❌ Create tightly coupled components

---

# Final Directive

All generated UI must feel:

* Instant
* Responsive
* Progressive
* Stable
* Scalable

The AI should assume production-scale data and real users — not demo-level datasets — when designing solutions.

---
