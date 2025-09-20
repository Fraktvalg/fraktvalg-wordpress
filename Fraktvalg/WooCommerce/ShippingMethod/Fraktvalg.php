<?php

namespace Fraktvalg\Fraktvalg\WooCommerce\ShippingMethod;

use Fraktvalg\Fraktvalg\Api;
use Fraktvalg\Fraktvalg\Options;

class Fraktvalg extends \WC_Shipping_Method {

	/**
	 * Stores the cheapest shipping option ID
	 *
	 * @var string|null
	 */
	private $cheapest_shipping_id = null;

	/**
	 * Stores the cheapest shipping price
	 *
	 * @var float|null
	 */
	private $cheapest_shipping_price = null;

	public function __construct( $instance_id = 0 ) {
		$this->id = 'fraktvalg';
		$this->instance_id = absint( $instance_id );
		$this->method_title = __( 'Fraktvalg', 'fraktvalg' );
		$this->method_description = __( 'Fraktvalg', 'fraktvalg' );
		$this->supports = [
			'shipping-settings',
			'shipping-methods-in-blocks',
		];
	}

	public function calculate_shipping( $package = [] ) {
		// Before trying to calculate shipping, ensure we have a valid shipping address
		if ( empty( $package['destination']['country'] ) || empty( $package['destination']['postcode'] ) ) {
			return;
		}

		// Make sure there are products in the cart before attempting to ask for pricing.
		if ( empty( $package ) ) {
			return;
		}

		$default_dimensions = Options::get( 'default_dimensions' );

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

		foreach ( $package['contents'] as $data ) {
			$product = $data['data'];
			if ( $data['quantity'] < 1 || ! $data['data']->needs_shipping() ) {
				continue;
			}

			// Get the weight and convert to grams
			$product_weight = $product->get_weight() ?: $default_dimensions['weight'];
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
			$product_length = $product->get_length() ?: $default_dimensions['length'];
			$product_width = $product->get_width() ?: $default_dimensions['width'];
			$product_height = $product->get_height() ?: $default_dimensions['height'];
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
				$total_weight += ( (float) $product_weight * $data['quantity'] );
			}
			if ( $product_length && $product_width && $product_height ) {
				$total_length = max( $total_length, (float) $product_length );
				$total_width = max( $total_width, (float) $product_width );
				$total_height = max( $total_height, (float) $product_height );

				$total_volume += ( ( (float) $product_length * (float) $product_width * (float) $product_height ) * $data['quantity'] );
			}
		}

		// Ensure minimum weight of 1g instead of 1kg
		if ( $total_weight < 1 ) {
			$total_weight = 1;
		}

		$shipping_options_array = [
			'sender' => [
				'country'    => \get_option( 'woocommerce_default_country' ),
				'postalCode' => \get_option( 'woocommerce_store_postcode' ),
				'city'       => \get_option( 'woocommerce_store_city' ),
				'address'    => \get_option( 'woocommerce_store_address' ),
			],
			'recipient' => [
				'country'    => $package['destination']['country'] ?? '',
				'postalCode' => $package['destination']['postcode'] ?? '',
				'city'       => $package['destination']['city'] ?? '',
				'address'    => $package['destination']['address'] ?? '',
			],
			'packages' => [
				[
					'packageWeight' => ceil( $total_weight )
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

		$cache_key = 'fraktvalg_shipping_options_' . md5( \json_encode( $shipping_options_array ) . date( 'Y-m-d' ) . Options::get_cache_timestamp() );

		$shippers = \get_transient( $cache_key );
		if ( false === $shippers ) {
			$shippers = Api::post(
				'/shipment/offers',
				$shipping_options_array
			);

			// Only cache successful API requests.
			if ( ! \is_wp_error( $shippers ) ) {
				\set_transient( $cache_key, $shippers, DAY_IN_SECONDS );
			}
		}

		$settings        = Options::get();
		$shippingOptions = [];
		$priorityProvider = \get_option( "fraktvalg['priorityProvider']", [ 'providerId' => '', 'discount' => 0, 'discountType' => 'percent' ] );

		if ( ! \is_wp_error( $shippers ) && 200 === $shippers['response']['code'] ) {
			$shippingOptions = \json_decode( $shippers['body'] );
			if ( ! is_array( $shippingOptions ) && ! is_object( $shippingOptions ) ) {
				$shippingOptions = [];
			}
		}

		// Check if we're using a block theme
		$is_block_theme = function_exists('wp_is_block_theme') && wp_is_block_theme();

		// Reset cheapest shipping variables
		$this->cheapest_shipping_id = null;
		$this->cheapest_shipping_price = null;

		$all_new_shipping_rates = [];

		if ( ! empty( $shippingOptions) ) {
			// Find the cheapest shipping method from non-priority providers
			$cheapest_price = $this->get_cheapest_shipping_price( $shippingOptions, $priorityProvider['providerId'], $settings );

			// First, add the priority provider if it exists
			if ( ! empty( $priorityProvider['providerId'] ) && isset( $shippingOptions->{$priorityProvider['providerId']} ) ) {
				// Find the cheapest priority provider option
				$cheapest_priority_price = null;
				$cheapest_priority_option = null;
				$cheapest_priority_count = null;

				foreach ( $shippingOptions->{$priorityProvider['providerId']} as $count => $option ) {
					$price = $option->price->withVAT;

					// Apply added cost from settings
					if ( isset( $settings['freight']['addedCost'] ) ) {
						if ( ! empty( $settings['freight']['addedCostType'] ) && 'percent' === $settings['freight']['addedCostType'] ) {
							$price += $price * ( $settings['freight']['addedCost'] / 100 );
						} else {
							$price += $settings['freight']['addedCost'];
						}
					}

					if ( null === $cheapest_priority_price || $price < $cheapest_priority_price ) {
						$cheapest_priority_price = $price;
						$cheapest_priority_option = $option;
						$cheapest_priority_count = $count;
					}
				}

				// Apply discount to the cheapest priority provider option if needed
				if ( ! empty( $priorityProvider['discount'] ) && $cheapest_priority_price >= $cheapest_price['price'] && $priorityProvider['providerId'] !== $cheapest_price['provider'] ) {
					// Apply the configured discount type and amount
					if ( 'percent' === $priorityProvider['discountType'] ) {
						// Apply the configured percentage discount
						$cheapest_priority_price = $cheapest_price['price'] * ( 1 - ( $priorityProvider['discount'] / 100 ) );
					} else {
						// Apply the configured fixed discount
						$cheapest_priority_price = $cheapest_price['price'] - $priorityProvider['discount'];
					}
				}

				// Now add all priority provider options with appropriate pricing
				foreach ( $shippingOptions->{$priorityProvider['providerId']} as $count => $option ) {
					$shipping_id = $priorityProvider['providerId'] . ':' . $count;

					$price = $option->price->withVAT;

					// If this is the cheapest priority option, use the discounted price
					if ( $count === $cheapest_priority_count ) {
						$price = $cheapest_priority_price;
					}
					// For other priority options, apply the same discount percentage if using percentage discount
					elseif ( ! empty( $priorityProvider['discount'] ) && 'percent' === $priorityProvider['discountType'] ) {
						$price = $price * ( 1 - ( $priorityProvider['discount'] / 100 ) );
					}

					// Never allow a price to dip below 0, so check this in case the discount is configured too high.
					if ( $price < 0 ) {
						$price = 0;
					}

					// Apply added cost from settings
					if ( isset( $settings['freight']['addedCost'] ) ) {
						if ( ! empty( $settings['freight']['addedCostType'] ) && 'percent' === $settings['freight']['addedCostType'] ) {
							$price += $price * ( $settings['freight']['addedCost'] / 100 );
						} else {
							$price += $settings['freight']['addedCost'];
						}
					}

					// Always round up the price to the next full number.
					$price = ceil( $price );

					// If a high discount is applied, never go below 0, and re-apply the added shipping cost.


					if ( isset( $option->price->hasFreeShipping ) && $option->price->hasFreeShipping ) {
						if ( $package['contents_cost'] >= $option->price->freeShippingThreshold ) {
							$price = 0;
						}
					}

					// Set the label based on theme type
					$label = sprintf(
						// translators: 1: Shipper name, 2: Shipping option name.
						\__( '%1$s with %2$s', 'fraktvalg' ),
						$option->texts->shipperName,
						( $option->texts->displayName ?: $option->texts->originalName )
					);

					if ( isset( $option->texts->description ) && ! empty( $option->texts->description ) ) {
						$label .= ' (' . $option->texts->description . ')';
					}

					$all_new_shipping_rates[] = [
						'id' => $shipping_id,
						'label' => $label,
						'price' => $price,
						'package' => $package,
						'meta_data' => [
							'fraktvalg' => true,
							'shipper'   => $priorityProvider['providerId'],
							'option'    => $option,
							'priority'  => true,
						],
					];

					// Track the cheapest priority shipping option
					if ( null === $this->cheapest_shipping_price || $price < $this->cheapest_shipping_price ) {
						$this->cheapest_shipping_price = $price;
						$this->cheapest_shipping_id = $shipping_id;
					}
				}
			}

			// Then add all other providers
			foreach ( $shippingOptions as $shipper => $options ) {
				// Skip the priority provider as it's already been added
				if ( $shipper === $priorityProvider['providerId'] ) {
					continue;
				}

				foreach ( $options as $count => $option ) {
					$shipping_id = $shipper . ':' . $count;

					$price = $option->price->withVAT;
					if ( isset( $settings['freight']['addedCost'] ) ) {
						if ( ! empty( $settings['freight']['addedCostType'] ) && 'percent' === $settings['freight']['addedCostType'] ) {
							$price += $price * ( $settings['freight']['addedCost'] / 100 );
						} else {
							$price += $settings['freight']['addedCost'];
						}
					}
					// Set the label based on theme type
					$label = ( $option->texts->displayName ?: $option->texts->originalName );
					if ( ! $is_block_theme && isset( $option->texts->shipperName ) ) {
						$label = sprintf(
						// translators: 1: Shipper name, 2: Shipping option name.
							\__( '%1$s with %2$s', 'fraktvalg' ),
							$option->texts->shipperName,
							$label
						);

						if ( isset( $option->texts->description ) && ! empty( $option->texts->description ) ) {
							$label .= ' (' . $option->texts->description . ')';
						}
					}

					if ( isset( $option->price->hasFreeShipping ) && $option->price->hasFreeShipping ) {
						if ( $package['contents_cost'] >= $option->price->freeShippingThreshold ) {
							$price = 0;
						}
					}

					$all_new_shipping_rates[] = [
						'id' => $shipping_id,
						'label' => $label,
						'price' => $price,
						'package' => $package,
						'meta_data' => [
							'fraktvalg' => true,
							'shipper'   => $shipper,
							'option'    => $option,
						],
					];

					// Track the cheapest non-priority shipping option
					// Only update if no priority provider exists or if this is cheaper than the cheapest priority option
					if ( empty( $priorityProvider['providerId'] ) || null === $this->cheapest_shipping_price || $price < $this->cheapest_shipping_price ) {
						$this->cheapest_shipping_price = $price;
						$this->cheapest_shipping_id = $shipping_id;
					}
				}
			}
		} else {
			// If an error happened when fetching shipping providers, or no options exist, use the fallback shipping option.
			if ( ! empty( $settings['freight'] ) ) {
				if ( 'fixed' === $settings['freight']['custom']['type'] ) {
					$price = $settings['freight']['custom']['price'];
				} else {
					$price = \WC()->cart->get_cart_contents_total() * ( $settings['freight']['custom']['price'] / 100 );
				}

				if ( isset( $settings['freight']['addedCost'] ) ) {
					$price += $settings['freight']['addedCost'];
				}

				$all_new_shipping_rates[] = [
					'id' => 'fallback',
					'label' => $settings['freight']['custom']['name'],
					'price' => $price,
					'package' => $package,
					'meta_data' => [
						'fraktvalg' => true,
						'shipper'   => 'fallback',
						'option'    => array_merge(
							[
								'delivery' => [
									'estimatedDays' => '3-5',
								],
							],
							$settings['freight']['custom']
						),
					],
				];

				// Set fallback as cheapest option if no other options exist
				$this->cheapest_shipping_price = $price;
				$this->cheapest_shipping_id = 'fallback';
			}
		}

		usort( $all_new_shipping_rates, function( $a, $b ) {
			return $a['price'] <=> $b['price'];
		} );

		foreach ( $all_new_shipping_rates as $new_shipping_rate ) {
			$this->add_shipping_rate(
				$new_shipping_rate['id'],
				$new_shipping_rate['label'],
				$new_shipping_rate['price'],
				$new_shipping_rate['package'],
				$new_shipping_rate['meta_data']
			);
		}
	}

	/**
	 * Add a shipping rate to WooCommerce
	 *
	 * @param string $shipping_id The shipping ID
	 * @param string $label The shipping label
	 * @param float  $price The shipping price
	 * @param array  $package The package data
	 * @param array  $meta_data Additional meta data for the shipping rate
	 * @return void
	 */
	private function add_shipping_rate( $shipping_id, $label, $price, $package, $meta_data ) {
		// Use wp_kses_post to allow safe HTML in the label while preventing XSS attacks
		// This will prevent React from escaping the HTML entities
		$safe_label = wp_kses_post( $label );

		$this->add_rate( [
			'id'        => $shipping_id,
			'label'     => $safe_label,
			'cost'      => $price,
			'taxes'     => false,
			'package'   => $package,
			'meta_data' => $meta_data,
		] );
	}

	/**
	 * Find the cheapest shipping price from non-priority providers
	 *
	 * @param object $shipping_options The shipping options returned from the API
	 * @param string $priority_provider_id The ID of the priority provider to exclude
	 * @param array  $settings The plugin settings
	 * @return array The cheapest shipping price found
	 */
	private function get_cheapest_shipping_price( $shipping_options, $priority_provider_id, $settings ) {
		$cheapest_price = array(
			'price' => null,
			'provider' => null,
		);
		$has_other_providers = false;

		// Loop through all providers to find the cheapest price
		foreach ( $shipping_options as $shipper => $options ) {
			// Skip the priority provider
			if ( $shipper === $priority_provider_id ) {
				continue;
			}

			$has_other_providers = true;

			foreach ( $options as $option ) {
				$price = $option->price->withVAT;

				// Apply added cost from settings
				if ( isset( $settings['freight']['addedCost'] ) ) {
					if ( ! empty( $settings['freight']['addedCostType'] ) && 'percent' === $settings['freight']['addedCostType'] ) {
						$price += $price * ( $settings['freight']['addedCost'] / 100 );
					} else {
						$price += $settings['freight']['addedCost'];
					}
				}

				if ( null === $cheapest_price['price'] || $price < $cheapest_price['price'] ) {
					$cheapest_price['price'] = $price;
					$cheapest_price['provider'] = $shipper;
				}
			}
		}

		// If no other providers exist, set cheapest price to 0 to avoid applying discount
		if ( ! $has_other_providers ) {
			$cheapest_price['price'] = 0;
		}

		return $cheapest_price;
	}

}
