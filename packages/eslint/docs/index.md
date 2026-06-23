---
layout: home

hero:
  name: "@reliquary/eslint-config"
  text: "Shareable ESLint flat config."
  tagline: A framework-agnostic TypeScript base plus an optional React layer — split so non-React projects never install React tooling.
  actions:
    - theme: brand
      text: Guide
      link: /eslint/eslint-config
    - theme: alt
      text: Base config
      link: /eslint/eslint-config#base-tsjs
    - theme: alt
      text: React layer
      link: /eslint/eslint-config#react-layer

features:
  - title: Framework-agnostic base
    details: "@reliquary/eslint-config bundles TypeScript, stylistic and import-hygiene rules. Plain ESM, no build, no React."
    link: /eslint/eslint-config#base-tsjs
    linkText: Read the base guide
  - title: Opt-in React layer
    details: "@reliquary/eslint-config-react adds React, Jest and Testing Library rules — composed on top, so plain TS/JS projects stay lean."
    link: /eslint/eslint-config#react-layer
    linkText: Read the React guide
  - title: Flat config, composable
    details: Every export is a flat-config array. Spread base, then react, then your own overrides.
    link: /eslint/eslint-config#composing-overrides
    linkText: See composition
  - title: Built for publishing
    details: Plugins are runtime dependencies; eslint is a peer. Published to the @reliquary npm scope.
    link: /eslint/eslint-config#install
    linkText: How to install
---
