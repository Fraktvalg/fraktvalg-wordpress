import { test, expect } from '@playwright/test';
import { signIn } from '../../common';
import { updateOption, deleteOption } from '../../utils/wp-cli';
import {
	createTestProduct,
	deleteProduct,
	createTestOrder,
	deleteOrder,
	registerTestProviders,
} from '../../utils/woocommerce';

test.describe.configure( { mode: 'serial' } );

test.describe( 'Admin — Orders & Shipments', () => {
	let productId: string;
	let orderId: string;

	test.beforeAll( async () => {
		// Configure the plugin.
		updateOption( 'fraktvalg_configured', '1' );
		updateOption( 'fraktvalg_api_key', 'fraktvalg-test-api-key' );
		registerTestProviders();
		// Ensure the error-simulation flag is cleared before the suite starts.
		deleteOption( 'fraktvalg_test_force_register_error' );

		// Create a product and an order with Fraktvalg shipping.
		productId = createTestProduct();
		orderId   = createTestOrder( productId );
	} );

	test.afterAll( async () => {
		deleteOrder( orderId );
		deleteProduct( productId );
	} );

	test( 'lists the test order in the WooCommerce orders screen', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( '/wp-admin/admin.php?page=wc-orders' );

		// The order should appear in the list.
		await expect( page.locator( `a[href*="id=${ orderId }"]` ).first() ).toBeVisible();
	} );

	test( 'shows the Fraktvalg metabox on the order edit page', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( `/wp-admin/admin.php?page=wc-orders&action=edit&id=${ orderId }` );

		await expect( page.locator( '#fraktvalg-label-meta-box' ) ).toBeVisible();
		await expect( page.locator( 'button:has-text("Create consignment booking")' ) ).toBeVisible();
	} );

	test( 'can create a consignment booking for an order', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( `/wp-admin/admin.php?page=wc-orders&action=edit&id=${ orderId }` );

		await page.click( 'button:has-text("Create consignment booking")' );

		// After a successful booking the UI transitions to the label view.
		await expect( page.locator( 'button:has-text("Fetch & print shipping label")' ) ).toBeVisible( { timeout: 15000 } );
		await expect( page.locator( 'button:has-text("Create consignment booking")' ) ).not.toBeVisible();
	} );

	test( 'can open the shipping label modal after booking', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( `/wp-admin/admin.php?page=wc-orders&action=edit&id=${ orderId }` );

		// The label button should already be visible because the previous test
		// persisted the shipment ID in the order meta.
		await expect( page.locator( 'button:has-text("Fetch & print shipping label")' ) ).toBeVisible( { timeout: 10000 } );
		await page.click( 'button:has-text("Fetch & print shipping label")' );

		// The modal opens and fetches the label from the fake API (1×1 PNG).
		const modal = page.locator( '.fixed.inset-0' );
		await expect( modal ).toBeVisible();
		await expect( modal.locator( 'button:has-text("Print")' ) ).toBeVisible( { timeout: 10000 } );

		// The label image should be rendered (PNG data-URI from the fake API).
		await expect( modal.locator( 'img[src^="data:image/png"]' ) ).toBeVisible();

		// Close the modal.
		await modal.locator( 'button:has-text("×")' ).click();
		await expect( modal ).not.toBeVisible();
	} );

	test( 'shows an error notification when consignment creation fails', async ( { page } ) => {
		const badOrder = createTestOrder( productId );

		// Force the fake API to return a 500 for /shipment/register so the
		// React UI's error-handling path is exercised.
		updateOption( 'fraktvalg_test_force_register_error', '1' );

		await signIn( { page } );
		await page.goto( `/wp-admin/admin.php?page=wc-orders&action=edit&id=${ badOrder }` );

		await page.click( 'button:has-text("Create consignment booking")' );

		await expect( page.locator( '.bg-red-100' ) ).toBeVisible( { timeout: 10000 } );

		// Clean up: restore normal API behaviour and remove the temporary order.
		deleteOption( 'fraktvalg_test_force_register_error' );
		deleteOrder( badOrder );
	} );
} );
