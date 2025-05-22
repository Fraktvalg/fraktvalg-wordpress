<?php

namespace Fraktvalg\Fraktvalg;

class Options {

	/**
	 * Retrieve one, or all, options for the plugin.
	 *
	 * @param string $option Optional. The option value to retrieve the value for.
	 *
	 * @return array|mixed
	 */
	public static function get( string $option = '' ) {
		$default_options = [
			'freight' => [
				'addedCost'     => 0,
				'addedCostType' => 'fixed',
				'undersell'     => 0,
				'custom'        => [
					'name'  => '',
					'price' => 0,
					'type'  => 'fixed',
				],
			],
			'useProduction' => wp_get_environment_type() === 'production',
			'names'   => [],
			'default_dimensions' => [
				'length' => null,
				'width' => null,
				'height' => null,
				'weight' => null,
			],
		];

		$options = \get_option( 'fraktvalg_options', [] );

		$options = \array_replace_recursive( $default_options, $options );

		if ( $option ) {
			$keys = explode( '.', $option );
			$value = $options;

			foreach ( $keys as $key ) {
				if ( ! isset( $value[ $key ] ) ) {
					return null;
				}
				$value = $value[ $key ];
			}

			return $value;
		}

		return $options;
	}

	/**
	 * Set an individual option value.
	 *
	 * @param string $option The option key to set.
	 * @param mixed $value The value to set the option to.
	 *
	 * @return bool If the options entry was updated or not.
	 */
	public static function set( string $option, $value ) : bool {
		$options = self::get();

		$options[ $option ] = $value;

		return \update_option( 'fraktvalg_options', $options );
	}

	/**
	 * Bulk update all option entries
	 *
	 * @param array $options An array of the options to update.
	 *
	 * @return bool If the options entry was updated or not.
	 */
	public static function bulk_set( array $options ) : bool {
		$default_options = self::get();

		$options = \array_merge( $default_options, $options );

		return \update_option( 'fraktvalg_options', $options );
	}

}
