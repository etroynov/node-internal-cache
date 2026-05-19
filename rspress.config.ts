import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: 'docs',
  base: '/node-internal-cache/',
  title: 'node-internal-cache',
  description: 'Simple and fast NodeJS internal caching. Node internal in memory cache like memcached.',
  icon: '/logo.png',
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/etroynov/node-internal-cache',
      },
    ],
    footer: {
      message: 'MIT Licensed',
    },
  },
});
