import { __ } from '@wordpress/i18n';

export function GetUniqueShippers( cart ) {
	let shippers = [];
	let rateOptions = {},
		rateGroup = null,
		rateGroupDetails = {},
		existingShipper = null;
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

			rateOptions = rate?.meta_data?.find( meta => meta.key === 'option' )?.value || otherShipperOptions;

			rateGroup = rate?.rate_id.split( ':' )[0];

			if ( ! rate?.meta_data?.some( meta => meta.key === 'fraktvalg' ) ) {
				rateGroup = 'other';
			}

			if ( ! shippers.some( shipper => shipper.id === rateGroup ) ) {
				rateGroupDetails = rate?.meta_data.find( meta => meta.key === 'option' )?.value || otherShipperOptions;
				console.log( 'Making new group: ', rateGroup, rateGroupDetails );

				shippers.push( {
					id: rateGroup,
					details: {
						label: rateOptions?.texts?.shipperName,
						quickestShippingTime: __( '2 business days', 'fraktvalg' ),
						LowestPrice: rate.price,
					},
					shippingOptions: [],
					...rateGroupDetails,
				} );
			} else {
				existingShipper = shippers.find(shipper => shipper.id === rateGroup);

				if (existingShipper && rate.price < existingShipper.details.LowestPrice) {
					existingShipper.details.LowestPrice = rate.price;
				}
			}
		} );
	} );

	// Ensure 'other' shipper is last in the array
	shippers = [
		...shippers.filter(shipper => shipper.id !== 'other'),
		...shippers.filter(shipper => shipper.id === 'other')
	];

	console.log(shippers);

	return shippers;
}
