<?php

namespace Fraktvalg\Fraktvalg\WooCommerce\Admin;

class ShipmentStatusColumn {

	public function __construct() {
		\add_action( 'admin_init', [ $this, 'init' ] );
	}

	public function init() {
		if ( $this->is_hpos_enabled() ) {
			\add_filter( 'woocommerce_shop_order_list_table_columns', [ $this, 'add_shipment_status_column' ] );
			\add_action( 'woocommerce_shop_order_list_table_custom_column', [ $this, 'render_shipment_status_column' ], 10, 2 );
		} else {
			\add_filter( 'manage_shop_order_posts_columns', [ $this, 'add_shipment_status_column' ] );
			\add_action( 'manage_shop_order_posts_custom_column', [ $this, 'render_shipment_status_column' ], 10, 2 );
		}
	}

	public function add_shipment_status_column( $columns ) {
		$new_columns = [];
		
		foreach ( $columns as $key => $column ) {
			$new_columns[ $key ] = $column;
			
			if ( 'order_status' === $key ) {
				$new_columns['fraktvalg_shipment_status'] = \__( 'Shipment Status', 'fraktvalg' );
			}
		}
		
		return $new_columns;
	}

	public function render_shipment_status_column( $column, $order_id ) {
		if ( 'fraktvalg_shipment_status' === $column ) {
			if ( $this->is_hpos_enabled() ) {
				$order = \wc_get_order( $order_id );
				$shipment_id = $order ? $order->get_meta( '_fraktvalg_shipment_id' ) : '';
				$is_local_pickup = $order ? $order->get_meta( '_fraktvalg_local_pickup' ) : false;
				$shipper = $order ? $order->get_meta( '_fraktvalg_shipper' ) : '';
			} else {
				$shipment_id = \get_post_meta( $order_id, '_fraktvalg_shipment_id', true );
				$is_local_pickup = \get_post_meta( $order_id, '_fraktvalg_local_pickup', true );
				$shipper = \get_post_meta( $order_id, '_fraktvalg_shipper', true );
			}
			
			// Check if this is a local pickup order
			if ( $is_local_pickup || 'local_pickup' === $shipper ) {
				echo '<mark class="order-status status-processing"><span>' . \__( 'Store Pickup', 'fraktvalg' ) . '</span></mark>';
			} elseif ( ! empty( $shipment_id ) ) {
				echo '<mark class="order-status status-completed"><span>' . \__( 'Registered', 'fraktvalg' ) . '</span></mark>';
			} else {
				echo '<mark class="order-status status-pending"><span>' . \__( 'Not Registered', 'fraktvalg' ) . '</span></mark>';
			}
		}
	}

	private function is_hpos_enabled() {
		return \class_exists( 'Automattic\WooCommerce\Utilities\OrderUtil' ) && 
			   \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
	}

}