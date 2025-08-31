<?php

namespace Fraktvalg\Fraktvalg\REST\Settings;

use Fraktvalg\Fraktvalg\Options;
use Fraktvalg\Fraktvalg\REST\Base;

class LocalPickup extends Base {

	public function __construct() {
		parent::__construct();
	}

	public function register_routes() {
		\register_rest_route(
			$this->namespace,
			'/settings/local-pickup',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => array( $this, 'permission_callback' ),
			]
		);

		\register_rest_route(
			$this->namespace,
			'/settings/local-pickup',
			[
				'methods'             => \WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_settings' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'args'                => [
					'enabled' => [
						'type'        => 'boolean',
						'required'    => false,
						'description' => __( 'Enable or disable local pickup', 'fraktvalg' ),
					],
					'locations' => [
						'type'        => 'array',
						'required'    => false,
						'description' => __( 'Array of pickup locations', 'fraktvalg' ),
						'items'       => [
							'type'       => 'object',
							'properties' => [
								'id' => [
									'type' => 'string',
								],
								'name' => [
									'type' => 'string',
								],
								'address' => [
									'type' => 'string',
								],
								'price' => [
									'type' => 'number',
								],
								'pickup_time_text' => [
									'type' => 'string',
								],
								'enabled' => [
									'type' => 'boolean',
								],
							],
						],
					],
					'free_threshold' => [
						'type'        => ['number', 'null'],
						'required'    => false,
						'description' => __( 'Minimum order amount for free pickup', 'fraktvalg' ),
					],
				],
			]
		);
	}

	public function get_settings() {
		$local_pickup_settings = Options::get( 'local_pickup' );

		return new \WP_REST_Response( $local_pickup_settings );
	}

	public function update_settings( \WP_REST_Request $request ) {
		$current_options = Options::get();
		
		// Update local pickup settings
		if ( $request->has_param( 'enabled' ) ) {
			$current_options['local_pickup']['enabled'] = $request->get_param( 'enabled' );
		}
		
		if ( $request->has_param( 'locations' ) ) {
			$locations = $request->get_param( 'locations' );
			$sanitized_locations = [];
			
			foreach ( $locations as $index => $location ) {
				$sanitized_locations[] = [
					'id' => isset( $location['id'] ) ? sanitize_text_field( $location['id'] ) : 'location_' . $index,
					'name' => isset( $location['name'] ) ? sanitize_text_field( $location['name'] ) : '',
					'address' => isset( $location['address'] ) ? sanitize_text_field( $location['address'] ) : '',
					'price' => isset( $location['price'] ) ? floatval( $location['price'] ) : 0,
					'pickup_time_text' => isset( $location['pickup_time_text'] ) ? sanitize_text_field( $location['pickup_time_text'] ) : 'Usually ready within 1 hour',
					'enabled' => isset( $location['enabled'] ) ? (bool) $location['enabled'] : true,
				];
			}
			
			$current_options['local_pickup']['locations'] = $sanitized_locations;
		}
		
		if ( $request->has_param( 'free_threshold' ) ) {
			$threshold = $request->get_param( 'free_threshold' );
			$current_options['local_pickup']['free_threshold'] = $threshold !== null ? floatval( $threshold ) : null;
		}

		// Save the updated options
		$result = Options::bulk_set( $current_options );

		if ( ! $result ) {
			return new \WP_Error( 'update_failed', __( 'Failed to update local pickup settings', 'fraktvalg' ), [ 'status' => 500 ] );
		}

		// Clear shipping cache to reflect changes immediately
		Options::clear_cache_timestamp();

		return new \WP_REST_Response( [
			'success' => true,
			'settings' => $current_options['local_pickup'],
		] );
	}
}