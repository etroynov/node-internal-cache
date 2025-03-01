/**
 * node-internal-cache 5.3.0 ( 2025-02-28 )
 * https://github.com/etroynov/node-cache
 *
 * Released under the MIT license
 * https://github.com/etroynov/node-cache/blob/master/LICENSE
 *
 * Maintained by  ( Evgenii Troinov<troinof@gmail.com> )
 */

const clone = require("clone");
const { EventEmitter } = require("events");

// Helper function to check if the method is bound correctly
const boundMethodCheck = (instance, Constructor) => {
	if (!(instance instanceof Constructor)) {
		throw new Error("Bound instance method accessed before binding");
	}
};

class NodeCache extends EventEmitter {
	constructor(options = {}) {
		super();

		// Bind all public methods to the instance
		this.get = this.get.bind(this);
		this.mget = this.mget.bind(this);
		this.set = this.set.bind(this);
		this.fetch = this.fetch.bind(this);
		this.mset = this.mset.bind(this);
		this.del = this.del.bind(this);
		this.take = this.take.bind(this);
		this.ttl = this.ttl.bind(this);
		this.getTtl = this.getTtl.bind(this);
		this.keys = this.keys.bind(this);
		this.has = this.has.bind(this);
		this.getStats = this.getStats.bind(this);
		this.flushAll = this.flushAll.bind(this);
		this.flushStats = this.flushStats.bind(this);
		this.close = this.close.bind(this);
		this._checkData = this._checkData.bind(this);
		this._check = this._check.bind(this);
		this._isInvalidKey = this._isInvalidKey.bind(this);
		this._wrap = this._wrap.bind(this);
		this._getValLength = this._getValLength.bind(this);
		this._error = this._error.bind(this);
		this._initErrors = this._initErrors.bind(this);

		this.options = options;
		this._initErrors();

		// Cache storage
		this.data = {};

		// Default options
		this.options = {
			forceString: false,
			objectValueSize: 80,
			promiseValueSize: 80,
			arrayValueSize: 40,
			stdTTL: 0,
			checkperiod: 600,
			useClones: true,
			deleteOnExpire: true,
			enableLegacyCallbacks: false,
			maxKeys: -1,
			...this.options,
		};

		// Legacy callback support (to be removed in the future)
		if (this.options.enableLegacyCallbacks) {
			console.warn(
				"WARNING! node-cache legacy callback support will drop in v6.x",
			);
			["get", "mget", "set", "del", "ttl", "getTtl", "keys", "has"].forEach(
				(methodKey) => {
					const oldMethod = this[methodKey];
					this[methodKey] = (...args) => {
						const cb = args.pop();
						if (typeof cb === "function") {
							try {
								const res = oldMethod(...args);
								cb(null, res);
							} catch (err) {
								cb(err);
							}
						} else {
							return oldMethod(...args, cb);
						}
					};
				},
			);
		}

		// Container for statistics
		this.stats = {
			hits: 0,
			misses: 0,
			keys: 0,
			ksize: 0,
			vsize: 0,
		};

		// Allowed key types
		this.validKeyTypes = ["string", "number"];

		// Start periodic data check
		this._checkData();
	}

	get(key) {
		boundMethodCheck(this, NodeCache);
		if (this._isInvalidKey(key)) {
			throw this._error("EKEYTYPE", { type: typeof key });
		}
		if (this.data[key] != null && this._check(key, this.data[key])) {
			this.stats.hits++;
			return this._unwrap(this.data[key]);
		} else {
			this.stats.misses++;
			return undefined;
		}
	}

	mget(keys) {
		boundMethodCheck(this, NodeCache);
		if (!Array.isArray(keys)) {
			throw this._error("EKEYSTYPE");
		}
		const oRet = {};
		for (const key of keys) {
			if (this._isInvalidKey(key)) {
				throw this._error("EKEYTYPE", { type: typeof key });
			}
			if (this.data[key] != null && this._check(key, this.data[key])) {
				this.stats.hits++;
				oRet[key] = this._unwrap(this.data[key]);
			} else {
				this.stats.misses++;
			}
		}
		return oRet;
	}

	set(key, value, ttl) {
		boundMethodCheck(this, NodeCache);
		if (this.options.maxKeys > -1 && this.stats.keys >= this.options.maxKeys) {
			throw this._error("ECACHEFULL");
		}
		if (this.options.forceString && typeof value !== "string") {
			value = JSON.stringify(value);
		}
		if (ttl == null) {
			ttl = this.options.stdTTL;
		}
		if (this._isInvalidKey(key)) {
			throw this._error("EKEYTYPE", { type: typeof key });
		}
		let existent = false;
		if (this.data[key]) {
			existent = true;
			this.stats.vsize -= this._getValLength(
				this._unwrap(this.data[key], false),
			);
		}
		this.data[key] = this._wrap(value, ttl);
		this.stats.vsize += this._getValLength(value);
		if (!existent) {
			this.stats.ksize += this._getKeyLength(key);
			this.stats.keys++;
		}
		this.emit("set", key, value);
		return true;
	}

	fetch(key, ttl, value) {
		boundMethodCheck(this, NodeCache);
		if (this.has(key)) {
			return this.get(key);
		}
		if (typeof value === "undefined") {
			value = ttl;
			ttl = undefined;
		}
		const ret = typeof value === "function" ? value() : value;
		this.set(key, ret, ttl);
		return ret;
	}

	mset(keyValueSet) {
		boundMethodCheck(this, NodeCache);
		if (
			this.options.maxKeys > -1 &&
			this.stats.keys + keyValueSet.length >= this.options.maxKeys
		) {
			throw this._error("ECACHEFULL");
		}

		// Input array validation
		for (const keyValuePair of keyValueSet) {
			const { key, val, ttl } = keyValuePair;
			if (ttl && typeof ttl !== "number") {
				throw this._error("ETTLTYPE");
			}
			if (this._isInvalidKey(key)) {
				throw this._error("EKEYTYPE", { type: typeof key });
			}
		}
		for (const keyValuePair of keyValueSet) {
			const { key, val, ttl } = keyValuePair;
			this.set(key, val, ttl);
		}
		return true;
	}

	del(keys) {
		boundMethodCheck(this, NodeCache);
		if (!Array.isArray(keys)) {
			keys = [keys];
		}
		let delCount = 0;
		for (const key of keys) {
			if (this._isInvalidKey(key)) {
				throw this._error("EKEYTYPE", { type: typeof key });
			}
			if (this.data[key] != null) {
				this.stats.vsize -= this._getValLength(
					this._unwrap(this.data[key], false),
				);
				this.stats.ksize -= this._getKeyLength(key);
				this.stats.keys--;
				delCount++;
				const oldVal = this.data[key];
				delete this.data[key];
				this.emit("del", key, oldVal.v);
			}
		}
		return delCount;
	}

	take(key) {
		boundMethodCheck(this, NodeCache);
		const ret = this.get(key);
		if (ret != null) {
			this.del(key);
		}
		return ret;
	}

	ttl(key, ttl) {
		boundMethodCheck(this, NodeCache);
		ttl = ttl || this.options.stdTTL;
		if (!key) {
			return false;
		}
		if (this._isInvalidKey(key)) {
			throw this._error("EKEYTYPE", { type: typeof key });
		}
		if (this.data[key] != null && this._check(key, this.data[key])) {
			if (ttl >= 0) {
				this.data[key] = this._wrap(this.data[key].v, ttl, false);
			} else {
				this.del(key);
			}
			return true;
		} else {
			return false;
		}
	}

	getTtl(key) {
		boundMethodCheck(this, NodeCache);
		if (!key) {
			return undefined;
		}
		if (this._isInvalidKey(key)) {
			throw this._error("EKEYTYPE", { type: typeof key });
		}
		if (this.data[key] != null && this._check(key, this.data[key])) {
			return this.data[key].t;
		} else {
			return undefined;
		}
	}

	keys() {
		boundMethodCheck(this, NodeCache);
		return Object.keys(this.data);
	}

	has(key) {
		boundMethodCheck(this, NodeCache);
		return this.data[key] != null && this._check(key, this.data[key]);
	}

	getStats() {
		boundMethodCheck(this, NodeCache);
		return this.stats;
	}

	flushAll(_startPeriod = true) {
		boundMethodCheck(this, NodeCache);
		this.data = {};
		this.stats = { hits: 0, misses: 0, keys: 0, ksize: 0, vsize: 0 };
		this._killCheckPeriod();
		this._checkData(_startPeriod);
		this.emit("flush");
	}

	flushStats() {
		boundMethodCheck(this, NodeCache);
		this.stats = { hits: 0, misses: 0, keys: 0, ksize: 0, vsize: 0 };
		this.emit("flush_stats");
	}

	close() {
		boundMethodCheck(this, NodeCache);
		this._killCheckPeriod();
	}

	_checkData(startPeriod = true) {
		boundMethodCheck(this, NodeCache);

		for (const key in this.data) {
			const value = this.data[key];
			this._check(key, value);
		}

		if (startPeriod && this.options.checkperiod > 0) {
			this.checkTimeout = setTimeout(
				this._checkData,
				this.options.checkperiod * 1000,
				startPeriod,
			);

			if (this.checkTimeout && this.checkTimeout.unref) {
				this.checkTimeout.unref();
			}
		}
	}

	_killCheckPeriod() {
		if (this.checkTimeout != null) {
			clearTimeout(this.checkTimeout);
		}
	}

	_check(key, data) {
		boundMethodCheck(this, NodeCache);
		let retval = true;
		if (data.t !== 0 && data.t < Date.now()) {
			if (this.options.deleteOnExpire) {
				retval = false;
				this.del(key);
			}
			this.emit("expired", key, this._unwrap(data));
		}
		return retval;
	}

	_isInvalidKey(key) {
		boundMethodCheck(this, NodeCache);
		if (!this.validKeyTypes.includes(typeof key)) {
			return this._error("EKEYTYPE", { type: typeof key });
		}
	}

	_wrap(value, ttl, asClone = true) {
		boundMethodCheck(this, NodeCache);
		if (!this.options.useClones) {
			asClone = false;
		}
		const now = Date.now();
		let livetime = 0;
		const ttlMultiplicator = 1000;
		if (ttl === 0) {
			livetime = 0;
		} else if (ttl) {
			livetime = now + ttl * ttlMultiplicator;
		} else {
			livetime =
				this.options.stdTTL === 0
					? this.options.stdTTL
					: now + this.options.stdTTL * ttlMultiplicator;
		}
		return { t: livetime, v: asClone ? clone(value) : value };
	}

	_unwrap(value, asClone = true) {
		if (!this.options.useClones) {
			asClone = false;
		}
		if (value.v != null) {
			return asClone ? clone(value.v) : value.v;
		}
		return null;
	}

	_getKeyLength(key) {
		return key.toString().length;
	}

	_getValLength(value) {
		boundMethodCheck(this, NodeCache);
		if (typeof value === "string") {
			return value.length;
		} else if (this.options.forceString) {
			return JSON.stringify(value).length;
		} else if (Array.isArray(value)) {
			return this.options.arrayValueSize * value.length;
		} else if (typeof value === "number") {
			return 8;
		} else if (value != null && typeof value.then === "function") {
			return this.options.promiseValueSize;
		} else if (
			typeof Buffer !== "undefined" &&
			Buffer != null &&
			Buffer.isBuffer(value)
		) {
			return value.length;
		} else if (value != null && typeof value === "object") {
			return this.options.objectValueSize * Object.keys(value).length;
		} else if (typeof value === "boolean") {
			return 8;
		} else {
			return 0;
		}
	}

	_error(type, data = {}) {
		boundMethodCheck(this, NodeCache);
		const error = new Error();
		error.name = type;
		error.errorcode = type;
		error.message = this.ERRORS[type] ? this.ERRORS[type](data) : "-";
		error.data = data;
		return error;
	}

	_initErrors() {
		boundMethodCheck(this, NodeCache);
		this.ERRORS = {};
		for (const errType in this._ERRORS) {
			const errMsg = this._ERRORS[errType];
			this.ERRORS[errType] = this.createErrorMessage(errMsg);
		}
	}

	createErrorMessage(errMsg) {
		return (args) => {
			return errMsg.replace("__key", args.type);
		};
	}
}

// Define standard error messages as a prototype property
NodeCache.prototype._ERRORS = {
	ENOTFOUND: "Key `__key` not found",
	ECACHEFULL: "Cache max keys amount exceeded",
	EKEYTYPE:
		"The key argument has to be of type `string` or `number`. Found: `__key`",
	EKEYSTYPE: "The keys argument has to be an array.",
	ETTLTYPE: "The ttl argument has to be a number.",
};

module.exports = NodeCache;
