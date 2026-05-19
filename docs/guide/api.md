# API Reference

## SET

`myCache.set(key, val, [ttl])`

Sets a key-value pair. Optional `ttl` in seconds. Returns `true` on success.

```js
obj = { my: "Special", variable: 42 };
success = myCache.set("myKey", obj, 10000);
// true
```

## MSET

`myCache.mset(Array<{key, val, ttl?}>)`

Sets multiple key-value pairs. Returns `true` on success.

```js
const success = myCache.mset([
  { key: "myKey", val: obj, ttl: 10000 },
  { key: "myKey2", val: obj2 },
]);
```

## GET

`myCache.get(key)`

Gets a saved value. Returns `undefined` if not found or expired.

```js
value = myCache.get("myKey");
if (value === undefined) {
  // handle miss!
}
// { my: "Special", variable: 42 }
```

## TAKE

`myCache.take(key)`

Gets the cached value and removes the key from the cache. Equivalent to `get(key)` + `del(key)`.

```js
myCache.set("myKey", "myValue");
value = myCache.take("myKey");
// value === "myValue"; key is deleted
myCache.has("myKey"); // false
```

## MGET

`myCache.mget([ key1, key2, ..., keyn ])`

Gets multiple values. Returns an object of key-value pairs.

```js
value = myCache.mget(["myKeyA", "myKeyB"]);
/*
  {
    "myKeyA": { my: "Special", variable: 123 },
    "myKeyB": { the: "Glory", answer: 42 }
  }
*/
```

## DEL

`myCache.del(key)` or `myCache.del([ key1, key2, ... ])`

Deletes one or multiple keys. Returns the number of deleted entries.

```js
myCache.del("A");
// 1

myCache.del(["B", "C"]);
// 2
```

## TTL

`myCache.ttl(key, ttl)`

Redefines the TTL of a key. Returns `true` if found and changed.

```js
myCache = new NodeCache({ stdTTL: 100 });
changed = myCache.ttl("existentKey", 100);
// true

changed2 = myCache.ttl("missingKey", 100);
// false
```

## getTTL

`myCache.getTtl(key)`

Returns:
- `undefined` if the key does not exist
- `0` if the key has no TTL
- a timestamp in ms representing the expiry time

```js
ts = myCache.getTtl("ttlKey");
// approximately 1456000600000

ts = myCache.getTtl("noTtlKey");
// 0

ts = myCache.getTtl("unknownKey");
// undefined
```

## KEYS

`myCache.keys()`

Returns an array of all existing keys.

```js
mykeys = myCache.keys();
// [ "all", "my", "keys", "foo", "bar" ]
```

## HAS

`myCache.has(key)`

Returns `boolean` indicating if the key is cached.

```js
exists = myCache.has("myKey");
console.log(exists);
```

## getStats

`myCache.getStats()`

Returns cache statistics.

```js
myCache.getStats();
/*
  {
    keys: 0,    // global key count
    hits: 0,    // global hit count
    misses: 0,  // global miss count
    ksize: 0,   // global key size in bytes
    vsize: 0    // global value size in bytes
  }
*/
```

## flushAll

`myCache.flushAll()`

Flushes all cached data.

```js
myCache.flushAll();
myCache.getStats();
// { keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }
```

## flushStats

`myCache.flushStats()`

Flushes only the statistics.

```js
myCache.flushStats();
```

## close

`myCache.close()`

Clears the interval timeout set by the check period option.

```js
myCache.close();
```
