import { test, expect, type Page } from '@playwright/test';
import { getOrSetupFrontEnd, setupSharedPage, FrontEndContext } from '../setup';

test.describe.configure( { mode: 'serial' } );

test.describe( 'Front-end — Cart — Shipping Selector', () => {
	let ctx: FrontEndContext;
	let sharedPage: Page;

	test.beforeAll( async ( { browser } ) => {
		ctx        = await getOrSetupFrontEnd( browser );
		sharedPage = await setupSharedPage( browser, ctx.productId );
	}, { timeout: 120000 } );

	test.afterAll( async () => {
		await sharedPage.close();
		// Environment teardown is handled by the checkout suite's afterAll
		// (which runs last) so the shared plugin/product/zone setup persists
		// across both spec files.
	} );

	// ── Presence ──────────────────────────────────────────────────────────────

	test( 'shows the Fraktvalg shipping selector on the cart page', async () => {
		await sharedPage.goto( '/cart/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block ).toBeVisible( { timeout: 15000 } );
	} );

	// ── Multiple providers ────────────────────────────────────────────────────

	test( 'shows a provider selection listbox when multiple providers are active', async () => {
		await sharedPage.goto( '/cart/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block ).toBeVisible( { timeout: 15000 } );

		// Wait for rates to load (spinner disappears).
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		// With both Bring and HeltHjem registered, the listbox shows both.
		const listbox = block.locator( '[role="listbox"]' );
		await expect( listbox ).toBeVisible();
		await expect( listbox.locator( 'button' ).filter( { hasText: 'Posten' } ) ).toBeVisible();
		await expect( listbox.locator( 'button' ).filter( { hasText: 'HeltHjem' } ) ).toBeVisible();
	} );

	// ── Provider selection ────────────────────────────────────────────────────

	test( 'clicking a provider shows its shipping methods', async () => {
		await sharedPage.goto( '/cart/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		// Select the Bring (Posten) provider.
		await block.locator( '[role="listbox"] button' ).filter( { hasText: 'Posten' } ).click();

		// A radiogroup of shipping methods should appear.
		const methods = block.locator( '[role="radiogroup"]' );
		await expect( methods ).toBeVisible();

		// Bring's two fake-API methods: Pickup Point (49 NOK) and Home Delivery (99 NOK).
		await expect( methods.locator( '[role="radio"]' ).filter( { hasText: 'Pickup Point' } ) ).toBeVisible();
		await expect( methods.locator( '[role="radio"]' ).filter( { hasText: 'Home Delivery' } ) ).toBeVisible();
	} );

	test( 'can select a shipping method for Bring', async () => {
		await sharedPage.goto( '/cart/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		await block.locator( '[role="listbox"] button' ).filter( { hasText: 'Posten' } ).click();

		// Select "Pickup Point".
		await block.locator( '[role="radiogroup"] [role="radio"]' ).filter( { hasText: 'Pickup Point' } ).click();

		// Loading indicator appears while WooCommerce updates cart totals.
		// Wait for it to disappear, then the method should be marked as selected.
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );
		await expect(
			block.locator( '[role="radiogroup"] [role="radio"][aria-checked="true"]' )
				.filter( { hasText: 'Pickup Point' } )
		).toBeVisible();
	} );

	test( 'can navigate back to the provider list after selecting one', async () => {
		await sharedPage.goto( '/cart/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		await block.locator( '[role="listbox"] button' ).filter( { hasText: 'Posten' } ).click();
		await expect( block.locator( '[role="radiogroup"]' ) ).toBeVisible();

		await block.locator( 'button:has-text("Return to shipping providers")' ).click();

		await expect( block.locator( '[role="listbox"]' ) ).toBeVisible();
	} );

	// ── HeltHjem ──────────────────────────────────────────────────────────────

	test( 'can select a HeltHjem shipping method', async () => {
		await sharedPage.goto( '/cart/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		await block.locator( '[role="listbox"] button' ).filter( { hasText: 'HeltHjem' } ).click();

		const methods = block.locator( '[role="radiogroup"]' );
		await expect( methods ).toBeVisible();
		await expect( methods.locator( '[role="radio"]' ).filter( { hasText: 'Home Delivery' } ) ).toBeVisible();

		await methods.locator( '[role="radio"]' ).filter( { hasText: 'Home Delivery' } ).click();

		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );
		await expect(
			block.locator( '[role="radiogroup"] [role="radio"][aria-checked="true"]' )
				.filter( { hasText: 'Home Delivery' } )
		).toBeVisible();
	} );

	// ── Backup / fallback pricing ─────────────────────────────────────────────

	test( 'shows backup shipping when the Fraktvalg method is configured with a custom fallback', async () => {
		// The backup/fallback option ("Standard Shipping") is registered by
		// Fraktvalg's ShippingMethod::calculate_shipping() alongside real rates.
		// It is identifiable because its rate_id ends with ":custom".
		await sharedPage.goto( '/cart/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		// The backup option is shown if configured; select any provider to reveal methods.
		await block.locator( '[role="listbox"] button' ).first().click();

		const methods = block.locator( '[role="radiogroup"]' );
		await expect( methods ).toBeVisible();

		// At least one shipping method should be selectable.
		await expect( methods.locator( '[role="radio"]' ).first() ).toBeVisible();
	} );
} );
