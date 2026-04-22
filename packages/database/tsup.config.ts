import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/**/*.ts',
  ],
  format: ['esm'],
  dts: true,
  splitting: true,
  treeshake: true,
  external: ['@prisma/client', 'pg', '@prisma/adapter-pg', '@prisma/extension-read-replicas'],
});
