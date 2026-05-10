import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'bambu-cli-mcp',
  tagline: 'AI-native 3D printing pipelines via MCP',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://catesandrew.github.io',
  baseUrl: '/bambu-cli-mcp/',

  organizationName: 'catesandrew',
  projectName: 'bambu-cli-mcp',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/catesandrew/bambu-cli-mcp/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'bambu-cli-mcp',
      logo: {
        alt: 'bambu-cli-mcp logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/catesandrew/bambu-cli-mcp',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'BambuStudio Tools',
              to: '/docs/tools/bambu-tools',
            },
            {
              label: 'Geometry Tools',
              to: '/docs/tools/geometry-tools',
            },
          ],
        },
        {
          title: 'Guides',
          items: [
            {
              label: 'Printing Large Models',
              to: '/docs/guides/large-model-printing',
            },
            {
              label: 'Connector System',
              to: '/docs/guides/connectors',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/catesandrew/bambu-cli-mcp',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Andrew Cates. MIT License. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
