import { build } from 'vite';

try {
  await build();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
