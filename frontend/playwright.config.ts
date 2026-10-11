import { defineConfig, devices } from '@playwright/test';

// Los tests esperan la app ya levantada (docker compose en local; el workflow
// de CI arranca backend y frontend antes de lanzarlos).
export default defineConfig({
  testDir: './e2e',
  // Sufijo propio para que Vitest no los recoja como tests unitarios
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // En local la app se sirve con el servidor de desarrollo dentro de Docker, que
  // se atasca si varias páginas cargan a la vez (sirve los módulos sin empaquetar).
  // En CI se prueba el build de producción y sí se puede paralelizar.
  workers: process.env.CI ? undefined : 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
