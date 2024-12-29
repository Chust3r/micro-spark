import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'MicroSpark',
			fileName: (format) => `micro-spark.${format}.js`,
		},
		rollupOptions: {
			output: {
				minifyInternalExports: true,
			},
		},
		minify: 'terser',
		sourcemap: true,
		target: 'esnext',
		emptyOutDir: true,
	},
})
