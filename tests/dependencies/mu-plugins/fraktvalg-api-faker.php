<?php
/**
 * Fraktvalg API Faker
 *
 * MU-plugin that intercepts all outgoing requests to api.fraktvalg.no and
 * returns deterministic fake responses for end-to-end testing.
 *
 * Mapped into the wp-env test environment only via .wp-env.json.
 * Never load this file on a production or development site.
 */

if ( ! defined( 'ABSPATH' ) ) {
	return;
}

add_filter( 'pre_http_request', 'fraktvalg_fake_api_request', 10, 3 );

/**
 * Short-circuit any WordPress HTTP request destined for api.fraktvalg.no.
 *
 * @param false|array $preempt     False, or a pre-built response array.
 * @param array       $parsed_args The request arguments.
 * @param string      $url         The request URL.
 * @return false|array             False to pass through, or a fake response array.
 */
function fraktvalg_fake_api_request( $preempt, $parsed_args, $url ) {
	if ( strpos( $url, 'api.fraktvalg.no' ) === false ) {
		return $preempt;
	}

	$path     = parse_url( $url, PHP_URL_PATH );
	$endpoint = rtrim( preg_replace( '#^/api#', '', $path ), '/' );
	$method   = strtoupper( $parsed_args['method'] ?? 'GET' );

	$body = array();
	if ( ! empty( $parsed_args['body'] ) ) {
		if ( is_array( $parsed_args['body'] ) ) {
			$body = $parsed_args['body'];
		} elseif ( is_string( $parsed_args['body'] ) ) {
			parse_str( $parsed_args['body'], $body );
		}
	}

	return fraktvalg_fake_route( $method, $endpoint, $body );
}

/**
 * Dispatch a faked request to the correct handler.
 *
 * @param string $method   HTTP method (GET, POST, …).
 * @param string $endpoint Path with /api prefix removed and trailing slash stripped.
 * @param array  $body     Parsed request body.
 * @return array WordPress HTTP response array.
 */
function fraktvalg_fake_route( $method, $endpoint, $body ) {
	switch ( true ) {

		/* ── Account ─────────────────────────────────────────────────────── */

		case 'POST' === $method && '/account/validate' === $endpoint:
			return fraktvalg_fake_account_validate( $body );

		case 'POST' === $method && '/account/register' === $endpoint:
			return fraktvalg_fake_json_response( array( 'message' => 'The API user has been registered.' ) );

		case 'POST' === $method && '/account/unregister' === $endpoint:
			return fraktvalg_fake_json_response( array( 'message' => 'The API user has been unregistered.' ) );

		/* ── Shipper ─────────────────────────────────────────────────────── */

		case 'GET' === $method && '/shipper/list/available' === $endpoint:
			return fraktvalg_fake_shipper_list_available();

		case 'GET' === $method && '/shipper/list/mine' === $endpoint:
			return fraktvalg_fake_shipper_list_mine();

		// POST /shipper/list/methods — fetch options for a connected provider
		case 'POST' === $method && '/shipper/list/methods' === $endpoint:
			return fraktvalg_fake_shipper_list_methods( $body );

		// POST /shipper/list/methods/store — persist method-option choices
		case 'POST' === $method && '/shipper/list/methods/store' === $endpoint:
			return fraktvalg_fake_json_response( array( 'message' => 'Shipping methods stored' ) );

		case 'POST' === $method && '/shipper/register' === $endpoint:
			return fraktvalg_fake_shipper_register( $body );

		case 'POST' === $method && '/shipper/disconnect' === $endpoint:
			return fraktvalg_fake_shipper_disconnect( $body );

		/* ── Shipment ────────────────────────────────────────────────────── */

		case 'POST' === $method && '/shipment/offers' === $endpoint:
			return fraktvalg_fake_shipment_offers();

		case 'POST' === $method && '/shipment/register' === $endpoint:
			return fraktvalg_fake_shipment_register( $body );

		case 'POST' === $method && '/shipment/label' === $endpoint:
			return fraktvalg_fake_shipment_label();

		default:
			return fraktvalg_fake_json_response(
				array( 'error' => 'Unknown endpoint: ' . $method . ' ' . $endpoint ),
				404,
				'Not Found'
			);
	}
}

// ─── Account handlers ─────────────────────────────────────────────────────────

function fraktvalg_fake_account_validate( $body ) {
	if ( empty( $body['key'] ) ) {
		return fraktvalg_fake_json_response(
			array( 'message' => 'Your request did not include an API key.' ),
			400,
			'Bad Request'
		);
	}

	// Accept the canonical test key or whatever key is stored in the test option.
	$valid_key = get_option( 'fraktvalg_test_valid_api_key', 'fraktvalg-test-api-key' );
	if ( $body['key'] !== $valid_key ) {
		return fraktvalg_fake_json_response(
			array( 'message' => 'An invalid API key was used.' ),
			401,
			'Unauthorized'
		);
	}

	return fraktvalg_fake_json_response( array( 'message' => 'The API key has been validated.' ) );
}

// ─── Shipper handlers ─────────────────────────────────────────────────────────

/**
 * All providers the platform makes available — mirrors ShippingServiceResource.
 *
 * The response is a JSON object keyed by provider slug, wrapped in `data`,
 * matching what ShippingServiceResourceCollection produces (associative array
 * preserved as an object on the wire).
 */
function fraktvalg_fake_shipper_list_available() {
	$providers = (object) array(
		'bring'    => array(
			'id'          => 'bring',
			'name'        => 'Posten',
			'logo'        => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 133 133"><circle cx="66.5" cy="66.5" r="66.5" fill="#E32D22"/></svg>',
			'description' => 'Recommended for packages in Norway',
			'fields'      => fraktvalg_fake_bring_fields(),
		),
		'helthjem' => array(
			'id'          => 'helthjem',
			'name'        => 'HeltHjem',
			'logo'        => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#003087"/></svg>',
			'description' => 'Fast home delivery in Norway',
			'fields'      => array(
				array(
					'name'     => 'api_key',
					'label'    => 'HeltHjem API Key',
					'type'     => 'password',
					'required' => true,
					'private'  => true,
				),
				array(
					'name'     => 'customer_id',
					'label'    => 'HeltHjem Customer ID',
					'type'     => 'string',
					'required' => true,
					'private'  => false,
				),
			),
		),
	);

	return fraktvalg_fake_json_response( array( 'data' => $providers ) );
}

/**
 * Providers the current account has connected — mirrors ShippingProviderResource.
 *
 * The response wraps a numeric array (not keyed) in `data`, matching what
 * ShippingProviderResourceCollection produces.
 */
function fraktvalg_fake_shipper_list_mine() {
	$registered = get_option( 'fraktvalg_test_registered_shippers', array() );

	$all_available = array(
		'bring'    => array(
			'id'          => 'bring',
			'name'        => 'Posten',
			'logo'        => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 133 133"><circle cx="66.5" cy="66.5" r="66.5" fill="#E32D22"/></svg>',
			'description' => 'Recommended for packages in Norway',
			'fields'      => fraktvalg_fake_bring_fields(),
		),
		'helthjem' => array(
			'id'          => 'helthjem',
			'name'        => 'HeltHjem',
			'logo'        => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#003087"/></svg>',
			'description' => 'Fast home delivery in Norway',
			'fields'      => array(
				array(
					'name'     => 'api_key',
					'label'    => 'HeltHjem API Key',
					'type'     => 'password',
					'required' => true,
					'private'  => true,
				),
				array(
					'name'     => 'customer_id',
					'label'    => 'HeltHjem Customer ID',
					'type'     => 'string',
					'required' => true,
					'private'  => false,
				),
			),
		),
	);

	$data = array();
	foreach ( $registered as $shipper_id => $auth ) {
		if ( ! isset( $all_available[ $shipper_id ] ) ) {
			continue;
		}

		$provider = $all_available[ $shipper_id ];

		// Merge stored auth values into fields (mask private ones).
		$fields = array();
		foreach ( $provider['fields'] as $field ) {
			$fields[] = array_merge(
				$field,
				array( 'value' => ( $field['private'] ?? false ) ? null : ( $auth[ $field['name'] ] ?? null ) )
			);
		}

		$data[] = array_merge( $provider, array( 'fields' => $fields ) );
	}

	return fraktvalg_fake_json_response( array( 'data' => $data ) );
}

/**
 * Per-product shipping method options for a connected provider — mirrors
 * ShippingService::getShippingMethodOptions().
 */
function fraktvalg_fake_shipper_list_methods( $body ) {
	$shipper_id = $body['shipper_id'] ?? '';

	// Return Bring-style method options regardless of which shipper is requested,
	// since the structure is the same across providers.
	$options = array(
		array(
			'id'                    => '5600',
			'name'                  => '',
			'description'           => 'Door-to-door delivery of parcels',
			'helpText'              => 'Delivery to your doorstep',
			'productCode'           => 'PAKKE_I_POSTKASSEN',
			'active'                => true,
			'price'                 => null,
			'canEditPrice'          => false,
			'hasFreeShipping'       => false,
			'freeShippingThreshold' => 0,
			'vatRate'               => 25.0,
			'originalName'          => 'Home Delivery',
		),
		array(
			'id'                    => '5800',
			'name'                  => '',
			'description'           => 'Delivery to nearest pickup point',
			'helpText'              => 'Collection from your local pickup point',
			'productCode'           => 'PICKUP_POINT',
			'active'                => true,
			'price'                 => null,
			'canEditPrice'          => false,
			'hasFreeShipping'       => false,
			'freeShippingThreshold' => 0,
			'vatRate'               => 25.0,
			'originalName'          => 'Pickup Point',
		),
		array(
			'id'                    => '3584',
			'name'                  => '',
			'description'           => 'Small parcels delivered to mailbox',
			'helpText'              => 'For parcels that fit in your mailbox',
			'productCode'           => 'BPAKKE_DOR-DOR',
			'active'                => true,
			'price'                 => null,
			'canEditPrice'          => false,
			'hasFreeShipping'       => false,
			'freeShippingThreshold' => 0,
			'vatRate'               => 25.0,
			'originalName'          => 'Mailbox Parcel',
		),
	);

	return fraktvalg_fake_json_response( $options );
}

/**
 * Register a shipping provider for this account.
 * Persists state so subsequent /shipper/list/mine calls reflect the change.
 */
function fraktvalg_fake_shipper_register( $body ) {
	$shipper_id = $body['shipper_id'] ?? null;

	if ( ! $shipper_id ) {
		return fraktvalg_fake_json_response(
			array( 'message' => 'The shipper_id field is required.' ),
			422,
			'Unprocessable Entity'
		);
	}

	$registered                = get_option( 'fraktvalg_test_registered_shippers', array() );
	$registered[ $shipper_id ] = $body;
	update_option( 'fraktvalg_test_registered_shippers', $registered );

	return fraktvalg_fake_json_response( array( 'message' => 'Shipping service registered' ) );
}

/**
 * Disconnect a previously registered shipping provider.
 */
function fraktvalg_fake_shipper_disconnect( $body ) {
	$shipper_id = $body['shipper_id'] ?? null;

	if ( ! $shipper_id ) {
		return fraktvalg_fake_json_response(
			array( 'message' => 'The shipper_id field is required.' ),
			422,
			'Unprocessable Entity'
		);
	}

	$registered = get_option( 'fraktvalg_test_registered_shippers', array() );
	unset( $registered[ $shipper_id ] );
	update_option( 'fraktvalg_test_registered_shippers', $registered );

	return fraktvalg_fake_json_response( array( 'message' => 'Shipping service disconnected' ) );
}

// ─── Shipment handlers ────────────────────────────────────────────────────────

/**
 * Return shipping rate alternatives — mirrors ShippingOptionsResourceCollection.
 *
 * The response has no `data` wrapper ($wrap = null) and is a plain JSON object
 * keyed by provider slug, with each value being an array of rate options.
 */
function fraktvalg_fake_shipment_offers() {
	$registered = get_option( 'fraktvalg_test_registered_shippers', array() );

	// Fall back to Bring when no providers have been registered yet so that
	// basic checkout tests work without first completing the onboarding flow.
	if ( empty( $registered ) ) {
		$registered = array( 'bring' => array() );
	}

	$options = array();

	if ( isset( $registered['bring'] ) ) {
		$options['bring'] = array(
			array(
				'texts'    => array(
					'shipperName'  => 'Posten',
					'logo'         => array(
						'name' => 'bring',
						'url'  => '',
					),
					'displayName'  => 'Pickup Point',
					'description'  => 'Delivery to nearest pickup point',
					'help'         => 'Collection from your local pickup point',
					'originalName' => 'Pickup Point',
				),
				'price'    => array(
					'withVAT'               => 49,
					'withoutVAT'            => 39,
					'VAT'                   => 10,
					'currency'              => 'NOK',
					'freeShippingThreshold' => 0,
					'hasFreeShipping'       => false,
				),
				'delivery' => array(
					'estimatedDays' => 3,
					'estimatedDate' => gmdate( 'Y-n-j', strtotime( '+3 weekdays' ) ),
					'productCode'   => '',
					'serviceCode'   => 'ServiceParcel',
				),
				'meta'     => array( 'product' => '5800' ),
			),
			array(
				'texts'    => array(
					'shipperName'  => 'Posten',
					'logo'         => array(
						'name' => 'bring',
						'url'  => '',
					),
					'displayName'  => 'Home Delivery',
					'description'  => 'Door-to-door delivery of parcels',
					'help'         => 'Delivery to your doorstep',
					'originalName' => 'Home Delivery',
				),
				'price'    => array(
					'withVAT'               => 99,
					'withoutVAT'            => 79,
					'VAT'                   => 20,
					'currency'              => 'NOK',
					'freeShippingThreshold' => 0,
					'hasFreeShipping'       => false,
				),
				'delivery' => array(
					'estimatedDays' => 2,
					'estimatedDate' => gmdate( 'Y-n-j', strtotime( '+2 weekdays' ) ),
					'productCode'   => '',
					'serviceCode'   => 'HomeDelivery',
				),
				'meta'     => array( 'product' => '5600' ),
			),
		);
	}

	if ( isset( $registered['helthjem'] ) ) {
		$options['helthjem'] = array(
			array(
				'texts'    => array(
					'shipperName'  => 'HeltHjem',
					'logo'         => array(
						'name' => 'helthjem',
						'url'  => '',
					),
					'displayName'  => 'Home Delivery',
					'description'  => 'Fast home delivery',
					'help'         => 'Delivered to your door',
					'originalName' => 'Home Delivery',
				),
				'price'    => array(
					'withVAT'               => 79,
					'withoutVAT'            => 63,
					'VAT'                   => 16,
					'currency'              => 'NOK',
					'freeShippingThreshold' => 0,
					'hasFreeShipping'       => false,
				),
				'delivery' => array(
					'estimatedDays' => 1,
					'estimatedDate' => gmdate( 'Y-n-j', strtotime( '+1 weekday' ) ),
					'productCode'   => '',
					'serviceCode'   => 'HomeDelivery',
				),
				'meta'     => array( 'product' => 'home' ),
			),
		);
	}

	return fraktvalg_fake_json_response( $options );
}

/**
 * Register a shipment and return a fake consignment number.
 * Mirrors the structure returned by ShipmentController::registerShipment().
 *
 * If the WordPress option `fraktvalg_test_force_register_error` is set to a
 * truthy value the function returns a 500 error instead, allowing tests to
 * exercise the error-handling path in the React UI without disabling the
 * entire fake API.
 */
function fraktvalg_fake_shipment_register( $body ) {
	if ( get_option( 'fraktvalg_test_force_register_error' ) ) {
		return fraktvalg_fake_json_response(
			array( 'message' => 'Simulated shipment registration error' ),
			500,
			'Internal Server Error'
		);
	}

	$shipment_id = 'TEST-' . strtoupper( wp_generate_password( 8, false ) );

	return fraktvalg_fake_json_response(
		array(
			'shipmentId' => $shipment_id,
			'delivery'   => array(
				'expected' => gmdate( 'Y-m-d', strtotime( '+2 weekdays' ) ),
			),
			'shipment'   => array(
				'label'       => 'https://api.fraktvalg.no/test/label/' . $shipment_id,
				'trackingUrl' => 'https://tracking.example.com/' . $shipment_id,
			),
		)
	);
}

/**
 * Return a minimal valid 1×1 transparent PNG as a base64 data-URI.
 *
 * ShippingLabel.php checks for `data:application/pdf` to trigger the
 * PdfProxy redirect; returning a PNG avoids that branch and keeps tests simple.
 */
function fraktvalg_fake_shipment_label() {
	// Smallest valid PNG (1×1 transparent pixel).
	$png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

	return fraktvalg_fake_json_response(
		array(
			'url' => 'data:image/png;base64,' . $png,
		)
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a WordPress HTTP response array containing a JSON body.
 *
 * @param mixed  $data    Data to JSON-encode as the response body.
 * @param int    $status  HTTP status code.
 * @param string $message HTTP status message.
 * @return array
 */
function fraktvalg_fake_json_response( $data, $status = 200, $message = 'OK' ) {
	return array(
		'headers'  => array( 'content-type' => 'application/json' ),
		'body'     => wp_json_encode( $data ),
		'response' => array(
			'code'    => $status,
			'message' => $message,
		),
		'cookies'  => array(),
		'filename' => null,
	);
}

/**
 * Field definitions for the Bring provider — reused across available/mine responses.
 *
 * @return array[]
 */
function fraktvalg_fake_bring_fields() {
	return array(
		array(
			'name'     => 'customerNumber',
			'label'    => 'Bring Customer Number',
			'type'     => 'string',
			'required' => true,
			'private'  => false,
		),
		array(
			'name'     => 'X-Mybring-API-Uid',
			'label'    => 'Mybring login ID',
			'type'     => 'string',
			'required' => true,
			'private'  => false,
		),
		array(
			'name'     => 'X-Mybring-API-Key',
			'label'    => 'Your users API key',
			'type'     => 'password',
			'required' => true,
			'private'  => true,
		),
	);
}
