import { execSync } from 'child_process';

const WP_ENV_BIN = './node_modules/.bin/wp-env';

export function wpCli( command: string ): string {
	try {
		return execSync(
			`${ WP_ENV_BIN } run tests-cli wp ${ command } --allow-root`,
			{ encoding: 'utf-8', stdio: [ 'pipe', 'pipe', 'pipe' ] }
		).trim();
	} catch ( error: unknown ) {
		const err = error as { stderr?: string; stdout?: string };
		throw new Error( `WP-CLI command failed: wp ${ command }\n${ err.stderr ?? err.stdout ?? '' }` );
	}
}

export function deleteOption( option: string ): void {
	try {
		wpCli( `option delete ${ option }` );
	} catch {
		// Option may not exist — that is fine.
	}
}

export function updateOption( option: string, value: string ): void {
	wpCli( `option update ${ option } "${ value }"` );
}

/**
 * Store an object / array as a PHP-serialized WordPress option.
 *
 * `updateOption` stores the value as a plain string, which makes PHP's
 * `get_option()` return a string rather than an array. Use this function
 * whenever the consuming PHP code expects an associative array.
 */
export function updateOptionPhp( option: string, value: unknown ): void {
	const json = JSON.stringify( value ).replace( /'/g, "\\'" ).replace( /\\/g, '\\\\' ).replace( /"/g, '\\"' );
	wpCli( `eval "update_option('${ option }', json_decode('${ json }', true));"` );
}
