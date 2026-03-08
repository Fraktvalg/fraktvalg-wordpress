/**
 * Shared front-end test setup.
 *
 * Both the cart and checkout test suites need an identical environment:
 *   - Plugin fully onboarded with both Bring and HeltHjem connected
 *   - WooCommerce: BACS payment enabled, Norway store address
 *   - A shipping zone covering Norway with the Fraktvalg method
 *   - A test product in the shop
 *   - Cart / checkout pages using the block-based WooCommerce templates
 *     with the Fraktvalg shipping-selector block injected
 *
 * Call `setupFrontEnd()` in a `test.beforeAll` and `teardownFrontEnd()` in
 * `test.afterAll`.  Each individual test is responsible for adding a product
 * to the cart and setting the shipping address.
 */

import type { Browser, Page } from '@playwright/test';
import { signIn } from '../common';
import { deleteOption, updateOption, wpCli } from '../utils/wp-cli';
import {
	enableBacsPayment,
	setupStoreAddress,
	createTestProduct,
	deleteProduct,
	createNorwayShippingZone,
	deleteShippingZone,
	registerTestProviders,
} from '../utils/woocommerce';

export interface FrontEndContext {
	productId: string;
	zoneId: string;
}

// Singleton: the expensive onboarding wizard runs at most once per test-worker.
let _cachedCtx: FrontEndContext | null = null;

/**
 * Returns the cached context if the environment is already configured,
 * otherwise runs the full setup.  Use this in `beforeAll` hooks so the
 * onboarding wizard only runs once no matter how many spec files call it.
 */
export async function getOrSetupFrontEnd( browser: Browser ): Promise<FrontEndContext> {
	if ( _cachedCtx ) return _cachedCtx;
	_cachedCtx = await setupFrontEnd( browser );
	return _cachedCtx;
}

/**
 * Set up the full front-end test environment.
 * Returns identifiers that must be passed to `teardownFrontEnd`.
 */
export async function setupFrontEnd( browser: Browser ): Promise<FrontEndContext> {
	// ── 1. Plugin options ────────────────────────────────────────────────────
	deleteOption( 'fraktvalg_configured' );
	deleteOption( 'fraktvalg_api_key' );
	deleteOption( 'fraktvalg_test_registered_shippers' );

	// ── 2. WooCommerce infrastructure ────────────────────────────────────────
	enableBacsPayment();
	setupStoreAddress();
	wpCli( 'rewrite structure "/%postname%/"' );
	wpCli( 'rewrite flush' );

	const productId = createTestProduct();
	const zoneId    = createNorwayShippingZone();

	// ── 3. Run the onboarding wizard via the browser ─────────────────────────
	//       This configures the plugin AND injects the Fraktvalg block into
	//       the WooCommerce cart / checkout block templates.
	const page = await browser.newPage();
	await signIn( { page } );
	await page.goto( '/wp-admin/admin.php?page=fraktvalg-onboarding' );

	// Step 1 — License key
	await page.fill( '#license', 'fraktvalg-test-api-key' );
	await page.click( 'button:has-text("Activate license")' );

	// Step 2 — Providers: connect both Bring and HeltHjem
	await page.locator( 'text=Nesten ferdig' ).waitFor();
	// Expand and connect Bring — accordion toggle is a button containing the provider name.
	await page.locator( 'button' ).filter( { hasText: 'Posten' } ).first().click();
	await page.locator( 'input[name="customerNumber"], input[aria-label*="Customer Number"]' ).first().fill( 'TEST123' );
	await page.locator( 'input[name="X-Mybring-API-Uid"], input[aria-label*="login ID"]' ).first().fill( 'test@example.com' );
	await page.locator( 'input[name="X-Mybring-API-Key"], input[aria-label*="API key"]' ).first().fill( 'test-key' );
	await page.click( 'button:has-text("Connect to this provider")' );
	await page.waitForTimeout( 500 );
	// Expand and connect HeltHjem.
	await page.locator( 'button' ).filter( { hasText: 'HeltHjem' } ).first().click();
	await page.locator( 'input[name="api_key"], input[aria-label*="API Key"]' ).first().fill( 'helthjem-key' );
	await page.locator( 'input[name="customer_id"], input[aria-label*="Customer ID"]' ).first().fill( '99999' );
	await page.click( 'button:has-text("Connect to this provider")' );
	await page.waitForTimeout( 500 );
	await page.click( 'button:has-text("Next step")' );

	// Step 3 — Templates: auto-inject Fraktvalg block into cart and checkout
	await page.locator( 'h2:has-text("Template Configuration")' ).waitFor();
	// Click each enabled "Auto-add Block" button.  After a click the button
	// label changes to "Block Auto-added", so always target the *first*
	// remaining "Auto-add Block" button rather than by index (which would
	// break once earlier buttons change label).
	const autoAddButtons = page.locator( 'button:has-text("Auto-add Block")' );
	let remaining        = await autoAddButtons.count();
	while ( remaining > 0 ) {
		const btn = autoAddButtons.first();
		if ( await btn.isEnabled() ) {
			await btn.click();
			// Wait for this button to confirm the addition.
			await page.locator( 'button:has-text("Block Auto-added")' ).first().waitFor( { timeout: 10000 } );
		}
		remaining = await autoAddButtons.count();
	}
	await page.click( 'button:has-text("Next step")' );

	// Step 4 — Optional Settings
	await page.locator( 'text=Almost there!' ).waitFor();
	await page.click( 'button:has-text("Save optional settings")' );
	await page.click( 'button:has-text("Next step")' );

	// Step 5 — Store Settings
	await page.locator( 'h2:has-text("Store Settings")' ).waitFor();
	await page.click( 'button:has-text("Next step")' );

	// Step 6 — Finished
	await page.locator( 'text=Fraktvalg is now set up and ready to use' ).waitFor();
	await page.click( 'button:has-text("Finish setup")' );
	await page.waitForURL( '**/wp-admin/index.php' );

	await page.close();

	// Ensure both providers are reflected in the fake-API option.
	registerTestProviders();

	return { productId, zoneId };
}

/**
 * Remove all resources created by `setupFrontEnd`.
 */
export function teardownFrontEnd( ctx: FrontEndContext ): void {
	deleteProduct( ctx.productId );
	deleteShippingZone( ctx.zoneId );
	deleteOption( 'fraktvalg_configured' );
	deleteOption( 'fraktvalg_api_key' );
	deleteOption( 'fraktvalg_test_registered_shippers' );
	_cachedCtx = null;
}

/**
 * Create an authenticated shared page and populate the cart.
 * Call this in `test.beforeAll` so tests in the suite share a single
 * browser session and avoid re-running setup on every test.
 */
export async function setupSharedPage( browser: Browser, productId: string ): Promise<Page> {
	const page = await browser.newPage();
	await signIn( { page } );
	await addProductAndSetAddress( page, productId );
	return page;
}

/**
 * Add the test product to the cart by navigating to the WooCommerce
 * add-to-cart URL, then set the shipping address via the WC Store API so
 * the Fraktvalg shipping method can calculate rates.
 *
 * Also called directly in tests that need a fresh cart (e.g. the full checkout test).
 */
export async function addProductAndSetAddress(
	page:      import('@playwright/test').Page,
	productId: string
): Promise<void> {
	// Add the product to the cart via the WooCommerce query-string shortcut.
	await page.goto( `/?add-to-cart=${ productId }&quantity=1`, { waitUntil: 'networkidle' } );

	// Navigate to the cart page so WooCommerce block scripts (and wcSettings with
	// storeApiNonce) are available before we call the Store API.
	await page.goto( '/cart/', { waitUntil: 'networkidle' } );

	// Set the shipping address through the WC Store API (same browser session).
	await page.evaluate( async () => {
		// WooCommerce 8+ stores the Store API nonce in wcBlocksMiddlewareConfig,
		// not in wcSettings (which no longer has a storeApiNonce key).
		const nonce = ( window as Record<string, any> ).wcBlocksMiddlewareConfig?.storeApiNonce ?? '';
		await fetch( '/wp-json/wc/store/v1/cart/update-customer', {
			method:      'POST',
			credentials: 'same-origin',
			headers:     { 'Content-Type': 'application/json', 'Nonce': nonce },
			body:        JSON.stringify( {
				shipping_address: {
					first_name: 'Test',
					last_name:  'User',
					address_1:  'Testveien 1',
					city:       'Oslo',
					postcode:   '0150',
					country:    'NO',
				},
			} ),
		} );
	} );
}
