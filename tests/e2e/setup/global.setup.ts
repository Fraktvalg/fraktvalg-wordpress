import { test as setup } from '@playwright/test';
import { updateOption, wpCli } from '../utils/wp-cli';

setup( 'global setup', async() => {
	// Run any pending WordPress database upgrades so wp-admin is accessible.
	wpCli( 'core update-db' );

	// Check if this is running via GitHub and has a different plugin slug for its CWD.
	const repoName = process.env.GITHUB_REPOSITORY?.split( '/' ).pop() ?? 'fraktvalg';

	// Activate WooCommerce and our plugin.
	wpCli( 'plugin activate woocommerce ${ repoName }' );

	// Prevent WordPress from showing the admin email verification interstitial
	// during tests by setting the lifespan to 10 years from now.
	const tenYearsFromNow = String( Math.floor( Date.now() / 1000 ) + 60 * 60 * 24 * 365 * 10 );
	updateOption( 'admin_email_lifespan', tenYearsFromNow );
});

