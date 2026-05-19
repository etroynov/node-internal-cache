<p align="center">
  <img src="./logo/logo.png" alt="Logo">
</p>

<p align="center">
  <a href="https://github.com/etroynov/node-internal-cache/actions/workflows/node.js.yml?query=branch%3Amaster"><img src="https://github.com/etroynov/node-internal-cache/actions/workflows/node.js.yml/badge.svg?branch=master" alt="Node.js CI"></a>
  <a href="https://www.npmjs.com/package/node-internal-cache"><img src="https://img.shields.io/npm/v/node-internal-cache?label=npm%20package" alt="NPM package version"></a>
  <a href="https://github.com/etroynov/node-internal-cache/issues"><img src="https://img.shields.io/github/issues/etroynov/node-internal-cache" alt="GitHub issues"></a>
</p>

# Simple and fast NodeJS internal caching.

A simple caching module that has `set`, `get` and `delete` methods and works a little bit like memcached.
Keys can have a timeout (`ttl`) after which they expire and are deleted from the cache.
All keys are stored in a single object so the practical limit is at around 1m keys.

## Why node-internal-cache ?

According to the [Declaration to not sell out](https://github.com/node-cache/node-cache?tab=readme-ov-file#declaration-to-not-sell-out) from the original repository, the `node-cache` package is no longer supported and the authors understandably do not plan to give the repository to other hands, they also recommended that anyone who wants to continue working on the project should create a fork, which is the reason why this project was created.

This project is an important part of our products, but since it is unsupported it is slowly becoming obsolete and requires support and regular maintenance, so it was decided to provide this project with ongoing support.

See [CHANGELOG.md](./CHANGELOG.md) for breaking changes, release history, and migration guides.


# Install

```bash
npm install node-internal-cache --save
```

# Examples:

## Initialize (INIT):

```js
const NodeCache = require( "node-internal-cache" );
const myCache = new NodeCache();
```

### Options

- `stdTTL`: *(default: `0`)* the standard ttl as number in seconds for every generated cache element.
`0` = unlimited
- `checkperiod`: *(default: `600`)* The period in seconds, as a number, used for the automatic delete check interval.
`0` = no periodic check.
- `useClones`: *(default: `true`)* en/disable cloning of variables. If `true` you'll get a copy of the cached variable. If `false` you'll save and get just the reference.  
**Note:**
	- `true` is recommended if you want **simplicity**, because it'll behave like a server-based cache (it caches copies of plain data).
	- `false` is recommended if you want to achieve **performance** or save mutable objects or other complex types with mutability involved and wanted, because it'll only store references of your data.
	- _Here's a [simple code example](https://runkit.com/mpneuried/useclones-example-83) showing the different behavior_
- `deleteOnExpire`: *(default: `true`)* whether variables will be deleted automatically when they expire.
If `true` the variable will be deleted. If `false` the variable will remain. You are encouraged to handle the variable upon the event `expired` by yourself.
- `enableLegacyCallbacks`: *(default: `false`)* re-enables the usage of callbacks instead of sync functions. Adds an additional `cb` argument to each function which resolves to `(err, result)`. will be removed in node-internal-cache v6.x.
- `maxKeys`: *(default: `-1`)* specifies a maximum amount of keys that can be stored in the cache. If a new item is set and the cache is full, an error is thrown and the key will not be saved in the cache. -1 disables the key limit.

```js
const NodeCache = require( "node-internal-cache" );
const myCache = new NodeCache( { stdTTL: 100, checkperiod: 120 } );
```

**Since `4.1.0`**:
*Key-validation*: The keys can be given as either `string` or `number`, but are casted to a `string` internally anyway.
All other types will throw an error.

## Store a key (SET):

`myCache.set( key, val, [ ttl ] )`

Sets a `key` `value` pair. It is possible to define a `ttl` (in seconds).
Returns `true` on success.

```js
obj = { my: "Special", variable: 42 };

success = myCache.set( "myKey", obj, 10000 );
// true
```

> Note: If the key expires based on it's `ttl` it will be deleted entirely from the internal data object.


## Store multiple keys (MSET):

`myCache.mset(Array<{key, val, ttl?}>)`

Sets multiple `key` `val` pairs. It is possible to define a `ttl` (seconds).
Returns `true` on success.

```js
const obj = { my: "Special", variable: 42 };
const obj2 = { my: "other special", variable: 1337 };

const success = myCache.mset([
	{key: "myKey", val: obj, ttl: 10000},
	{key: "myKey2", val: obj2},
])
```

## Retrieve a key (GET):

`myCache.get( key )`

Gets a saved value from the cache.
Returns a `undefined` if not found or expired.
If the value was found it returns the `value`.

```js
value = myCache.get( "myKey" );
if ( value == undefined ){
	// handle miss!
}
// { my: "Special", variable: 42 }
```

**Since `2.0.0`**:

The return format changed to a simple value and a `ENOTFOUND` error if not found *( as result instance of `Error` )

**Since `2.1.0`**:

The return format changed to a simple value, but a due to discussion in #11 a miss shouldn't return an error.
So after 2.1.0 a miss returns `undefined`.

## Take a key (TAKE):

`myCache.take( key )`

get the cached value and remove the key from the cache.  
Equivalent to calling `get(key)` + `del(key)`.  
Useful for implementing `single use` mechanism such as OTP, where once a value is read it will become obsolete.

```js
myCache.set( "myKey", "myValue" )
myCache.has( "myKey" ) // returns true because the key is cached right now
value = myCache.take( "myKey" ) // value === "myValue"; this also deletes the key
myCache.has( "myKey" ) // returns false because the key has been deleted
```

## Get multiple keys (MGET):

`myCache.mget( [ key1, key2, ..., keyn ] )`

Gets multiple saved values from the cache.
Returns an empty object `{}` if not found or expired.
If the value was found it returns an object with the `key` `value` pair.

```js
value = myCache.mget( [ "myKeyA", "myKeyB" ] );
/*
	{
		"myKeyA": { my: "Special", variable: 123 },
		"myKeyB": { the: "Glory", answer: 42 }
	}
*/
```

**Since `2.0.0`**:

The method for mget changed from `.get( [ "a", "b" ] )` to `.mget( [ "a", "b" ] )`

## Delete a key (DEL):

`myCache.del( key )`

Delete a key. Returns the number of deleted entries. A delete will never fail.

```js
value = myCache.del( "A" );
// 1
```

## Delete multiple keys (MDEL):

`myCache.del( [ key1, key2, ..., keyn ] )`

Delete multiple keys. Returns the number of deleted entries. A delete will never fail.

```js
value = myCache.del( "A" );
// 1

value = myCache.del( [ "B", "C" ] );
// 2

value = myCache.del( [ "A", "B", "C", "D" ] );
// 1 - because A, B and C not exists
```

## Change TTL (TTL):

`myCache.ttl( key, ttl )`

Redefine the ttl of a key. Returns true if the key has been found and changed. Otherwise returns false.
If the ttl-argument isn't passed the default-TTL will be used.

The key will be deleted when passing in a `ttl < 0`.

```js
myCache = new NodeCache( { stdTTL: 100 } )
changed = myCache.ttl( "existentKey", 100 )
// true

changed2 = myCache.ttl( "missingKey", 100 )
// false

changed3 = myCache.ttl( "existentKey" )
// true
```

## Get TTL (getTTL):

`myCache.getTtl( key )`

Receive the ttl of a key.
You will get:
- `undefined` if the key does not exist
- `0` if this key has no ttl
- a timestamp in ms representing the time at which the key will expire

```js
myCache = new NodeCache( { stdTTL: 100 } )

// Date.now() = 1456000500000
myCache.set( "ttlKey", "MyExpireData" )
myCache.set( "noTtlKey", "NonExpireData", 0 )

ts = myCache.getTtl( "ttlKey" )
// ts wil be approximately 1456000600000

ts = myCache.getTtl( "ttlKey" )
// ts wil be approximately 1456000600000

ts = myCache.getTtl( "noTtlKey" )
// ts = 0

ts = myCache.getTtl( "unknownKey" )
// ts = undefined
```

## List keys (KEYS)

`myCache.keys()`

Returns an array of all existing keys.

```js
mykeys = myCache.keys();

console.log( mykeys );
// [ "all", "my", "keys", "foo", "bar" ]
```

## Has key (HAS)

`myCache.has( key )`

Returns boolean indicating if the key is cached.

```js
exists = myCache.has( 'myKey' );

console.log( exists );
```

## Statistics (STATS):

`myCache.getStats()`

Returns the statistics.

```js
myCache.getStats();
	/*
		{
			keys: 0,    // global key count
			hits: 0,    // global hit count
			misses: 0,  // global miss count
			ksize: 0,   // global key size count in approximately bytes
			vsize: 0    // global value size count in approximately bytes
		}
	*/
```

## Flush all data (FLUSH):

`myCache.flushAll()`

Flush all data.

```js
myCache.flushAll();
myCache.getStats();
	/*
		{
			keys: 0,    // global key count
			hits: 0,    // global hit count
			misses: 0,  // global miss count
			ksize: 0,   // global key size count in approximately bytes
			vsize: 0    // global value size count in approximately bytes
		}
	*/
```

## Flush the stats (FLUSH STATS):

`myCache.flushStats()`

Flush the stats.

```js
myCache.flushStats();
myCache.getStats();
	/*
		{
			keys: 0,    // global key count
			hits: 0,    // global hit count
			misses: 0,  // global miss count
			ksize: 0,   // global key size count in approximately bytes
			vsize: 0    // global value size count in approximately bytes
		}
	*/
```

## Close the cache:

`myCache.close()`

This will clear the interval timeout which is set on check period option.

```js
myCache.close();
```

# Events

## set

Fired when a key has been added or changed.
You will get the `key` and the `value` as callback argument.

```js
myCache.on( "set", function( key, value ){
	// ... do something ...
});
```

## del

Fired when a key has been removed manually or due to expiry.
You will get the `key` and the deleted `value` as callback arguments.

```js
myCache.on( "del", function( key, value ){
	// ... do something ...
});
```

## expired

Fired when a key expires.
You will get the `key` and `value` as callback argument.

```js
myCache.on( "expired", function( key, value ){
	// ... do something ...
});
```

## flush

Fired when the cache has been flushed.

```js
myCache.on( "flush", function(){
	// ... do something ...
});
```

## flush_stats

Fired when the cache stats has been flushed.

```js
myCache.on( "flush_stats", function(){
	// ... do something ...
});
```


## License

This project is [MIT licensed](./LICENSE).
