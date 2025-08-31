<?php

namespace Fraktvalg\Fraktvalg\WooCommerce;

class ShippingMethod {

	public function __construct() {
		\add_filter( 'woocommerce_shipping_methods', [ $this, 'add_shipping_method' ] );
		// Hook into both classic and block checkout
		\add_action( 'woocommerce_checkout_create_order', [ $this, 'save_local_pickup_meta' ], 10, 2 );
		\add_action( 'woocommerce_checkout_update_order_meta', [ $this, 'save_local_pickup_meta_classic' ], 10, 1 );
		\add_action( 'woocommerce_store_api_checkout_update_order_meta', [ $this, 'save_local_pickup_meta_blocks' ], 10, 1 );
	}

	public function add_shipping_method( $shipping_methods ) {
		$shipping_methods['fraktvalg'] = 'Fraktvalg\Fraktvalg\WooCommerce\ShippingMethod\Fraktvalg';

		return $shipping_methods;
	}

	/**
	 * Save local pickup meta data to the order
	 *
	 * @param \WC_Order $order The order object
	 * @param array $data The checkout data
	 */
	public function save_local_pickup_meta( $order, $data ) {
		$this->check_and_save_local_pickup( $order );
	}

	/**
	 * Save local pickup meta for classic checkout
	 *
	 * @param int $order_id The order ID
	 */
	public function save_local_pickup_meta_classic( $order_id ) {
		$order = \wc_get_order( $order_id );
		if ( $order ) {
			$this->check_and_save_local_pickup( $order );
		}
	}

	/**
	 * Save local pickup meta for block checkout
	 *
	 * @param \WC_Order $order The order object
	 */
	public function save_local_pickup_meta_blocks( $order ) {
		$this->check_and_save_local_pickup( $order );
	}

	/**
	 * Check if order has local pickup and save meta
	 *
	 * @param \WC_Order $order The order object
	 */
	private function check_and_save_local_pickup( $order ) {
		// Get the chosen shipping method
		$shipping_methods = $order->get_shipping_methods();
		
		foreach ( $shipping_methods as $shipping_method ) {
			// Check if this is a Fraktvalg shipping method
			if ( $shipping_method->get_method_id() === 'fraktvalg' ) {
				// Use direct get_meta() method like CreateConsignment does
				$shipper = $shipping_method->get_meta( 'shipper' );
				$is_local_pickup = $shipping_method->get_meta( 'local_pickup' );
				
				// Debug logging
				error_log( 'Fraktvalg: Checking shipping method meta - shipper: ' . $shipper . ', local_pickup: ' . $is_local_pickup );
				
				// Check if this is a local pickup
				if ( 'local_pickup' === $shipper || $is_local_pickup ) {
					// Save local pickup meta to the order
					$order->update_meta_data( '_fraktvalg_local_pickup', '1' );
					$order->update_meta_data( '_fraktvalg_shipper', 'local_pickup' );
					
					// Save location details if available
					$location_id = $shipping_method->get_meta( 'location_id' );
					$location_name = $shipping_method->get_meta( 'location_name' );
					$location_address = $shipping_method->get_meta( 'location_address' );
					
					if ( $location_id ) {
						$order->update_meta_data( '_fraktvalg_pickup_location_id', $location_id );
					}
					if ( $location_name ) {
						$order->update_meta_data( '_fraktvalg_pickup_location_name', $location_name );
					}
					if ( $location_address ) {
						$order->update_meta_data( '_fraktvalg_pickup_location_address', $location_address );
					}
					
					$order->save();
					
					error_log( 'Fraktvalg: Saved local pickup meta to order #' . $order->get_id() . ' Location: ' . $location_name );
					break;
				}
			}
		}
	}
}
