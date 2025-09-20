import {__} from "@wordpress/i18n";

export function GetShipperRates( cart, shipper ) {
	let rates = [];
	let otherShipperOptions = {};

	cart?.shipping_rates?.forEach( ( cartPackage ) => {
		cartPackage?.shipping_rates?.forEach( ( rate ) => {
			otherShipperOptions = {
				delivery: {
					bookingInstructions: {},
					estimatedDays: '1-2'
				},
				price: {
					VAT: 0,
					currency: rate?.currency_code || 'NOK',
					freeShippingThreshold: 0,
					hasFreeShipping: false,
					withVAT: rate?.price,
					withoutVAT: rate?.price,
				},
				texts: {
					displayName: rate?.name || 'Unlabeled shipping method',
					description: rate?.description || '',
					help: '',
					logo: {
						'name': __( 'other providers', 'fraktvalg' ),
						'url': ''
					},
					'shipperName': __( 'other providers', 'fraktvalg' ),
				}
			}

			let rateGroup = rate?.rate_id.split( ':' )[0];
			let options = rate?.meta_data.find( meta => meta.key === 'option' )?.value;

			if ( ! rate?.meta_data?.some( meta => meta.key === 'fraktvalg' ) ) {
				rateGroup = 'other';
			}

			let delivery = options?.delivery?.estimatedDate || new Date().toISOString().split('T')[0];

			if ( rateGroup === shipper.id ) {
				rates.push( {
					rate_id: rate?.rate_id,
					name: options?.texts?.displayName || rate?.name,
					description: options?.texts?.description,
					price: rate?.price,
					icon: options?.delivery?.serviceCode,
					selected: rate?.selected || false,
					delivery: {
						date: delivery,
						days: Math.max(1, Math.ceil((new Date(delivery) - new Date()) / (1000 * 60 * 60 * 24))),
					}
				} );
			}
		} );
	} );

	return rates;
}
