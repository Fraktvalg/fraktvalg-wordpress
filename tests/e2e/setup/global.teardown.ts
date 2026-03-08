import { test as teardown } from '@playwright/test';
import { deleteOption, wpCli } from '../utils/wp-cli';

teardown( 'clean up test environment', async() => {
	// Plugin options.
	deleteOption( 'fraktvalg_configured' );
	deleteOption( 'fraktvalg_api_key' );
	deleteOption( 'fraktvalg_test_registered_shippers' );
	deleteOption( 'fraktvalg_test_valid_api_key' );
	deleteOption( 'fraktvalg_test_force_register_error' );

	// Remove any WooCommerce test shipping zones created during the suite.
	// The zones are named "Norway (Tests)" so we can target them specifically.
	try {
		const output = wpCli( 'wc shipping_zone list --user=1 --format=json' );
		const zones  = JSON.parse( output ) as Array<{ id: number; name: string }>;
		for ( const zone of zones ) {
			if ( zone.name === 'Norway (Tests)' ) {
				wpCli( `wc shipping_zone delete ${ zone.id } --force=true --user=1` );
			}
		}
	} catch {
		// wp-env may already be stopped; ignore cleanup errors.
	}

	// Remove any leftover test products.  The front-end suites share a single
	// setup (via getOrSetupFrontEnd) so the product may not have been deleted
	// by the spec-level afterAll if only a subset of suites ran.
	try {
		const output = wpCli( 'wc product list --name="Fraktvalg Test Product" --format=json --user=1' );
		const products = JSON.parse( output ) as Array<{ id: number }>;
		for ( const product of products ) {
			wpCli( `wc product delete ${ product.id } --force=true --user=1` );
		}
	} catch {
		// Ignore if no products found or wp-env stopped.
	}
});
