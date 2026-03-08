import { test, expect } from '@playwright/test';
import { signIn } from '../common';
import { deleteOption, updateOption } from '../utils/wp-cli';

test.describe.configure( { mode: 'serial' } );

test.describe( 'Onboarding', () => {
	test.beforeEach( async () => {
		deleteOption( 'fraktvalg_configured' );
		deleteOption( 'fraktvalg_api_key' );
		deleteOption( 'fraktvalg_test_registered_shippers' );
	} );

	test( 'shows the onboarding notice on the admin dashboard', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( '/wp-admin/' );

		const notice = page.locator( '.notice-warning' ).filter( { hasText: 'Open onboarding wizard' } );
		await expect( notice ).toBeVisible();
	} );

	test( 'shows an error when an invalid API key is entered', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( '/wp-admin/admin.php?page=fraktvalg-onboarding' );

		await page.fill( '#license', 'invalid-key' );
		await page.click( 'button:has-text("Activate license")' );

		const errorNotice = page.locator( '.bg-red-100' );
		await expect( errorNotice ).toBeVisible();
		await expect( errorNotice ).toContainText( 'An error was encountered when validating your API key' );
	} );

	test( 'can complete the full onboarding wizard', async ( { page } ) => {
		await signIn( { page } );
		await page.goto( '/wp-admin/admin.php?page=fraktvalg-onboarding' );

		// Step 1: License key
		await page.fill( '#license', 'fraktvalg-test-api-key' );
		await page.click( 'button:has-text("Activate license")' );

		// Step 2: Providers — always visible, proceed
		await expect( page.locator( 'text=Nesten ferdig' ) ).toBeVisible();
		await page.click( 'button:has-text("Next step")' );

		// Step 3: Templates
		await expect( page.locator( 'h2:has-text("Template Configuration")' ) ).toBeVisible();
		await page.click( 'button:has-text("Next step")' );

		// Step 4: Optional Settings — must save before Next step appears
		await expect( page.locator( 'text=Almost there!' ) ).toBeVisible();
		await page.click( 'button:has-text("Save optional settings")' );
		await page.click( 'button:has-text("Next step")' );

		// Step 5: Store Settings
		await expect( page.locator( 'h2:has-text("Store Settings")' ) ).toBeVisible();
		await page.click( 'button:has-text("Next step")' );

		// Step 6: Finished
		await expect( page.locator( 'text=Fraktvalg is now set up and ready to use' ) ).toBeVisible();
		await page.click( 'button:has-text("Finish setup")' );

		// Should redirect to the WordPress dashboard (index.php).
		await page.waitForURL( '**/wp-admin/index.php' );
	} );

	test.describe( 'After onboarding', () => {
		test.beforeEach( async () => {
			updateOption( 'fraktvalg_configured', '1' );
			updateOption( 'fraktvalg_api_key', 'fraktvalg-test-api-key' );
		} );

		test( 'does not show the onboarding notice after completion', async ( { page } ) => {
			await signIn( { page } );
			await page.goto( '/wp-admin/' );

			await expect( page.locator( 'text=Open onboarding wizard' ) ).not.toBeVisible();
		} );

		test( 'shows the Fraktvalg settings page under WooCommerce after completion', async ( { page } ) => {
			await signIn( { page } );
			await page.goto( '/wp-admin/admin.php?page=fraktvalg' );

			await expect( page.locator( '#fraktvalg-settings' ) ).toBeVisible();
		} );
	} );
} );
