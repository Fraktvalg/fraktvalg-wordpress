<?php

namespace Fraktvalg\Fraktvalg\REST\WooCommerce;

use Fraktvalg\Fraktvalg\Api;
use Fraktvalg\Fraktvalg\REST\Base;
use Fraktvalg\Fraktvalg\WooCommerce\Admin\Settings\PhoneNumber;

class CreateConsignment extends Base {

	protected $permission_role = 'manage_woocommerce';

	public function __construct() {
		parent::__construct();
	}

	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/woocommerce/create-consignment',
			[
				'methods' => \WP_REST_Server::EDITABLE,
				'args' => [
					'order_id' => [
						'type' => 'integer',
						'required' => true,
					],
				],
				'callback' => array( $this, 'create_shipment' ),
				'permission_callback' => array( $this, 'permission_callback' ),
			]
		);
	}

	public function create_shipment( \WP_REST_Request $request ) {
		$order = \wc_get_order( $request->get_param( 'order_id' ) );
		$shipping_methods = $order->get_shipping_methods();

		foreach ( $shipping_methods as $shipping_method ) {
			// Check if this is a local pickup order
			$shipper = $shipping_method->get_meta( 'shipper' );
			if ( 'local_pickup' === $shipper || $shipping_method->get_meta( 'local_pickup' ) ) {
				// Add order note
				$order->add_order_note(
					__( 'This order is marked for local store pickup. The item should be picked up at the store and should not be shipped.', 'fraktvalg' ),
					false // Not a customer note.
				);

				// Save meta data to indicate local pickup
				$order->update_meta_data( '_fraktvalg_shipper', 'local_pickup' );
				$order->update_meta_data( '_fraktvalg_local_pickup', true );
				$order->save();

				// Return success response without creating consignment
				return new \WP_REST_Response([
					'success' => true,
					'local_pickup' => true,
					'message' => __( 'Order is marked for store pickup. No shipping label is required.', 'fraktvalg' ),
					'data' => [
						'shipper' => 'local_pickup',
						'shippingMethod' => $shipping_method->get_name(),
					]
				], 200);
			}
			$total_weight = 0;
			$total_length = 0;
			$total_width = 0;
			$total_height = 0;
			$total_volume = 0;

			// Get units once before the loop
			$weight_unit = get_option( 'woocommerce_weight_unit' );
			$dimension_unit = get_option( 'woocommerce_dimension_unit' );

			// Set up dimension conversion factor
			$dimension_conversion_factor = 1;
			switch ( $dimension_unit ) {
				case 'm':
					$dimension_conversion_factor = 1000;
					break;
				case 'cm':
					$dimension_conversion_factor = 10;
					break;
				case 'in':
					$dimension_conversion_factor = 25.4;
					break;
				case 'yd':
					$dimension_conversion_factor = 914.4;
					break;
				// 'mm' needs no conversion
			}

			foreach ( $order->get_items() as $single_order_item ) {
				$product = $single_order_item->get_product();
				if ( $single_order_item->get_quantity() < 1 || ! $product->needs_shipping() ) {
					continue;
				}

				// Get the weight and convert to grams
				$product_weight = $product->get_weight();
				if ( $product_weight ) {
					switch ( $weight_unit ) {
						case 'kg':
							$product_weight *= 1000;
							break;
						case 'lbs':
							$product_weight *= 453.59237;
							break;
						case 'oz':
							$product_weight *= 28.3495231;
							break;
						// 'g' needs no conversion
					}
				}

				// Get dimensions and convert to millimeters
				$product_length = $product->get_length();
				$product_width = $product->get_width();
				$product_height = $product->get_height();
				$product_volume = 0;

				if ( $product_length || $product_width || $product_height ) {
					if ( $product_length ) {
						$product_length *= $dimension_conversion_factor;
					}
					if ( $product_width ) {
						$product_width *= $dimension_conversion_factor;
					}
					if ( $product_height ) {
						$product_height *= $dimension_conversion_factor;
					}

					// Recalculate volume if it wasn't explicitly set
					if ( $product_length && $product_width && $product_height ) {
						$product_volume = $product_length * $product_width * $product_height;
					}
				}

				if ( $product_weight ) {
					$total_weight += ( (float) $product_weight * $single_order_item->get_quantity() );
				}
				if ( $product_length && $product_width && $product_height ) {
					$total_length = max( $total_length, (float) $product_length );
					$total_width = max( $total_width, (float) $product_width );
					$total_height = max( $total_height, (float) $product_height );

					$total_volume += ( ( (float) $product_length * (float) $product_width * (float) $product_height ) * $single_order_item->get_quantity() );
				}
			}

			// Ensure minimum weight of 1g instead of 1kg
			if ( $total_weight < 1 ) {
				$total_weight = 1;
			}

			$shipping_meta = $shipping_method->get_meta( 'option', true );
			$shipping_meta->id = $shipping_method->get_meta( 'shipper' );

			$shipping_options_array = [
				'shipper'   => \wp_json_encode( $shipping_meta ),
				'sender'    => [
					'name'       => \get_bloginfo( 'name' ),
					'country'    => \get_option( 'woocommerce_default_country' ),
					'postalCode' => \get_option( 'woocommerce_store_postcode' ),
					'city'       => \get_option( 'woocommerce_store_city' ),
					'address'    => \get_option( 'woocommerce_store_address' ),
					'email'      => \get_option( 'woocommerce_email_from_address', null ),
					'phone'      => PhoneNumber::get_value(),
				],
				'recipient' => [
					'name'       => trim( $order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name() ),
					'country'    => $order->get_shipping_country(),
					'postalCode' => $order->get_shipping_postcode(),
					'city'       => $order->get_shipping_city(),
					'address'    => $order->get_shipping_address_1(),
					'email'		=> $order->get_billing_email(),
					'phone'		=> $order->get_billing_phone(),
				],
				'packages'  => [
					[
						'packageWeight' => $total_weight
					]
				],
			];

			// Add dimensions if they are available
			if ($total_length > 0) {
				$shipping_options_array['packages'][0]['packageLength'] = ceil( $total_length );
			}
			if ($total_width > 0) {
				$shipping_options_array['packages'][0]['packageWidth'] = ceil( $total_width );
			}
			if ($total_height > 0) {
				$shipping_options_array['packages'][0]['packageHeight'] = ceil( $total_height );
			}
			if ($total_volume > 0) {
				$shipping_options_array['packages'][0]['packageVolume'] = ceil( $total_volume );
			}

			$shipment = Api::post(
				'/shipment/register',
				$shipping_options_array
			);

			if ( \is_wp_error( $shipment ) || 200 !== $shipment['response']['code'] ) {
				$error_message = \is_wp_error( $shipment ) ? $shipment->get_error_message() : $shipment['response']['message'];

				$order->add_order_note(
					\sprintf(
						// translators: 1: Shipping method name, 2: Shipper name, 3: Error message.
						__( 'Fraktvalg: Failed to create shipment with %1$s for %2$s (%3$s)', 'fraktvalg' ),
						$shipping_method->get_name(),
						\ucfirst( $shipping_method->get_meta( 'shipper' ) ),
						$error_message
					),
					false // Not a customer note.
				);

				return new \WP_REST_Response([
					'success' => false,
					'error' => $error_message,
					'shippingMethod' => $shipping_method->get_name(),
					'shipper' => $shipping_method->get_meta( 'shipper' )
				], 400);
			}

			$shipment = \json_decode( $shipment['body'] );

			// Individually store the shipment ID separate from the full shipment metadata for more performant lookups.
			$order->update_meta_data( '_fraktvalg_shipper', $shipping_method->get_meta( 'shipper' ) );
			$order->update_meta_data( '_fraktvalg_shipment_id', $shipment->shipmentId );
			$order->update_meta_data( '_fraktvalg_shipment_meta', \wp_json_encode( $shipment ) );

			$order->add_order_note(
				\sprintf(
					// translators: 1: Shipping method name, 2: Shipper name, 3: Shipment ID.
					__( 'Fraktvalg: Shipment created with %1$s for %2$s and has been assigned shipment ID %3$s', 'fraktvalg' ),
					$shipping_method->get_name(),
					\ucfirst( $shipping_method->get_meta( 'shipper' ) ),
					$shipment->shipmentId
				),
				false // Not a customer note.
			);

			$order->save();

			// Return success response with shipment data
			return new \WP_REST_Response([
				'success' => true,
				'data' => [
					'shipmentId' => $shipment->shipmentId,
					'shipper' => $shipping_method->get_meta( 'shipper' ),
					'shippingMethod' => $shipping_method->get_name(),
					'meta' => $shipment
				]
			], 200);
		}

		// If we get here, no valid shipping methods were found
		return new \WP_REST_Response([
			'success' => false,
			'error' => __( 'No valid Fraktvalg shipping methods found for this order.', 'fraktvalg' )
		], 400);
	}

}
