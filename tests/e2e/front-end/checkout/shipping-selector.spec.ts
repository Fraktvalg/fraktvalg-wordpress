import { test, expect, type Page } from '@playwright/test';
import { signIn } from '../../common';
import { getOrSetupFrontEnd, setupSharedPage, teardownFrontEnd, addProductAndSetAddress, FrontEndContext } from '../setup';

test.describe.configure( { mode: 'serial' } );

test.describe( 'Front-end — Checkout — Shipping Selector', () => {
	let ctx: FrontEndContext;
	let sharedPage: Page;

	test.beforeAll( async ( { browser } ) => {
		ctx        = await getOrSetupFrontEnd( browser );
		sharedPage = await setupSharedPage( browser, ctx.productId );
	}, { timeout: 120000 } );

	test.afterAll( async () => {
		await sharedPage.close();
		teardownFrontEnd( ctx );
	} );

	// ── Presence ──────────────────────────────────────────────────────────────

	test( 'shows the Fraktvalg shipping selector on the checkout page', async () => {
		await sharedPage.goto( '/checkout/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block ).toBeVisible( { timeout: 15000 } );
	} );

	// ── Shipping method selection ─────────────────────────────────────────────

	test( 'shows both providers on the checkout page', async () => {
		await sharedPage.goto( '/checkout/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		const listbox = block.locator( '[role="listbox"]' );
		await expect( listbox ).toBeVisible();
		await expect( listbox.locator( 'button' ).filter( { hasText: 'Posten' } ) ).toBeVisible();
		await expect( listbox.locator( 'button' ).filter( { hasText: 'HeltHjem' } ) ).toBeVisible();
	} );

	test( 'can select a Bring shipping method on checkout', async () => {
		await sharedPage.goto( '/checkout/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		await block.locator( '[role="listbox"] button' ).filter( { hasText: 'Posten' } ).click();

		await expect( block.locator( '[role="radiogroup"]' ) ).toBeVisible();
		await block.locator( '[role="radiogroup"] [role="radio"]' ).filter( { hasText: 'Pickup Point' } ).click();

		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );
		await expect(
			block.locator( '[role="radiogroup"] [role="radio"][aria-checked="true"]' )
				.filter( { hasText: 'Pickup Point' } )
		).toBeVisible();
	} );

	test( 'can select a HeltHjem shipping method on checkout', async () => {
		await sharedPage.goto( '/checkout/', { waitUntil: 'networkidle' } );

		const block = sharedPage.locator( '#fraktvalg-shipping' );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		await block.locator( '[role="listbox"] button' ).filter( { hasText: 'HeltHjem' } ).click();

		const methods = block.locator( '[role="radiogroup"]' );
		await expect( methods ).toBeVisible();
		await methods.locator( '[role="radio"]' ).filter( { hasText: 'Home Delivery' } ).click();

		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );
		await expect(
			block.locator( '[role="radiogroup"] [role="radio"][aria-checked="true"]' )
		).toBeVisible();
	} );

	// ── Full checkout flow ────────────────────────────────────────────────────

	// This test places a real order, which empties the cart.  It uses the
	// test-scoped `page` fixture (isolated session) so it does not disturb
	// the shared page used by the preceding read-only tests.
	test( 'can complete a full checkout with a Fraktvalg shipping method', async ( { page } ) => {
		await signIn( { page } );
		await addProductAndSetAddress( page, ctx.productId );

		await page.goto( '/checkout/', { waitUntil: 'networkidle' } );

		// ── Contact details ────────────────────────────────────────────────
		await page.getByLabel( 'Email address' ).fill( 'test@fraktvalg.no' );

		const phoneField = page.getByLabel( /Phone/i ).first();
		if ( await phoneField.isVisible() ) {
			await phoneField.fill( '12345678' );
		}

		// ── Billing: use same address as shipping ──────────────────────────
		const sameAddressCheckbox = page.getByLabel( /Use same address for billing/i );
		if ( await sameAddressCheckbox.isVisible( { timeout: 3000 } ).catch( () => false ) ) {
			if ( ! await sameAddressCheckbox.isChecked() ) {
				await sameAddressCheckbox.check();
			}
		}

		// ── Select a shipping method ───────────────────────────────────────
		const block = page.locator( '#fraktvalg-shipping' );

		// Rates may not render until the address fields are filled; wait up to 20 s.
		await expect( block ).toBeVisible( { timeout: 20000 } );
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 20000 } );

		// Select Bring → Pickup Point.
		await block.locator( '[role="listbox"] button' ).filter( { hasText: 'Posten' } ).click();
		await block.locator( '[role="radiogroup"] [role="radio"]' ).filter( { hasText: 'Pickup Point' } ).click();
		await expect( block.locator( '.animate-spin' ) ).not.toBeVisible( { timeout: 15000 } );

		// ── Select BACS payment ────────────────────────────────────────────
		const bacsRadio = page.locator( 'input[value="bacs"]' );
		if ( await bacsRadio.isVisible() ) {
			await bacsRadio.check();
		}

		// Wait for the back-end to process all the checkout options before finalizing our order.
		await expect( page.locator( '.wc-block-components-skeleton__element' ) ).not.toBeVisible();

		// ── Place the order ────────────────────────────────────────────────
		await page.locator( 'button:has-text("Place order")' ).click();

		// A successful order redirects to the order-received / thank-you page.
		await page.waitForURL( '**/order-received/**', { waitUntil: 'networkidle' } );
		await expect( page.locator( 'h1, h2' ).filter( { hasText: /thank you|order received/i } ) ).toBeVisible();
	} );
} );
