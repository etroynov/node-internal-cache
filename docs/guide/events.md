# Events

## set

Fired when a key has been added or changed.

```js
myCache.on("set", function(key, value) {
  // ... do something ...
});
```

## del

Fired when a key has been removed manually or due to expiry.

```js
myCache.on("del", function(key, value) {
  // ... do something ...
});
```

## expired

Fired when a key expires.

```js
myCache.on("expired", function(key, value) {
  // ... do something ...
});
```

## flush

Fired when the cache has been flushed.

```js
myCache.on("flush", function() {
  // ... do something ...
});
```

## flush_stats

Fired when the cache stats have been flushed.

```js
myCache.on("flush_stats", function() {
  // ... do something ...
});
```
