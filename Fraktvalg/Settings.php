<?php

namespace Fraktvalg\Fraktvalg;

use Fraktvalg\Fraktvalg\REST\Settings\ApiKey;
use Fraktvalg\Fraktvalg\REST\Settings\OptionalSettings;
use Fraktvalg\Fraktvalg\REST\Settings\Providers;
use Fraktvalg\Fraktvalg\REST\Settings\ProviderShippingOptions;

class Settings {

	public function __construct() {
		new ApiKey();
		new Providers();
		new ProviderShippingOptions();
		new OptionalSettings();

		\add_action( 'admin_notices', [ $this, 'remove_admin_notices_on_onboarding' ], 1 );
		\add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_scripts' ] );

		\add_action( 'admin_menu', [ $this, 'add_menu_item' ] );

		\add_action( 'admin_print_styles', [ $this, 'inject_admin_css' ] );

		\add_action( 'admin_bar_menu', [ $this, 'admin_bar_status' ] );
	}

	public function admin_bar_status( $wp_admin_bar ) {
		if ( ! is_user_logged_in() || ! is_admin_bar_showing() ) {
			return;
		}

		$environment = ( Options::get( 'useProduction' ) ? 'production' : 'development' );
		$env_color = '#DC2626';
		$env_label = __( 'Fraktvalg', 'fraktvalg' );
		$env_hint = __( 'Fraktvalg is connected to your the test environment, no shipping orders will be fulfilled', 'fraktvalg' );
		if ( 'production' === $environment ) {
			$env_color = '#4D8965';
			$env_hint = __( 'Fraktvalg is connected to your live environment, and shipments can be registered', 'fraktvalg' );
		}

		// The visible content: icon + label text.
		$title = sprintf(
			'<span id="fraktvalg-env-indicator-block" style="display: inline-grid; grid-auto-flow: column; align-items: center; background: %s; padding: 0 8px; color: #fff;">%s</span>',
			\esc_attr( $env_color ),
			\esc_html( $env_label )
		);

		$wp_admin_bar->add_node( [
			'id'     => 'fraktvalg-env-indicator',
			'parent' => 'top-secondary',
			'title'  => $title,
			'href'   => \admin_url( 'admin.php?page=fraktvalg' ),
			'meta'   => [
				'title' => $env_hint,
			],
		] );
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
