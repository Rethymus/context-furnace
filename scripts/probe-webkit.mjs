import { webkit } from '@playwright/test';
try {
  const b = await webkit.launch();
  console.log('WEBKIT LAUNCH OK', b.version());
  await b.close();
} catch (e) {
  console.log('WEBKIT FAIL:', String(e).slice(0, 300));
}
