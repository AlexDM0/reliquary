---
layout: home

hero:
  name: "@reliquary/event-bus"
  text: "A tiny, type-safe event bus."
  tagline: Zero-dependency TypeScript core plus React 18/19 hooks bound to your bus instance.
  actions:
    - theme: brand
      text: Concepts
      link: /event-bus/concepts
    - theme: alt
      text: Core guide
      link: /event-bus/event-bus
    - theme: alt
      text: React guide
      link: /event-bus/event-bus-react

features:
  - title: Pure-TS core
    details: "@reliquary/event-bus ships ESM + CJS with bundled types and zero runtime dependencies."
    link: /event-bus/event-bus
    linkText: Read the core guide
  - title: React hooks
    details: "@reliquary/event-bus-react binds 18/19-compatible hooks to a bus instance — it imports nothing from the core at runtime."
    link: /event-bus/event-bus-react
    linkText: Read the React guide
  - title: Lossy by design
    details: Events are fire-and-forget; shared state is what persists. Understand the mental model before you build.
    link: /event-bus/concepts
    linkText: Learn the concepts
  - title: Built for publishing
    details: Bun workspaces, tsdown bundles, Changesets, and attw + publint gate every release.
    link: /event-bus/architecture
    linkText: See the architecture
---
