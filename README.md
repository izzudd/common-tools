# Common Tools (DevPocket) 🧰

[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt&labelColor=020420)](https://nuxt.com)
[![Nuxt UI](https://img.shields.io/badge/Nuxt_UI-v4-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&labelColor=0f172a)](https://tailwindcss.com)
[![Bun](https://img.shields.io/badge/Bun-1.3+-fbf0df?logo=bun&labelColor=18181b)](https://bun.sh)
[![Client-Side Only](https://img.shields.io/badge/Execution-100%25_Client--Side-10B981?logo=shield&labelColor=064e3b)](#-privacy--security-guarantee)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A fast, lightweight, and privacy-first suite of client-side developer utilities. Format JSON, inspect complex payload trees, sanitize strings, encode/decode data, and manipulate text—all without sending a single byte over the wire.

---

## 🔒 Privacy & Security Guarantee

Most online formatters and conversion utilities log your requests or route your payloads through remote servers. **Common Tools runs 100% in your browser**:

- **Zero Network Transmission**: All operations rely purely on native browser Web APIs and local JavaScript.
- **Zero Telemetry & Analytics**: No third-party trackers, no cookies, and no logging scripts.
- **Isolated Component State**: Input states are stored strictly in local page memory and clear immediately on navigation, ensuring credentials, tokens, and sensitive internal payloads stay secure.

---

## ✨ Features & Included Utilities

### 1. JSON Tools (`/json/*`)
- **Beautifier & Minifier (`/json/beautifier`)**:
  - Indent with 2 spaces, 4 spaces, or tabs.
  - Minify and compress payloads into single lines.
  - Alphabetically sort keys recursively.
  - Instant syntax validation with informative inline error pointers.
- **Interactive Visualizer (`/json/visualizer`)**:
  - Hierarchical, collapsible tree node view.
  - Color-coded type indicators (`string`, `number`, `boolean`, `null`, `array`, `object`).
  - Search and filter keys or values across deeply nested objects.
  - Expand/collapse all nodes with a single click.
- **Stringify & JSONify (`/json/stringify`)**:
  - Convert raw JSON into escaped, inline JSON strings (ideal for `.env`, CLI args, or JSON-inside-JSON).
  - Unescape serialized strings back into clean, parsed JSON objects.

### 2. String Tools (`/string/*`)
- **Escaper & Unescaper (`/string/escaper`)**:
  - **HTML Entities**: Encode special characters (`<`, `>`, `&`, `"`, `'`) or decode back to raw HTML.
  - **URL / URI Components**: Encode/decode query params with `encodeURIComponent` & `encodeURI`.
  - **Regular Expressions**: Escape regex meta-characters (`.*+?^${}()|[]\`) for dynamic pattern builders.
  - **C-Style Slashes**: Handle quotes, backslashes, tabs, and newlines.
  - **Base64**: UTF-8 safe Base64 encoding and decoding.
- **Whitespace Remover (`/string/whitespace`)**:
  - Trim leading and trailing whitespace.
  - Collapse multiple spaces into single spaces.
  - Strip tabs and extra blank lines.
  - Remove all whitespace entirely.

### 3. Ergonomic Developer Experience
- **Sample Data Pre-loaders**: Quickly test each tool with built-in realistic payloads.
- **Copy to Clipboard**: One-click copying with automatic toast notifications.
- **Quick Keyboard Search**: Search tools by name, description, or keyword tags right from the home dashboard.
- **Dark & Light Mode**: High-contrast, easy-on-the-eyes interface built on Nuxt UI.
- **Mobile Responsive**: Full sidebar navigation on desktop with slideover drawer support on mobile.

---

## 🛠️ Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) (Single Page Application, `ssr: false`)
- **UI Components & Icons**: [@nuxt/ui](https://ui.nuxt.com/) v4 & [@iconify-json/lucide](https://lucide.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Language**: TypeScript (Strict Mode)
- **Linting & Formatting**: ESLint with `@nuxt/eslint`

---

## 🚀 Getting Started

Ensure you have [Bun](https://bun.sh) installed (`>= 1.3.0`).

### 1. Clone the repository

```bash
git clone git@github.com:izzudd/common-tools.git
cd common-tools
```

### 2. Install dependencies

```bash
bun install
```

### 3. Start development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Production

Generate a static client-side bundle:

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

### Code Quality & Verification

Run linter:

```bash
bun run lint
```

Run TypeScript verification:

```bash
bun run typecheck
```

---

## 📁 Project Structure

```text
common-tools/
├── app/
│   ├── assets/css/        # Tailwind CSS entrypoint
│   ├── components/        # Reusable components (ToolHeader, etc.)
│   ├── config/            # Centralized tool registry (tools.ts)
│   ├── layouts/           # Default layout with responsive sidebar
│   ├── pages/             # Tool pages & home directory
│   │   ├── index.vue      # Tool search & catalog dashboard
│   │   ├── json/          # JSON utilities
│   │   └── string/        # String utilities
│   └── types/             # Shared TypeScript interfaces
├── nuxt.config.ts         # Nuxt 4 configuration (SSR disabled)
├── package.json
└── README.md
```

---

## 🤝 Adding a New Tool

1. Create a page component in `app/pages/<category>/<tool-name>.vue`.
2. Register the tool metadata (name, path, icon, keywords) in `app/config/tools.ts`.
3. Use the shared `<ToolHeader>` component for consistent action buttons (Sample, Clear, Copy).
4. Run `bun run lint` and `bun run typecheck` to verify your changes.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
