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
} );
