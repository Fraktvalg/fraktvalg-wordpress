import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: './e2e',
	/* Tests share WordPress state, so they must run serially. */
	fullyParallel: false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	/* Allow slow beforeAll setup hooks (onboarding wizard + WP-CLI) to finish. */
	timeout: 120000,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: 'html',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: 'http://localhost:8889',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: "teardown",
			testMatch: /global\.teardown\.ts/,
		},
		{
			name: 'setup',
			testMatch: /global\.setup\.ts/,
			dependencies: [ 'teardown' ],
		},
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: [ 'setup' ],
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
			dependencies: [ 'setup' ],
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
			dependencies: [ 'setup' ],
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: 'npm run wp-env start',
		url: 'http://localhost:8889',
		/* Always reuse an existing server so that wp-env started before the
		 * test run (in CI or locally) is not launched a second time. */
		reuseExistingServer: true,
	},
});
