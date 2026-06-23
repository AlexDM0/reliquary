---
layout: home

hero:
  name: "reliquary"
  text: "A collection of small, type-safe npm packages."
  tagline: One Bun-workspace monorepo gathering independently published packages, grouped by family.
  actions:
    - theme: brand
      text: event-bus
      link: /event-bus/
    - theme: alt
      text: eslint
      link: /eslint/

features:
  - title: "@reliquary/event-bus"
    details: "A tiny, fully type-safe event bus with optional, swappable shared state. Zero dependencies, ships ESM + CJS."
    link: /event-bus/event-bus
    linkText: Read the guide
  - title: "@reliquary/event-bus-react"
    details: "React 18/19 hooks for @reliquary/event-bus — subscribe to events and shared state, bound to your own typed bus instance."
    link: /event-bus/event-bus-react
    linkText: Read the guide
  - title: "@reliquary/eslint-config"
    details: "Shareable, framework-agnostic ESLint 9 flat config — TypeScript, stylistic and import-hygiene rules. Plain ESM, no build."
    link: /eslint/eslint-config
    linkText: Read the guide
  - title: "@reliquary/eslint-config-react"
    details: "React + Jest + Testing Library ESLint rules — the opt-in React layer for @reliquary/eslint-config, composed on top."
    link: /eslint/eslint-config#react-layer
    linkText: Read the guide
---
