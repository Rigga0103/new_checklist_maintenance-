---
description: Codebase Architecture and Folder Structure Rules
---

This document defines the rules and conventions for maintaining the codebase. Any developer or LLM agent working on this project MUST follow these guidelines.

---

## 1. Project Root Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (dashboard)/              # Dashboard layout group
│   │   └── (system)/             # System modules group
│   │       └── [feature-name]/   # Feature routes (kebab-case)
│   │           └── page.tsx      # Page component (imports from features/)
│   └── layout.tsx                # Root layout
├── components/                   # Shared/common UI components
│   └── common/                   # Reusable UI primitives
├── features/                     # Feature-based modules (main business logic)
│   └── [featureName]/            # Feature folder (camelCase or descriptive)
│       └── [subFeature]/         # Sub-feature folder
├── store/                        # Redux store configuration
└── utils/                        # Global utility functions
```

---

## 2. Feature Folder Structure

Every feature and sub-feature MUST follow this folder pattern:

```
src/features/[featureName]/[subFeature]/
├── components/                   # UI components for this feature
│   ├── Main[SubFeature].tsx      # Main entry component (PascalCase)
│  ├── [ComponentName].tsx       # Sub-components (PascalCase)
│   └── ...
├── hooks/                        # Custom React hooks
│   └── use[HookName].ts          # Hook files (camelCase, prefixed with 'use')
├── server/                       # Server-related code
│   ├── api/                      # API client functions (Axios)
│   │   └── [featureName]Api.ts
│   └── tanstackQuery/            # TanStack Query hooks
│       └── use[FeatureName]Queries.ts
├── types/                        # TypeScript type definitions
│   └── types.ts                  # Feature-specific types
├── schemas/                      # Zod or validation schemas
├── slice/                        # Redux slices (if applicable)
├── utils/                        # Feature-specific utility functions
└── index.ts                      # Feature exports
```

### Example: HR FMS Structure

```
src/features/hr/
├── dashboard/
│   ├── components/
│   │   └── MainDashboard.tsx
│   ├── hooks/
│   ├── server/
│   │   ├── api/
│   │   └── tanstackQuery/
│   ├── types/
│   │   └── types.ts
│   ├── schemas/
│   ├── slice/
│   └── index.ts
├── employee/
│   ├── components/
│   │   └── MainEmployee.tsx
│   ├── hooks/
│   ├── server/
│   │   ├── api/
│   │   └── tanstackQuery/
│   ├── types/
│   │   └── types.ts
│   ├── schemas/
│   ├── slice/
│   └── index.ts
└── ... (other sub-features)
```

---

## 3. Naming Conventions

### Files & Folders

| Item                | Convention                     | Example                                                      |
| ------------------- | ------------------------------ | ------------------------------------------------------------ |
| Feature folders     | camelCase or descriptive       | `leadToOrder`, `checklist&deligation`, `hr`                  |
| Sub-feature folders | camelCase                      | `dashboard`, `leads`, `callTracker`, `employee`              |
| Component files     | PascalCase                     | `MainLeads.tsx`, `BasicInfoSection.tsx`, `MainDashboard.tsx` |
| Hook files          | camelCase with `use` prefix    | `useLeadForm.ts`, `useDashboardMetrics.ts`                   |
| Type files          | `types.ts`                     | `types/types.ts`                                             |
| API files           | camelCase with `Api` suffix    | `leadsApi.ts`, `dashboardApi.ts`                             |
| Query hook files    | camelCase with `use...Queries` | `useLeadsQueries.ts`, `useDashboardQueries.ts`               |

### Components

- Main entry components: `Main[SubFeatureName].tsx` (e.g., `MainLeads.tsx`, `MainDashboard.tsx`, `MainEmployee.tsx`)
- Sub-components: Descriptive PascalCase names (e.g., `BasicInfoSection.tsx`, `ContactPersonSection.tsx`)

### Hooks

- All hooks MUST start with `use` prefix (e.g., `useLeadForm`, `useDashboardMetrics`, `useEmployeeData`)
- Hooks should encapsulate all state and logic from components

### Types

- Interfaces: PascalCase (e.g., `LeadFormData`, `ContactPerson`, `EmployeeData`)
- Type aliases: PascalCase (e.g., `DropdownOptions`)

---

## 4. Code Organization Rules

### 4.1 Separation of Concerns

1. **Components** should ONLY handle:
   - JSX rendering
   - Importing and using hooks
   - Composing sub-components

2. **Hooks** should handle:
   - All `useState` declarations
   - All `useEffect` logic
   - Event handlers
   - Data fetching/mutation logic
   - Computed/derived values

3. **Types** should be defined in `types/types.ts` and imported where needed.

### 4.2 Component Structure Pattern

```tsx
// MainLeads.tsx - Example main component
"use client";

import { useLeadForm } from "../hooks/useLeadForm";
import { BasicInfoSection } from "./BasicInfoSection";
import { DetailsSection } from "./DetailsSection";
// ... other imports

function Leads() {
  const { formData, handlers, ... } = useLeadForm();

  return (
    <div>
      <BasicInfoSection formData={formData} handlers={handlers} />
      <DetailsSection formData={formData} handlers={handlers} />
      {/* ... */}
    </div>
  );
}

export default Leads;
```

### 4.3 Hook Structure Pattern

```ts
// useLeadForm.ts - Example hook
import { useState, useEffect } from "react";
import { LeadFormData } from "../types/types";

export function useLeadForm() {
  // State declarations
  const [formData, setFormData] = useState<LeadFormData>({...});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Effects
  useEffect(() => { /* fetch data */ }, []);

  // Handlers
  const handleChange = (e: React.ChangeEvent<...>) => { ... };
  const handleSubmit = async (e: React.FormEvent) => { ... };

  // Return organized object
  return {
    formData,
    isSubmitting,
    handlers: { handleChange, handleSubmit },
    // ... other exports
  };
}
```

---

## 5. Technology Stack Rules

### 5.1 Framework & Libraries

- **Framework**: Next.js 14+ with App Router
- **State Management**: Redux Toolkit (global), React useState (local)
- **Data Fetching**: TanStack Query (React Query) with Axios
- **Notifications**: `sonner` (use `toast.success()`, `toast.error()`)
- **Styling**: Tailwind CSS
- **Language**: TypeScript (strict mode)

### 5.2 Client/Server Components

- Add `"use client";` directive at the top of any component that uses:
  - `useState`, `useEffect`, `useContext`
  - Event handlers (`onClick`, `onChange`, etc.)
  - Browser APIs

### 5.3 Data Fetching

- Use TanStack Query hooks in `server/tanstackQuery/`
- API functions go in `server/api/`
- Mock data should be used during local development (no Supabase unless specified)

---

## 6. Page Routing Pattern

### App Router Structure

```
src/app/(dashboard)/(system)/[feature-name]/[sub-feature]/page.tsx
```

### Page Component Pattern

```tsx
// page.tsx
import MainLeads from "@/features/leadToOrder/leads/components/MainLeads";

export default function LeadsPage() {
  return <MainLeads />;
}
```

---

## 7. Import Rules

### Absolute Imports

Use `@/` alias for absolute imports:

```ts
import { Button } from "@/components/common/Button_ui";
import { LeadFormData } from "@/features/leadToOrder/leads/types/types";
import MainDashboard from "@/features/hr/dashboard/components/MainDashboard";
```

### Relative Imports within Feature

Use relative paths within the same feature:

```ts
import { useLeadForm } from "../hooks/useLeadForm";
import { ContactPerson } from "../types/types";
```

---

## 8. Common Patterns

### 8.1 Form Handling

- Define form data interface in `types/types.ts`
- Create a dedicated hook (e.g., `useLeadForm.ts`) for form logic
- Split large forms into section components

### 8.2 Dropdown/Select Options

- Store dropdown options in hook state
- Fetch from API or use mock data in hook's `useEffect`

### 8.3 API Responses & Notifications

- Every API response (Success or Error) MUST be displayed using `sonner` toasts.
- For success: Use `toast.success(data.message)` or a descriptive success message.
- For error: Use `toast.error(error.message)` for user-facing errors.
- Use `console.error()` for developer logs.
- Wrap async operations in try-catch or handle through TanStack Query `onSuccess`/`onError` callbacks.

---

## 9. File Creation Checklist

When creating a new sub-feature:

- [ ] Create folder: `src/features/[feature]/[subFeature]/`
- [ ] Create `components/Main[SubFeature].tsx`
- [ ] Create `hooks/use[SubFeature].ts` (or descriptive name)
- [ ] Create `types/types.ts` with interfaces
- [ ] Create `server/api/[name]Api.ts` (if API needed)
- [ ] Create `server/tanstackQuery/use[Name]Queries.ts` (if queries needed)
- [ ] Create `index.ts` with exports
- [ ] Create page in `src/app/(dashboard)/(system)/[route]/page.tsx`

---

## 10. DO NOT

- ❌ Put all logic in one main component file
- ❌ Create top-level folders under features/[feature]/ (e.g., `features/hr/components/`)
- ❌ Use `any` type without justification
- ❌ Skip `"use client"` directive for client components
- ❌ Use inline styles (use Tailwind classes)
- ❌ Use deprecated patterns like `getServerSideProps`
- ❌ Import from `AuthContext` (use `sonner` for notifications)
- ❌ Hardcode API URLs (use environment variables)
- ❌ Use gradient backgrounds on buttons (e.g., `bg-gradient-to-r from-purple-600 to-pink-600`) - use solid colors instead (e.g., `bg-green-600`)

---

## 11. DO

- ✅ Extract logic to custom hooks
- ✅ Define types in `types/types.ts`
- ✅ Split large components into smaller sub-components
- ✅ Follow the folder structure exactly (each sub-feature has its own components/, hooks/, server/, etc.)
- ✅ Use PascalCase for components, camelCase for hooks
- ✅ Use `toast` from `sonner` for notifications
- ✅ Use TanStack Query for server state
- ✅ Add proper TypeScript type annotations
- ✅ Create `index.ts` exports for each sub-feature

---

## Example Reference Files

- Hook: `src/features/leadToOrder/leads/hooks/useLeadForm.ts`
- Types: `src/features/leadToOrder/leads/types/types.ts`
- Main Component: `src/features/leadToOrder/leads/components/MainLeads.tsx`
- Sub-Component: `src/features/leadToOrder/leads/components/BasicInfoSection.tsx`
- HR Dashboard: `src/features/hr/dashboard/components/MainDashboard.tsx`
- Checklist QuickTask: `src/features/checklist&deligation/quicktask/components/main_checklist&deligation_components_QuickTaskClient.tsx`
