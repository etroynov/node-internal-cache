interface CloneOptions {
	circular?: boolean;
	depth?: number;
	prototype?: any;
	includeNonEnumerable?: boolean;
}

interface CloneFunction {
	(
		parent: any,
		circular?: boolean | CloneOptions,
		depth?: number,
		prototype?: any,
		includeNonEnumerable?: boolean,
	): any;
	clonePrototype: (parent: any) => any;
	__objToStr: (o: any) => string;
	__isDate: (o: any) => boolean;
	__isArray: (o: any) => boolean;
	__isRegExp: (o: any) => boolean;
	__getRegExpFlags: (re: RegExp) => string;
}

/**
 * Helper function that checks if `obj` is an instance of `type`.
 * @param obj - The object to check.
 * @param type - The constructor function.
 * @returns True if `obj` is an instance of `type`.
 */
const _instanceof = (obj: any, type: any): boolean =>
	type != null && obj instanceof type;

let nativeMap: any;
try {
	nativeMap = Map;
} catch (_) {
	// If Map is not available, assign a dummy value that no object will ever be an instance of.
	nativeMap = () => {};
}

let nativeSet: any;
try {
	nativeSet = Set;
} catch (_) {
	nativeSet = () => {};
}

let nativePromise: any;
try {
	nativePromise = Promise;
} catch (_) {
	nativePromise = () => {};
}

/**
 * Deep clones an object.
 *
 * Supports circular references by default. If you are sure that the object contains no
 * circular references, you can pass false as the second argument to improve performance.
 *
 * @param parent - The object to be cloned.
 * @param circular - Boolean indicating circular references support or an options object.
 * @param depth - The cloning depth (default: Infinity).
 * @param prototype - The prototype to be used for the cloned object.
 * @param includeNonEnumerable - If true, non-enumerable properties will also be cloned.
 * @returns The deep-cloned object.
 */
const clone: CloneFunction = ((
	parent: any,
	circular?: boolean | CloneOptions,
	depth?: number,
	prototype?: any,
	includeNonEnumerable?: boolean,
): any => {
	if (typeof circular === 'object') {
		({ depth, prototype, includeNonEnumerable, circular } = circular);
	}

	// Maintain two arrays for circular references,
	// where corresponding parents and children have the same index.
	const allParents: any[] = [];
	const allChildren: any[] = [];
	const useBuffer: boolean = typeof Buffer !== 'undefined';

	if (typeof circular === 'undefined') circular = true;
	if (typeof depth === 'undefined') depth = Number.POSITIVE_INFINITY;

	function _clone(parent: any, depth: number): any {
		// Cloning null always returns null.
		if (parent === null) return null;
		if (depth === 0) return parent;
		let child: any;
		let proto: any;
		if (typeof parent !== 'object') return parent;

		if (_instanceof(parent, nativeMap)) {
			child = new nativeMap();
		} else if (_instanceof(parent, nativeSet)) {
			child = new nativeSet();
		} else if (_instanceof(parent, nativePromise)) {
			child = new nativePromise((resolve: any, reject: any) => {
				parent.then(
					(value: any) => resolve(_clone(value, depth - 1)),
					(err: any) => reject(_clone(err, depth - 1)),
				);
			});
		} else if (clone.__isArray(parent)) {
			child = [];
		} else if (clone.__isRegExp(parent)) {
			child = new RegExp(parent.source, __getRegExpFlags(parent));
			if (parent.lastIndex) child.lastIndex = parent.lastIndex;
		} else if (clone.__isDate(parent)) {
			child = new Date(parent.getTime());
		} else if (useBuffer && Buffer.isBuffer(parent)) {
			if (Buffer.from) {
				// Node.js >= 5.10.0
				child = Buffer.from(parent);
			} else {
				// Older Node.js versions.
				child = new Buffer(parent.length);
				parent.copy(child);
			}
			return child;
		} else if (_instanceof(parent, Error)) {
			child = Object.create(parent);
		} else {
			if (typeof prototype === 'undefined') {
				proto = Object.getPrototypeOf(parent);
				child = Object.create(proto);
			} else {
				child = Object.create(prototype);
				proto = prototype;
			}
		}

		if (circular) {
			const index = allParents.indexOf(parent);
			if (index !== -1) return allChildren[index];
			allParents.push(parent);
			allChildren.push(child);
		}

		if (_instanceof(parent, nativeMap)) {
			parent.forEach((value: any, key: any) => {
				const keyChild = _clone(key, depth - 1);
				const valueChild = _clone(value, depth - 1);
				child.set(keyChild, valueChild);
			});
		}
		if (_instanceof(parent, nativeSet)) {
			parent.forEach((value: any) => {
				const entryChild = _clone(value, depth - 1);
				child.add(entryChild);
			});
		}

		for (const i in parent) {
			const attrs = Object.getOwnPropertyDescriptor(parent, i);
			if (attrs) {
				child[i] = _clone(parent[i], depth - 1);
			}

			try {
				const objProperty = Object.getOwnPropertyDescriptor(parent, i);
				if (objProperty && objProperty.set === 'undefined') {
					// No setter defined. Skip cloning this property.
					continue;
				}
				child[i] = _clone(parent[i], depth - 1);
			} catch (e) {
				if (e instanceof TypeError || e instanceof ReferenceError) {
					// In strict mode, a TypeError may be thrown if child[i] has only a getter.
					continue;
				}
			}
		}

		if (Object.getOwnPropertySymbols) {
			const symbols = Object.getOwnPropertySymbols(parent);
			for (let i = 0; i < symbols.length; i++) {
				const symbol = symbols[i];
				const descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
				if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
					continue;
				}
				child[symbol] = _clone(parent[symbol], depth - 1);
				Object.defineProperty(child, symbol, descriptor!);
			}
		}

		if (includeNonEnumerable) {
			const allPropertyNames = Object.getOwnPropertyNames(parent);
			for (let i = 0; i < allPropertyNames.length; i++) {
				const propertyName = allPropertyNames[i];
				const descriptor = Object.getOwnPropertyDescriptor(
					parent,
					propertyName,
				);
				if (descriptor && descriptor.enumerable) {
					continue;
				}
				child[propertyName] = _clone(parent[propertyName], depth - 1);
				Object.defineProperty(child, propertyName, descriptor!);
			}
		}

		return child;
	}

	return _clone(parent, depth);
}) as CloneFunction;

/**
 * Simple flat clone using the prototype.
 * Useful for overriding properties on a flat configuration object (with no nested properties).
 *
 * USE WITH CAUTION! This may not behave as expected if you do not understand how it works.
 */
clone.clonePrototype = function clonePrototype(parent: any): any {
	if (parent === null) return null;
	function C() {}
	C.prototype = parent;
	return new C();
};

// Private utility functions.
const __objToStr = (o: any): string => Object.prototype.toString.call(o);
clone.__objToStr = __objToStr;

const __isDate = (o: any): boolean =>
	typeof o === 'object' && __objToStr(o) === '[object Date]';
clone.__isDate = __isDate;

const __isArray = (o: any): boolean =>
	typeof o === 'object' && __objToStr(o) === '[object Array]';
clone.__isArray = __isArray;

const __isRegExp = (o: any): boolean =>
	typeof o === 'object' && __objToStr(o) === '[object RegExp]';
clone.__isRegExp = __isRegExp;

const __getRegExpFlags = (re: RegExp): string => {
	let flags = '';
	if (re.global) flags += 'g';
	if (re.ignoreCase) flags += 'i';
	if (re.multiline) flags += 'm';
	return flags;
};
clone.__getRegExpFlags = __getRegExpFlags;

export default clone;
