import type { Page } from '@playwright/test';
import { wpCli, updateOptionPhp } from './wp-cli';

/**
 * Enable the BACS (bank transfer / invoice) payment gateway in WooCommerce so
 * orders can be placed in tests without real payment credentials.
 */
export function enableBacsPayment(): void {
	wpCli( 'wc payment_gateway update bacs --enabled=1 --user=1' );
}

/**
 * Configure the WooCommerce store base address to Norway / Oslo.
 * This gives WooCommerce a valid fallback destination for shipping calculations.
 */
export function setupStoreAddress(): void {
	wpCli( 'option update woocommerce_default_country "NO:03"' );
	wpCli( 'option update woocommerce_store_city "Oslo"' );
	wpCli( 'option update woocommerce_store_postcode "0150"' );
	// Use store base location for customers without an explicit address so
	// WooCommerce calculates Norway shipping rates in the test environment
	// (geolocation would fail for local Docker IPs).
	wpCli( 'option update woocommerce_default_customer_address "base"' );
}

/**
 * Create a simple in-stock test product and return its ID.
 */
export function createTestProduct(): string {
	return wpCli(
		'wc product create --name="Fraktvalg Test Product" --regular_price=200 --in_stock=true --user=1 --porcelain'
	);
}

/**
 * Permanently delete a WooCommerce product by ID.
 */
export function deleteProduct( id: string ): void {
	try {
		wpCli( `wc product delete ${ id } --force=true --user=1` );
	} catch {
		// Product may have already been deleted.
	}
}

/**
 * Create a WooCommerce shipping zone covering Norway, add the Fraktvalg
 * shipping method to it, and return the zone ID.
 */
export function createNorwayShippingZone(): string {
	const zoneId = wpCli(
		'wc shipping_zone create --name="Norway (Tests)" --order=1 --user=1 --porcelain'
	);

	// shipping_zone_location has no 'save' subcommand and shipping_zone_method
	// create returns 500 because the fraktvalg method isn't known to WP-CLI's
	// WC context.  Insert both rows directly into the database instead.
	wpCli( `eval 'global $wpdb; $wpdb->insert( $wpdb->prefix . "woocommerce_shipping_zone_locations", [ "zone_id" => ${ zoneId }, "location_code" => "NO", "location_type" => "country" ] ); $wpdb->insert( $wpdb->prefix . "woocommerce_shipping_zone_methods", [ "zone_id" => ${ zoneId }, "method_id" => "fraktvalg", "method_order" => 1, "is_enabled" => 1 ] );'` );

	// Flush WooCommerce shipping cache so the new zone + method are picked up
	// immediately (direct DB inserts bypass the hooks that normally do this).
	wpCli( `eval 'WC_Cache_Helper::get_transient_version( "shipping", true );'` );

	return zoneId;
}

/**
 * Permanently delete a WooCommerce shipping zone by ID.
 */
export function deleteShippingZone( id: string ): void {
	try {
		wpCli( `wc shipping_zone delete ${ id } --force=true --user=1` );
	} catch {
		// Zone may have already been deleted.
	}
}

/**
 * Register both Bring and HeltHjem as connected providers in the test fake
 * API by writing their credentials directly to the WordPress option that the
 * API faker reads.
 */
export function registerTestProviders(): void {
	// Store as a PHP-serialized array so the fake API's foreach loops work.
	updateOptionPhp( 'fraktvalg_test_registered_shippers', {
		bring: {
			shipper_id:           'bring',
			customerNumber:       'TEST123',
			'X-Mybring-API-Uid':  'test@example.com',
			'X-Mybring-API-Key':  'test-key',
		},
		helthjem: {
			shipper_id:  'helthjem',
			api_key:     'test-helthjem-key',
			customer_id: '12345',
		},
	} );
}

/**
 * Create a WooCommerce order with Fraktvalg shipping and return its ID.
 * The order is created with BACS payment in processing status.
 */
export function createTestOrder( productId: string ): string {
	const billing  = JSON.stringify( {
		first_name: 'Test',
		last_name:  'User',
		address_1:  'Testveien 1',
		city:       'Oslo',
		postcode:   '0150',
		country:    'NO',
		email:      'test@example.com',
		phone:      '12345678',
	} );
	const shipping = JSON.stringify( {
		first_name: 'Test',
		last_name:  'User',
		address_1:  'Testveien 1',
		city:       'Oslo',
		postcode:   '0150',
		country:    'NO',
	} );
	const lines    = JSON.stringify( [ { product_id: productId, quantity: 1 } ] );
	const shipLine = JSON.stringify( [ {
		method_id:    'fraktvalg',
		method_title: 'Fraktvalg Shipping',
		total:        '49.00',
	} ] );

	const id = wpCli(
		`wc shop_order create --status=processing --payment_method=bacs --billing='${ billing }' --shipping='${ shipping }' --line_items='${ lines }' --shipping_lines='${ shipLine }' --user=1 --porcelain`
	);

	// Tag the order so the Fraktvalg metabox renders.
	// ShippingLabel::init() checks for 'fraktvalg' meta on shipping line items;
	// the metabox itself reads '_fraktvalg_shipper' from the order.
	wpCli( `eval '$o = wc_get_order( ${ id } ); $o->update_meta_data( "_fraktvalg_shipper", "bring" ); foreach ( $o->get_items( "shipping" ) as $item ) { $item->update_meta_data( "fraktvalg", "bring" ); $item->save(); } $o->save();'` );

	return id;
}

/**
 * Delete a WooCommerce order by ID.
 */
export function deleteOrder( id: string ): void {
	try {
		wpCli( `wc shop_order delete ${ id } --force=true --user=1` );
	} catch {
		// Order may have already been deleted.
	}
}

/**
 * Use the WooCommerce Store API (from within the browser session) to set
 * the customer's shipping address.  Call this after navigating to any
 * WooCommerce-enabled page so that wcSettings.storeApiNonce is available.
 * Reloads the page after updating so the cart picks up the new address.
 */
export async function setSessionShippingAddress( page: Page ): Promise<void> {
	await page.evaluate( async () => {
		const nonce = ( window as Record<string, any> ).wcSettings?.storeApiNonce ?? '';
		await fetch( '/wp-json/wc/store/v1/cart/update-customer', {
			method:      'POST',
			credentials: 'same-origin',
			headers:     {
				'Content-Type': 'application/json',
				'Nonce':        nonce,
			},
			body: JSON.stringify( {
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
	await page.reload( { waitUntil: 'networkidle' } );
}
