import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// Single umbrella site for the whole reliquary collection.
// The site shell (this config + the landing page in `docs/`) lives here, but each
// family's actual markdown lives inside its package (`packages/<family>/docs/`).
// `srcDir: '..'` makes the monorepo root the content root so those in-package pages
// are part of one site; `rewrites` maps them to clean URLs (`/<family>/...`).
//
// Project Pages site: https://alexdm0.github.io/reliquary/
// `base` must match the repo name so assets resolve under the sub-path.
export default withMermaid(defineConfig({
  base: '/reliquary/',
  srcDir: '..',
  // Everything under the repo root that is NOT a docs page (so srcDir: '..' doesn't
  // turn package READMEs / changelogs / top-level notes into stray pages).
  srcExclude: [
    '**/README.md',
    '**/CHANGELOG.md',
    'RELEASE.md',
    '**/CLAUDE.md',
    'review.md',
  ],
  // Map the umbrella landing and each family's in-package docs to clean URLs.
  rewrites: {
    'docs/index.md': 'index.md',
    'packages/event-bus/docs/:page': 'event-bus/:page',
    'packages/eslint/docs/:page': 'eslint/:page',
  },
  title: 'reliquary',
  description: 'A collection of small, type-safe npm packages.',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/reliquary/favicon.svg', type: 'image/svg+xml' }],
  ],
  themeConfig: {
    nav: [
      { text: 'event-bus', link: '/event-bus/' },
      { text: 'eslint', link: '/eslint/' },
    ],
    sidebar: {
      '/event-bus/': [
        {
          text: 'Overview',
          items: [
            { text: 'Concepts', link: '/event-bus/concepts' },
            { text: 'Architecture', link: '/event-bus/architecture' },
          ],
        },
        {
          text: 'Core — @reliquary/event-bus',
          items: [
            { text: 'Guide', link: '/event-bus/event-bus' },
            { text: 'Event flow', link: '/event-bus/event-flow' },
          ],
        },
        {
          text: 'React — @reliquary/event-bus-react',
          items: [
            { text: 'Guide', link: '/event-bus/event-bus-react' },
            { text: 'Data flow', link: '/event-bus/react-data-flow' },
          ],
        },
      ],
      '/eslint/': [
        {
          text: 'eslint',
          items: [
            { text: 'Guide', link: '/eslint/eslint-config' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/AlexDM0/reliquary' },
    ],
    search: { provider: 'local' },
    editLink: {
      // :path is relative to srcDir (the repo root), so it already points at the
      // real in-package file, e.g. packages/event-bus/docs/concepts.md.
      pattern: 'https://github.com/AlexDM0/reliquary/edit/main/:path',
      text: 'Edit this page on GitHub',
    },
  },
}))
