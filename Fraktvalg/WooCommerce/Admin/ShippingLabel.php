<?php

namespace Fraktvalg\Fraktvalg\WooCommerce\Admin;

use Fraktvalg\Fraktvalg\Options;

class ShippingLabel {

	public function __construct() {
		\add_action( 'admin_init', [ $this, 'init' ] );
	}

	public function init() {
		if ( ! \is_admin() ) {
			return;
		}

		if ( ! isset( $_GET['page'] ) || 'wc-orders' !== $_GET['page'] || ! isset( $_GET['action'] ) || $_GET['action'] !== 'edit' ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- False positive report presuming the enqueue hook is handling form data.
			return;
		}

		\add_action( 'add_meta_boxes', [ $this, 'add_shipping_label_meta_box' ] );

		\add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
	}

	public function enqueue_scripts() {
		\remove_all_actions( 'admin_notices' );

		$asset = require \plugin_dir_path( FRAKTVALG_BASE_FILE ) . 'build/shipping.asset.php';

		\wp_enqueue_script( 'fraktvalg-shipping', \plugin_dir_url( FRAKTVALG_BASE_FILE ) . 'build/shipping.js', $asset['dependencies'], $asset['version'], true );
		\wp_enqueue_style( 'fraktvalg-shipping', \plugin_dir_url( FRAKTVALG_BASE_FILE ) . 'build/shipping.css', [], $asset['version'] );

		\wp_set_script_translations(
			'fraktvalg-shipping',
			'fraktvalg',
			\trailingslashit( FRAKTVALG_BASE_PATH ) . 'languages'
		);
	}

	public function add_shipping_label_meta_box() {
		\add_meta_box(
			'fraktvalg_label_print_meta',
			__( 'Fraktvalg', 'fraktvalg' ),
			[ $this, 'shipping_label_meta_box' ],
			'woocommerce_page_wc-orders',
			'side',
			'high'
		);
	}

	public function shipping_label_meta_box() {
		$order = \wc_get_order( \absint( $_GET['id'] ) );

		$required_meta_fields = [
			'_fraktvalg_shipper',
			'_fraktvalg_shipment_id',
			'_fraktvalg_shipment_meta',
		];

		$data_attrs = [];

		foreach ( $required_meta_fields as $meta_field ) {
			$data_attrs[] = sprintf(
				'data-%s="%s"',
				trim( $meta_field, '_' ),
				\esc_attr( $order->get_meta( $meta_field, true ) )
			);
		}

		$data_attrs[] = sprintf(
			'data-environment="%s"',
			\esc_attr( Options::get( 'useProduction' ) )
		);

		printf(
			'<div id="fraktvalg-label-meta-box" data-order_id="%s" %s></div>',
			$order->get_id(),
			implode( ' ', $data_attrs )
		);
	}

}
