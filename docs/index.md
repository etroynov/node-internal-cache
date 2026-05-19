---
pageType: home
hero:
  name: node-internal-cache
  text: Simple and fast NodeJS internal caching
  tagline: A simple caching module that has set, get and delete methods and works a little bit like memcached.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /guide/api
  image:
    src: /logo.png
    alt: node-internal-cache logo
features:
  - title: Simple API
    details: Clean set, get, and delete methods with optional TTL. Works like memcached, but entirely in-memory.
    icon: 🔄
  - title: TTL & Auto Expiry
    details: Keys automatically expire after a configurable TTL. Built-in periodic check cleans expired entries.
    icon: ⏱️
  - title: Clone or Reference
    details: Choose between cloning values for safety or storing references for performance.
    icon: 📦
  - title: Statistics
    details: Built-in tracking of keys, hits, misses, and approximate size in bytes.
    icon: 📊
  - title: Event System
    details: Listen for set, del, expired, flush, and flush_stats events to react to cache changes.
    icon: 🔔
  - title: High Performance
    details: All keys stored in a single object for instant O(1) lookups. Practical limit of ~1M keys.
    icon: 🚀
---
