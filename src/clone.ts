/**
 * Deep-clone wrapper around the native `structuredClone`.
 *
 * `structuredClone` cannot copy functions, Promises, Errors or class instances
 * (their methods become inaccessible after cloning). For those values we fall
 * back to returning the original reference, which matches how typical caches
 * are expected to behave for non-serialisable payloads.
 */
const isStructuredCloneable = (value: unknown): boolean => {
	if (value === null) return true;
	const t = typeof value;
	if (
		t === 'string' ||
		t === 'number' ||
		t === 'boolean' ||
		t === 'bigint' ||
		t === 'undefined'
	) {
		return true;
	}
	if (t === 'function') return false;
	if (t !== 'object') return false;
	if (value instanceof Promise) return false;
	if (value instanceof Error) return false;
	return true;
};

const clone = <T>(value: T): T => {
	if (!isStructuredCloneable(value)) {
		return value;
	}
	try {
		return structuredClone(value);
	} catch {
		// Fallback for objects containing non-cloneable parts (functions, etc.)
		return value;
	}
};

export default clone;
