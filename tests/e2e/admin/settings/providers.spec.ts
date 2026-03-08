import { test, expect } from '@playwright/test';
import { signIn } from '../../common';
import { deleteOption, updateOption, updateOptionPhp } from '../../utils/wp-cli';

test.describe.configure( { mode: 'serial' } );

test.describe( 'Settings — Providers', () => {
	test.beforeEach( async () => {
		// Start each test with the plugin configured but no providers connected.
		updateOption( 'fraktvalg_configured', '1' );
		updateOption( 'fraktvalg_api_key', 'fraktvalg-test-api-key' );
		deleteOption( 'fraktvalg_test_registered_shippers' );
		// Remove stored plugin options so update_option() always inserts a fresh
		// value (it returns false — no change — when the value is identical).
		deleteOption( 'fraktvalg_options' );
	} );

	test( 'shows the providers tab on the settings page', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

		await expect( page.locator( '#fraktvalg-settings' ) ).toBeVisible();
		// "My providers" tab heading should be visible once data loads.
		await expect( page.locator( 'text=My providers' ).first() ).toBeVisible();
	} );

	test( 'lists available providers that can be connected', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

		// Wait for providers to load — spinner disappears and provider cards appear.
		await expect( page.locator( 'text=Fetching available providers...' ) ).not.toBeVisible();

		// Both Bring (Posten) and HeltHjem should appear as connectable providers.
		await expect( page.locator( 'text=Posten' ).first() ).toBeVisible();
		await expect( page.locator( 'text=HeltHjem' ).first() ).toBeVisible();
	} );

	test( 'can connect the Bring provider', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

		await expect( page.locator( 'text=Fetching available providers...' ) ).not.toBeVisible();

		// Expand the Bring (Posten) provider card — the accordion toggle is a button
		// that contains the provider name; there is no data-supplier-id attribute.
		await page.locator( 'button' ).filter( { hasText: 'Posten' } ).first().click();

		// Fill in the required credential fields.
		await page.locator( 'input[name="customerNumber"], input[placeholder*="Customer Number"], input[aria-label*="Customer Number"]' ).first().fill( 'TEST-123' );
		await page.locator( 'input[name="X-Mybring-API-Uid"], input[placeholder*="login ID"], input[aria-label*="login ID"]' ).first().fill( 'test@example.com' );
		await page.locator( 'input[name="X-Mybring-API-Key"], input[placeholder*="API key"], input[aria-label*="API key"]' ).first().fill( 'test-api-key' );

		await page.click( 'button:has-text("Connect to this provider")' );

		// The Settings page does not auto-refresh after connecting; reload to
		// confirm the provider now appears in the connected section.
		await page.waitForTimeout( 1000 );
		await page.reload( { waitUntil: 'networkidle' } );

		// After reconnecting, the provider should appear in the connected section
		// and show an "Update provider settings" button.
		await expect( page.locator( 'button:has-text("Update provider settings")' ) ).toBeVisible( { timeout: 10000 } );
	} );

	test( 'can connect a second provider (HeltHjem)', async ( { page } ) => {
		// Pre-connect Bring so HeltHjem is the second provider.
		// Use updateOptionPhp so the value is stored as a PHP-serialized array
		// rather than a JSON string (the fake API uses get_option with foreach).
		updateOptionPhp( 'fraktvalg_test_registered_shippers', {
			bring: { shipper_id: 'bring', customerNumber: 'TEST123', 'X-Mybring-API-Uid': 'test@example.com', 'X-Mybring-API-Key': 'test-key' },
		} );

		await signIn( { page } );
		await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

		await expect( page.locator( 'text=Fetching available providers...' ) ).not.toBeVisible();

		// Expand the HeltHjem provider card.
		await page.locator( 'button' ).filter( { hasText: 'HeltHjem' } ).first().click();

		await page.locator( 'input[name="api_key"], input[placeholder*="API Key"], input[aria-label*="API Key"]' ).first().fill( 'helthjem-test-key' );
		await page.locator( 'input[name="customer_id"], input[placeholder*="Customer ID"], input[aria-label*="Customer ID"]' ).first().fill( '99999' );

		await page.click( 'button:has-text("Connect to this provider")' );

		// Reload to see the updated provider list after the Settings page doesn't auto-refresh.
		await page.waitForTimeout( 1000 );
		await page.reload( { waitUntil: 'networkidle' } );

		await expect( page.locator( 'button:has-text("Update provider settings")' ) ).toHaveCount( 2, { timeout: 10000 } );
	} );

	test.describe( 'Preferred provider (fallback pricing)', () => {
		test.beforeEach( async () => {
			// Both providers must be connected for the preferred-provider section to appear.
			updateOptionPhp( 'fraktvalg_test_registered_shippers', {
				bring:    { shipper_id: 'bring',    customerNumber: 'TEST123',          'X-Mybring-API-Uid': 'test@example.com', 'X-Mybring-API-Key': 'test-key' },
				helthjem: { shipper_id: 'helthjem', api_key: 'helthjem-test-key', customer_id: '99999' },
			} );
		} );

		test( 'shows the preferred provider section when two providers are connected', async ( { page } ) => {
			await signIn( { page } );
			await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

			await expect( page.locator( 'text=Fetching available providers...' ) ).not.toBeVisible();
			await expect( page.getByRole( 'heading', { name: 'Preferred provider' } ) ).toBeVisible();
			await expect( page.getByText( 'Price reduction for your preferred provider' ).first() ).toBeVisible();
		} );

		test( 'can set a preferred provider with a percentage discount', async ( { page } ) => {
			await signIn( { page } );
			await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

			await expect( page.getByRole( 'heading', { name: 'Preferred provider' } ) ).toBeVisible();

			// Enter a 10 % discount.
			await page.locator( 'input[type="number"][min="0"][step="1"]' ).first().fill( '10' );

			// Select "%" as the discount type (should be the default, but set it explicitly).
			await page.locator( 'select' ).filter( { hasText: '%' } ).first().selectOption( 'percent' );

			// Select Bring (Posten) as the preferred provider.
			await page.locator( 'label' ).filter( { hasText: 'Posten' } ).click();

			await page.click( 'button:has-text("Save preferred provider preferences")' );

			// Success notification should appear.
			await expect( page.locator( 'text=Preferred provider settings saved successfully' ) ).toBeVisible( { timeout: 10000 } );
		} );

		test( 'can disconnect a provider', async ( { page } ) => {
			await signIn( { page } );
			await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

			await expect( page.locator( 'text=Fetching available providers...' ) ).not.toBeVisible();

			// Accept the browser confirmation dialog.
			page.once( 'dialog', ( dialog ) => dialog.accept() );

			await page.click( 'button:has-text("Disconnect provider")' );

			// The Settings page does not auto-refresh after disconnecting; reload to
			// confirm the provider moved back to the available (connectable) list.
			await page.waitForTimeout( 1000 );
			await page.reload( { waitUntil: 'networkidle' } );

			// After disconnecting, one provider should now show as "Disconnected" in
			// the available list (the collapsed card shows its status badge in the header).
			await expect( page.locator( 'button' ).filter( { hasText: 'Disconnected' } ).first() ).toBeVisible( { timeout: 10000 } );
		} );
	} );

	test( 'can configure the backup shipping option in Optional Settings', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

		// Switch to the Optional settings tab.
		await page.click( 'button:has-text("Optional settings")' );

		// The backup shipping section should be visible.
		await expect( page.locator( 'text=Backup shipping option' ) ).toBeVisible();

		// Update the backup shipping option name and price.
		await page.locator( 'input[name="freight[custom][name]"]' ).fill( 'Standard Shipping' );
		await page.locator( 'input[name="freight[custom][price]"]' ).fill( '75' );
		await page.locator( 'select[name="freight[custom][type]"]' ).selectOption( 'fixed' );

		await page.click( 'button:has-text("Save optional settings")' );

		await expect( page.locator( 'text=Settings saved' ) ).toBeVisible( { timeout: 10000 } );
	} );
} );
