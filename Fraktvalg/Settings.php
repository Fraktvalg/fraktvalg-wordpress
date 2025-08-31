<?php

namespace Fraktvalg\Fraktvalg;

use Fraktvalg\Fraktvalg\REST\Settings\ApiKey;
use Fraktvalg\Fraktvalg\REST\Settings\LocalPickup;
use Fraktvalg\Fraktvalg\REST\Settings\OptionalSettings;
use Fraktvalg\Fraktvalg\REST\Settings\Providers;
use Fraktvalg\Fraktvalg\REST\Settings\ProviderShippingOptions;

class Settings {

	public function __construct() {
		new ApiKey();
		new Providers();
		new ProviderShippingOptions();
		new OptionalSettings();
		new LocalPickup();

		\add_action( 'admin_notices', [ $this, 'remove_admin_notices_on_onboarding' ], 1 );
		\add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_scripts' ] );

		\add_action( 'admin_menu', [ $this, 'add_menu_item' ] );

		\add_action( 'admin_print_styles', [ $this, 'inject_admin_css' ] );
	}

	public function inject_admin_css() {
		if ( ! isset( $_GET['page'] ) || 'fraktvalg' !== $_GET['page'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Nonce verification is not needed as we are just comparing a query argument value.
			return;
		}

		ob_start();
		?>
		<style>
			#wpcontent {
				padding-left: 0 !important;
			}
		</style>
		<?php
		echo ob_get_clean(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Outputs hardcoded CSS markup without user input that needs sanitizing.
	}

	public function add_menu_item() {
		\add_submenu_page(
			'woocommerce',
			\esc_html_x( 'Fraktvalg settings', 'Settings page title', 'fraktvalg' ),
			\esc_html_x( 'Fraktvalg settings', 'Settings page menu title', 'fraktvalg' ),
			'manage_options',
			'fraktvalg',
			[ $this, 'custom_admin_page_content' ],
			9999
		);
	}

	public function custom_admin_page_content() {
		if ( ! \current_user_can( 'manage_options' ) ) {
			return;
		}

		echo '<div id="fraktvalg-settings"></div>';
	}

	public function remove_admin_notices_on_onboarding() {
		if ( ! isset( $_GET['page'] ) || 'fraktvalg' !== $_GET['page'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Nonce verification is not needed as we are just comparing a query argument value.
			return;
		}

		\remove_all_actions( 'admin_notices' );
	}

	public function enqueue_scripts() {
		if ( ! isset( $_GET['page'] ) || 'fraktvalg' !== $_GET['page'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Nonce verification is not needed as we are just comparing a query argument value.
			return;
		}

		\remove_all_actions( 'admin_notices' );

		$asset = require \plugin_dir_path( FRAKTVALG_BASE_FILE ) . 'build/fraktvalg.asset.php';

		\wp_enqueue_script( 'fraktvalg', \plugin_dir_url( FRAKTVALG_BASE_FILE ) . 'build/fraktvalg.js', $asset['dependencies'], $asset['version'], true );
		\wp_enqueue_style( 'fraktvalg', \plugin_dir_url( FRAKTVALG_BASE_FILE ) . 'build/fraktvalg.css', [], $asset['version'] );

		\wp_set_script_translations(
			'fraktvalg',
			'fraktvalg',
			\trailingslashit( FRAKTVALG_BASE_PATH ) . 'languages'
		);
	}

}
