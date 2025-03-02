export const randomString = (length = 5, withNumbers = true) => {
	let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	if (withNumbers) {
		chars += '0123456789';
	}

	return Array.from(
		{ length },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join('');
};

/**
 * Generates a random number between 0 and `max`
 *
 * @param {Number} max
 * @return {Number} generated random number
 */
export const randomNumber = (max: number) => Math.floor(Math.random() * (max + 1));

/**
 * Subtracts all objB keys from objA keys and returns the result.
 * Both objects should have identical keys with numeric values
 *
 * @param {Object} objA
 * @param {Object} objB
 * @return {Object} Object with the diffed values
 */
export const diffKeys = (objA: any, objB: any) => {
	return Object.keys(objA).reduce((diff, key) => {
		if (objB.hasOwnProperty(key)) {
			diff[key] = objA[key] - objB[key];
		}
		return diff;
	}, {});
};
