import esbuild from 'esbuild';
import alias from 'esbuild-plugin-alias';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

console.log('Starting server build...');

await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20', // Target a modern Node.js version
  format: 'esm',
  outdir: 'dist',
  packages: 'external', // Keep node_modules external
  minify: isProduction, // Minify only in production
  sourcemap: !isProduction, // Create sourcemaps for development
  plugins: [
    alias({
      '@shared': path.resolve(process.cwd(), 'shared'),
    }),
  ],
}).catch(() => process.exit(1));

console.log('✅ Server build complete.');