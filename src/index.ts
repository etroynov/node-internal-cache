/**
 * node-internal-cache
 * https://github.com/etroynov/node-internal-cache
 *
 * Released under the MIT license
 * https://github.com/etroynov/node-internal-cache/blob/master/LICENSE
 */

import { EventEmitter } from 'node:events';

import clone from './clone';

export type Key = string | number;

export interface WrappedValue<T> {
	/** absolute expiration timestamp in ms; 0 means never expires */
	t: number;
	/** stored value */
	v: T;
	/** marker so set(key, undefined) round-trips correctly */
	hasValue: boolean;
}

export interface ValueSetItem<T = unknown> {
	key: Key;
	val: T;
	ttl?: number;
}

export interface Stats {
	hits: number;
	misses: number;
	keys: number;
	ksize: number;
	vsize: number;
}

export interface Options {
	forceString?: boolean;
	objectValueSize?: number;
	promiseValueSize?: number;
	arrayValueSize?: number;
	stdTTL?: number;
	checkperiod?: number;
	useClones?: boolean;
	deleteOnExpire?: boolean;
	maxKeys?: number;
}

type ErrorCode =
	| 'ENOTFOUND'
	| 'ECACHEFULL'
	| 'EKEYTYPE'
	| 'EKEYSTYPE'
	| 'ETTLTYPE';

export interface CacheError extends Error {
	name: string;
	errorcode: string;
	data: { type?: string };
}

const ERROR_TEMPLATES: Record<ErrorCode, string> = {
	ENOTFOUND: 'Key `__key` not found',
	ECACHEFULL: 'Cache max keys amount exceeded',
	EKEYTYPE:
		'The key argument has to be of type `string` or `number`. Found: `__key`',
	EKEYSTYPE: 'The keys argument has to be an array.',
	ETTLTYPE: 'The ttl argument has to be a number.',
};

const VALID_KEY_TYPES = ['string', 'number'] as const;
const MS_PER_SEC = 1000;
const NEVER_EXPIRES = 0;

const emptyStats = (): Stats => ({
	hits: 0,
	misses: 0,
	keys: 0,
	ksize: 0,
	vsize: 0,
});

export type NodeCacheEvents = {
	set: [key: Key, value: unknown];
	del: [key: Key, value: unknown];
	expired: [key: Key, value: unknown];
	miss: [key: Key];
	take: [key: Key, value: unknown];
	flush: [];
	flush_stats: [];
};

interface TypedEventEmitter<E> {
	on<K extends keyof E & string>(
		event: K,
		listener: (...args: E[K] extends unknown[] ? E[K] : never) => void,
	): this;
	once<K extends keyof E & string>(
		event: K,
		listener: (...args: E[K] extends unknown[] ? E[K] : never) => void,
	): this;
	off<K extends keyof E & string>(
		event: K,
		listener: (...args: E[K] extends unknown[] ? E[K] : never) => void,
	): this;
	emit<K extends keyof E & string>(
		event: K,
		...args: E[K] extends unknown[] ? E[K] : never
	): boolean;
}

class NodeCache extends (EventEmitter as new () => EventEmitter &
	TypedEventEmitter<NodeCacheEvents>) {
	/** Cache storage */
	data = new Map<Key, WrappedValue<unknown>>();

	/** Statistics container */
	stats: Stats = emptyStats();

	/** Resolved options */
	options: Required<Options> = {
		forceString: false,
		objectValueSize: 80,
		promiseValueSize: 80,
		arrayValueSize: 40,
		stdTTL: 0,
		checkperiod: 600,
		useClones: true,
		deleteOnExpire: true,
		maxKeys: -1,
	};

	private checkTimeout: NodeJS.Timeout | undefined;
	private inflight = new Map<Key, Promise<unknown>>();

	constructor(options: Options = {}) {
		super();

		this.options = { ...this.options, ...options };

		this._checkData();
	}

	get<T = unknown>(key: Key): T | undefined {
		this._assertKey(key);

		const entry = this._liveEntry(key);
		if (entry !== undefined) {
			this.stats.hits++;
			return this._unwrap<T>(entry);
		}

		this.emit('miss', key);
		this.stats.misses++;
		return undefined;
	}

	mget<T = unknown>(keys: Key[]): Record<string, T> {
		if (!Array.isArray(keys)) {
			throw this._error('EKEYSTYPE');
		}

		const out: Record<string, T> = {};
		for (const key of keys) {
			this._assertKey(key);

			const entry = this._liveEntry(key);
			if (entry !== undefined) {
				this.stats.hits++;
				out[String(key)] = this._unwrap<T>(entry) as T;
			} else {
				this.emit('miss', key);
				this.stats.misses++;
			}
		}
		return out;
	}

	set<T = unknown>(key: Key, value: T, ttl?: number): boolean {
		this._assertKey(key);
		this._assertTtl(ttl);

		if (
			this.options.maxKeys > -1 &&
			this.stats.keys >= this.options.maxKeys &&
			!this.data.has(key)
		) {
			throw this._error('ECACHEFULL');
		}

		const processedValue =
			this.options.forceString && typeof value !== 'string'
				? JSON.stringify(value)
				: value;

		const existing = this.data.get(key);
		if (existing !== undefined) {
			this.stats.vsize -= this._getValLength(this._unwrap(existing, false));
		} else {
			this.stats.ksize += this._getKeyLength(key);
			this.stats.keys++;
		}

		this.data.set(key, this._wrap(processedValue, this._resolveExpiry(ttl)));
		this.stats.vsize += this._getValLength(processedValue);

		this.emit('set', key, processedValue);
		return true;
	}

	fetch<T = unknown>(
		key: Key,
		ttlOrValue: number | T | (() => T),
		maybeValue?: T | (() => T),
	): T {
		if (this.has(key)) {
			return this.get<T>(key) as T;
		}

		const { ttl, value } = this._parseFetchArgs<T | (() => T)>(
			ttlOrValue,
			maybeValue,
		);
		const result = (
			typeof value === 'function' ? (value as () => T)() : value
		) as T;
		this.set(key, result, ttl);
		return result;
	}

	async fetchAsync<T>(
		key: Key,
		ttlOrFn: number | (() => Promise<T> | T),
		maybeFn?: () => Promise<T> | T,
	): Promise<T> {
		if (this.has(key)) {
			return this.get<T>(key) as T;
		}

		const existing = this.inflight.get(key);
		if (existing !== undefined) {
			return existing as Promise<T>;
		}

		const { ttl, value: fn } = this._parseFetchArgs<() => Promise<T> | T>(
			ttlOrFn,
			maybeFn,
		);

		// Populate the cache before clearing inflight so that any concurrent
		// caller arriving after the await sees either the inflight promise or
		// the freshly populated cache entry, never neither.
		const promise = Promise.resolve()
			.then(fn)
			.then((result) => {
				this.set(key, result, ttl);
				return result;
			})
			.finally(() => {
				this.inflight.delete(key);
			});

		this.inflight.set(key, promise);
		return promise;
	}

	mset<T = unknown>(keyValueSet: ValueSetItem<T>[]): boolean {
		if (
			this.options.maxKeys > -1 &&
			this.stats.keys + keyValueSet.length > this.options.maxKeys
		) {
			throw this._error('ECACHEFULL');
		}

		for (const { key, ttl } of keyValueSet) {
			if (ttl !== undefined && typeof ttl !== 'number') {
				throw this._error('ETTLTYPE');
			}
			this._assertKey(key);
		}
		for (const { key, val, ttl } of keyValueSet) {
			this.set(key, val, ttl);
		}
		return true;
	}

	del(keys: Key | Key[]): number {
		const arr = Array.isArray(keys) ? keys : [keys];

		let delCount = 0;
		for (const key of arr) {
			this._assertKey(key);
			const entry = this.data.get(key);
			if (entry !== undefined) {
				this.stats.vsize -= this._getValLength(this._unwrap(entry, false));
				this.stats.ksize -= this._getKeyLength(key);
				this.stats.keys--;
				delCount++;
				this.data.delete(key);
				this.emit('del', key, entry.v);
			}
		}
		return delCount;
	}

	take<T = unknown>(key: Key): T | undefined {
		this._assertKey(key);

		const entry = this._liveEntry(key);
		if (entry === undefined) {
			this.emit('miss', key);
			this.stats.misses++;
			return undefined;
		}

		this.stats.hits++;
		const value = this._unwrap<T>(entry);
		this.del(key);
		this.emit('take', key, value);
		return value;
	}

	ttl(key: Key, ttl?: number): boolean {
		if (!key) return false;
		this._assertKey(key);
		this._assertTtl(ttl);

		const entry = this._liveEntry(key);
		if (entry === undefined) return false;

		// Explicit `0` is treated as "drop the key" per documented semantics.
		if (ttl === 0) {
			this.del(key);
			return true;
		}

		const expiry = this._resolveExpiry(ttl);
		if (ttl !== undefined && ttl < 0) {
			this.del(key);
			return true;
		}

		this.data.set(key, this._wrap(entry.v, expiry, false));
		return true;
	}

	getTtl(key: Key): number | undefined {
		this._assertKey(key);
		if (!key) return undefined;
		const entry = this._liveEntry(key);
		return entry?.t;
	}

	keys(): string[] {
		return Array.from(this.data.keys(), (k) => String(k));
	}

	has(key: Key): boolean {
		return this._liveEntry(key) !== undefined;
	}

	getStats(): Stats {
		return this.stats;
	}

	flushAll(startPeriod = true): void {
		this.data = new Map();
		this.stats = emptyStats();
		this._killCheckPeriod();
		this._checkData(startPeriod);
		this.emit('flush');
	}

	flushStats(): void {
		this.stats = emptyStats();
		this.emit('flush_stats');
	}

	close(): void {
		this._killCheckPeriod();
	}

	_checkData(startPeriod = true): void {
		for (const [key, entry] of this.data) {
			this._check(key, entry);
		}

		if (startPeriod && this.options.checkperiod > 0) {
			this.checkTimeout = setTimeout(
				() => this._checkData(startPeriod),
				this.options.checkperiod * MS_PER_SEC,
			);
			this.checkTimeout.unref?.();
		}
	}

	_killCheckPeriod(): void {
		if (this.checkTimeout !== undefined) {
			clearTimeout(this.checkTimeout);
			this.checkTimeout = undefined;
		}
	}

	/**
	 * Returns the entry if it exists and has not expired (taking
	 * `deleteOnExpire` into account); otherwise returns `undefined`.
	 * Centralises the "lookup + expiry handling" path used by get/has/take/etc.
	 */
	private _liveEntry(key: Key): WrappedValue<unknown> | undefined {
		const entry = this.data.get(key);
		if (entry === undefined) return undefined;
		return this._check(key, entry) ? entry : undefined;
	}

	private _check(key: Key, entry: WrappedValue<unknown>): boolean {
		if (entry.t === NEVER_EXPIRES || entry.t >= Date.now()) {
			return true;
		}
		const expiredValue = this._unwrap(entry, false);
		if (this.options.deleteOnExpire) {
			this.del(key);
			this.emit('expired', key, expiredValue);
			return false;
		}
		this.emit('expired', key, expiredValue);
		return true;
	}

	private _isInvalidKey(key: unknown): boolean {
		return !(VALID_KEY_TYPES as readonly string[]).includes(typeof key);
	}

	private _assertKey(key: unknown): asserts key is Key {
		if (this._isInvalidKey(key)) {
			throw this._error('EKEYTYPE', { type: typeof key });
		}
	}

	private _assertTtl(ttl: unknown): void {
		if (ttl === undefined || ttl === null) return;
		if (typeof ttl !== 'number' || Number.isNaN(ttl)) {
			throw this._error('ETTLTYPE');
		}
	}

	/**
	 * Convert a relative TTL (in seconds) into an absolute expiry timestamp.
	 * `undefined` falls back to `stdTTL`. Returns `0` when the entry should
	 * never expire.
	 */
	private _resolveExpiry(ttl: number | undefined): number {
		const seconds = ttl == null ? this.options.stdTTL : ttl;
		if (seconds === 0) return NEVER_EXPIRES;
		if (seconds < 0) return Date.now() - 1; // already expired
		return Date.now() + seconds * MS_PER_SEC;
	}

	private _parseFetchArgs<V>(
		ttlOrValue: number | V,
		maybeValue: V | undefined,
	): { ttl: number | undefined; value: V } {
		if (maybeValue === undefined) {
			return { ttl: undefined, value: ttlOrValue as V };
		}
		return { ttl: ttlOrValue as number, value: maybeValue };
	}

	private _wrap<T>(value: T, expiry: number, asClone = true): WrappedValue<T> {
		const useClone = this.options.useClones && asClone;
		return {
			t: expiry,
			v: useClone ? clone(value) : value,
			hasValue: true,
		};
	}

	private _unwrap<T = unknown>(
		entry: WrappedValue<unknown>,
		asClone = true,
	): T | undefined {
		if (!entry.hasValue) return undefined;
		const useClone = this.options.useClones && asClone;
		return (useClone ? clone(entry.v) : entry.v) as T;
	}

	private _getKeyLength(key: Key): number {
		return String(key).length;
	}

	private _getValLength(value: unknown): number {
		if (typeof value === 'string') return value.length;
		if (this.options.forceString) return JSON.stringify(value).length;
		if (Array.isArray(value)) return this.options.arrayValueSize * value.length;
		if (typeof value === 'number') return 8;
		if (
			value != null &&
			typeof (value as { then?: unknown }).then === 'function'
		) {
			return this.options.promiseValueSize;
		}
		if (
			typeof Buffer !== 'undefined' &&
			Buffer != null &&
			Buffer.isBuffer(value)
		) {
			return value.length;
		}
		if (value != null && typeof value === 'object') {
			return this.options.objectValueSize * Object.keys(value as object).length;
		}
		if (typeof value === 'boolean') return 8;
		return 0;
	}

	private _error(type: ErrorCode, data: { type?: string } = {}): CacheError {
		const message = ERROR_TEMPLATES[type].replace('__key', data.type ?? '');
		const err = new Error(message) as CacheError;
		err.name = type;
		err.errorcode = type;
		err.data = data;
		return err;
	}
}

export default NodeCache;
