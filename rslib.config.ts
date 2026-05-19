import { defineConfig } from '@rslib/core';

export default defineConfig({
	source: {
		entry: { index: './src/index.ts' },
	},
	lib: [
		{
			format: 'cjs',
			syntax: 'es2021',
			dts: true,
			autoExtension: true,
		},
		{
			format: 'esm',
			syntax: 'es2021',
			dts: false,
			autoExtension: true,
		},
	],
	output: {
		target: 'node',
		minify: true,
		sourceMap: true,
		cleanDistPath: true,
		distPath: { root: './dist' },
	},
});
