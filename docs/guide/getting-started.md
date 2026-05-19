# Getting Started

## Install

```bash
npm install node-internal-cache --save
```

## Initialize

```js
const NodeCache = require("node-internal-cache");
const myCache = new NodeCache();
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stdTTL` | `number` | `0` | Standard ttl in seconds for every generated cache element. `0` = unlimited |
| `checkperiod` | `number` | `600` | Period in seconds for the automatic delete check interval. `0` = no periodic check |
| `useClones` | `boolean` | `true` | En/disable cloning of variables. `true` returns a copy. `false` saves and returns just the reference |
| `deleteOnExpire` | `boolean` | `true` | Whether variables will be deleted automatically when they expire |
| `enableLegacyCallbacks` | `boolean` | `false` | Re-enables usage of callbacks instead of sync functions |
| `maxKeys` | `number` | `-1` | Maximum amount of keys. `-1` disables the limit |

```js
const NodeCache = require("node-internal-cache");
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });
```

> Since `4.1.0`: keys can be given as `string` or `number`, but are cast to `string` internally. All other types throw an error.
