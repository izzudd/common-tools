# DevPocket Project Learnings & Knowledge Base

## Preferences
- **Runtime & Tooling**: Strictly enforce Bun as runtime and package manager (`packageManager: "bun@1.3.13"`).
- **Framework & Types**: Nuxt 4 with `future: { compatibilityVersion: 4 }` default structure (`app/` root directory) and strictly enforced TypeScript (`typescript: { strict: true }`).
- **Styling**: Tailwind CSS v4 with `@nuxt/ui` v4 design system, preserving minimal dependencies and clean UI patterns.

## Workflows
- **Client-Side Only**: Nuxt configuration must specify `ssr: false` to guarantee 100% in-browser execution with zero backend persistence, tracking, or telemetry.
- **Page State Isolation**: Avoid global stores for user input text. Maintain working state exclusively within each page component's local `ref`s so navigating away resets input and prevents cross-tool data pollution.
- **Component Ergonomics**: Every tool page includes standard `ToolHeader` offering "Load Sample Data", "Clear", and "Copy to Clipboard" with toast feedback and graceful inline error recovery.
- **Extensible Navigation**: Tool catalog is centrally managed via `app/config/tools.ts`, automatically powering both desktop collapsible sidebar and responsive mobile slideover drawers.
- **Collapsible Sidebar Ergonomics**: When using `USidebar` with `collapsible="icon"`, always bind slot states (`#header="{ state }"`, `#default="{ state }"`, `#footer="{ state }"`) and pass `:collapsed="state === 'collapsed'"` with `:tooltip="true"` and `:popover="true"` to `UNavigationMenu` so category popovers and tooltips render cleanly without overflowing horizontal rail bounds.

## Constraints
- Do not introduce server persistence, remote databases, or backend mutations.
- Ensure performant handling of large strings and JSON payloads using native browser Web APIs (`Blob`, `TextEncoder`, `JSON.parse/stringify`).
- All code must pass `bun run lint` (ESLint) and `bun run typecheck` cleanly.
