# LLMs.txt

How to get AI tools like Cursor, Claude, ChatGPT, and GitHub Copilot to understand node-internal-cache.

## What is LLMs.txt?

We support LLMs.txt files for making the node-internal-cache documentation available to large language models (LLMs). This feature helps AI tools better understand the caching library, its API, and usage patterns.

## Available Routes

We provide the following LLMs.txt routes to help AI tools access our documentation:

- `llms.txt` — Contains a structured overview of the cache API and documentation links
- `llms-full.txt` — Comprehensive documentation including implementation details and examples

## Usage with AI Tools

### Cursor

Use the **@Docs** feature in Cursor to include the documentation in your project. This helps Cursor provide more accurate code suggestions for node-internal-cache.

### Claude / ChatGPT

Reference the documentation URL when prompting:

```
Refer to the node-internal-cache docs at https://etroynov.github.io/node-internal-cache/
```

### Other AI Tools

Any AI tool that supports LLMs.txt can use these routes to better understand node-internal-cache. Simply point your tool to the documentation base URL.
