![Logo](./logo/logo.png)

[![Node.js CI](https://github.com/etroynov/node-internal-cache/workflows/Node.js%20CI/badge.svg?branch=master)](https://github.com/etroynov/node-internal-cache/actions?query=workflow%3A%22Node.js+CI%22+branch%3A%22master%22)
[![NPM package version](https://img.shields.io/npm/v/node-internal-cache?label=npm%20package)](https://www.npmjs.com/package/node-internal-cache)
![NPM package size](https://img.shields.io/bundlephobia/min/node-internal-cache)
[![GitHub issues](https://img.shields.io/github/issues/etroynov/node-cache)](https://github.com/etroynov/node-internal-cache/issues)
[![Coveralls Coverage](https://img.shields.io/coveralls/node-internal-cache/node-cache.svg)](https://coveralls.io/github/node-internal-cache/node-cache)

# Simple and fast NodeJS internal caching.

A simple caching module that has `set`, `get` and `delete` methods and works a little bit like memcached.
Keys can have a timeout (`ttl`) after which they expire and are deleted from the cache.
All keys are stored in a single object so the practical limit is at around 1m keys.

## Why node-internal-cache ?

According to the [Declaration to not sell out](https://github.com/node-cache/node-cache?tab=readme-ov-file#declaration-to-not-sell-out) from the original repository, the `node-cache` package is no longer supported and the authors understandably do not plan to give the repository to other hands, they also recommended that anyone who wants to continue working on the project should create a fork, which is the reason why this project was created.

This project is an important part of our products, but since it is unsupported it is slowly becoming obsolete and requires support and regular maintenance, so it was decided to provide this project with ongoing support.

## BREAKING MAJOR RELEASE v5.x

The recent 5.6.0 release:
* boundMethodCheck was removed as part of the legacy code
* Added Event on missed in get [#223](https://github.com/node-cache/node-cache/pull/223)
* Added Event on take in take

The recent 5.5.0 release:
* Clone pkg removed from the project

The recent 5.4.0 release:
* rewritten from Javascript -> Typescript

The recent 5.3.0 release:
* rewritten from ES5 -> ES6, IIFE -> CommonJS
* updated docs

The recent 5.2.0 release:
* dropped support for node versions before 18.x!
* rewritten from coffescript to javascripts 
* name changed node-cache -> node-internal-cache

The recent 5.x release:
* dropped support for node versions before 8.x!
* removed the callback-based api from all methods (you can re-enable them with the option `enableLegacyCallbacks`)

## BREAKING MAJOR RELEASE v6.x UPCOMING

Although not breaking per definition, our typescript rewrite will change internal functions and their names.
Please get in contact with us, if you are using some parts of node-cache's internal api so we can work something out!


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


## Breaking changes

### version `2.x`

Due to the [Issue #11](https://github.com/mpneuried/nodecache/issues/11) the return format of the `.get()` method has been changed!

Instead of returning an object with the key `{ "myKey": "myValue" }` it returns the value itself `"myValue"`.

### version `3.x`

Due to the [Issue #30](https://github.com/mpneuried/nodecache/issues/30) and [Issue #27](https://github.com/mpneuried/nodecache/issues/27) variables will now be cloned.
This could break your code, because for some variable types ( e.g. Promise ) its not possible to clone them.
You can disable the cloning by setting the option `useClones: false`. In this case it's compatible with version `2.x`.

### version `5.x`

Callbacks are deprecated in this version. They are still useable when enabling the `enableLegacyCallbacks` option when initializing the cache. Callbacks will be completely removed in `6.x`.

## Compatibility

Node-Cache supports all node versions >= 8

## Release History
|Version|Date|Description|
|:--:|:--:|:--|
|5.1.2|2020-07-01|[#195] type definition for `.take()` and typo fixes, thx [shhadi](https://github.com/shhadi)!, [#198]/[#197] error when setting a value in a js environment without `Buffer` in global scope, thanks [jdussouillez](https://github.com/jdussouillez) and [Sirz3chs](https://github.com/Sirz3chs) for your help|
|5.1.1|2020-06-06|[#184], [#183] thanks [Jonah Werre](https://github.com/jwerre) for reporting [#181]!, [#180], Thanks [Titus](https://github.com/tstone) for [#169]!, Thanks [Ianfeather](https://github.com/Ianfeather) for [#168]!, Thanks [Adam Haglund](https://github.com/BeeeQueue) for [#176]|
|5.1.0|2019-12-08|Add .take() from PR [#160] and .flushStats from PR [#161]. Thanks to [Sujesh Thekkepatt](https://github.com/sujeshthekkepatt) and [Gopalakrishna Palem](https://github.com/KrishnaPG)!|
|5.0.2|2019-11-17|Fixed bug where expired values were deleted even though `deleteOnExpire` was set to `false`. Thanks to [fielding-wilson](https://github.com/fielding-wilson)!|
|5.0.1|2019-10-31|Fixed bug where users could not set null values. Thanks to [StefanoSega](https://github.com/StefanoSega), [jwest23](https://github.com/jwest23) and [marudor](https://github.com/marudor)!|
|5.0.0|2019-10-23|Remove lodash dependency, add .has(key) and .mset([{key,val,ttl}]) methods to the cache. Thanks to [Regev Brody](https://github.com/regevbr) for PR [#132] and [Sujesh Thekkepatt](https://github.com/sujeshthekkepatt) for PR [#142]! Also thank you, to all other contributors that remain unnamed here!|
|4.2.1|2019-07-22|Upgrade lodash to version 4.17.15 to suppress messages about unrelated security vulnerability|
|4.2.0|2018-02-01|Add options.promiseValueSize for promise value. Thanks to [Ryan Roemer](https://github.com/ryan-roemer) for the pull [#84]; Added option `deleteOnExpire`; Added DefinitelyTyped Typescript definitions. Thanks to [Ulf Seltmann](https://github.com/useltmann) for the pulls [#90] and [#92]; Thanks to [Daniel Jin](https://github.com/danieljin) for the readme fix in pull [#93];  Optimized test and ci configs.|
|4.1.1|2016-12-21|fix internal check interval for node < 0.10.25, thats the default node for ubuntu 14.04. Thanks to [Jimmy Hwang](https://github.com/JimmyHwang) for the pull [#78](https://github.com/mpneuried/nodecache/pull/78); added more docker tests|
|4.1.0|2016-09-23|Added tests for different key types; Added key validation (must be `string` or `number`); Fixed `.del` bug where trying to delete a `number` key resulted in no deletion at all.|
|4.0.0|2016-09-20|Updated tests to mocha; Fixed `.ttl` bug to not delete key on `.ttl( key, 0 )`. This is also relevant if `stdTTL=0`. *This causes the breaking change to `4.0.0`.*|
|3.2.1|2016-03-21|Updated lodash to 4.x.; optimized grunt |
|3.2.0|2016-01-29|Added method `getTtl` to get the time when a key expires. See [#49](https://github.com/mpneuried/nodecache/issues/49)|
|3.1.0|2016-01-29|Added option `errorOnMissing` to throw/callback an error o a miss during a `.get( "key" )`. Thanks to [David Godfrey](https://github.com/david-byng) for the pull [#45](https://github.com/mpneuried/nodecache/pull/45). Added docker files and a script to run test on different node versions locally|
|3.0.1|2016-01-13|Added `.unref()` to the checkTimeout so until node `0.10` it's not necessary to call `.close()` when your script is done. Thanks to [Doug Moscrop](https://github.com/dougmoscrop) for the pull [#44](https://github.com/mpneuried/nodecache/pull/44).|
|3.0.0|2015-05-29|Return a cloned version of the cached element and save a cloned version of a variable. This can be disabled by setting the option `useClones:false`. (Thanks for #27 to [cheshirecatalyst](https://github.com/cheshirecatalyst) and for #30 to [Matthieu Sieben](https://github.com/matthieusieben))|
|~~2.2.0~~|~~2015-05-27~~|REVOKED VERSION, because of conficts. See [Issue #30](https://github.com/mpneuried/nodecache/issues/30). So `2.2.0` is now `3.0.0`|
|2.1.1|2015-04-17|Passed old value to the `del` event. Thanks to [Qix](https://github.com/qix) for the pull.|
|2.1.0|2015-04-17|Changed get miss to return `undefined` instead of an error. Thanks to all [#11](https://github.com/mpneuried/nodecache/issues/11) contributors |
|2.0.1|2015-04-17|Added close function (Thanks to [ownagedj](https://github.com/ownagedj)). Changed the development environment to use grunt.|
|2.0.0|2015-01-05|changed return format of `.get()` with a error return on a miss and added the `.mget()` method. *Side effect: Performance of .get() up to 330 times faster!*|
|1.1.0|2015-01-05|added `.keys()` method to list all existing keys|
|1.0.3|2014-11-07|fix for setting numeric values. Thanks to [kaspars](https://github.com/kaspars) + optimized key ckeck.|
|1.0.2|2014-09-17|Small change for better ttl handling|
|1.0.1|2014-05-22|Readme typos. Thanks to [mjschranz](https://github.com/mjschranz)|
|1.0.0|2014-04-09|Made `callback`s optional. So it's now possible to use a syncron syntax. The old syntax should also work well. Push : Bugfix for the value `0`|
|0.4.1|2013-10-02|Added the value to `expired` event|
|0.4.0|2013-10-02|Added nodecache events|
|0.3.2|2012-05-31|Added Travis tests|

[![NPM](https://nodei.co/npm-dl/node-cache.png?months=6)](https://nodei.co/npm/node-internal-cache/)

# The MIT License (MIT)

Copyright © 2019 Mathias Peter and the node-cache maintainers, https://github.com/node-internal-cache/node-cache
Copyright © 2025 Evgenii Troinov and the node-cache/node-internal-cache maintainers, https://github.com/etroynov/node-cache

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
