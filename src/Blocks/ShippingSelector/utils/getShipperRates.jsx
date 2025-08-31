export function GetShipperRates( cart, shipper ) {
	let rates = [];

	cart?.shipping_rates?.forEach( ( cartPackage ) => {
		cartPackage?.shipping_rates?.forEach( ( rate ) => {
			if ( ! rate?.meta_data?.some( meta => meta.key === 'fraktvalg' ) ) {
				return;
			}

			let rateGroup = rate?.rate_id.split( ':' )[0];
			let options = rate?.meta_data.find( meta => meta.key === 'option' )?.value;

			let delivery = options?.delivery?.estimatedDate || new Date().toISOString().split('T')[0];
			
			// Check if this is local pickup
			const isLocalPickup = rate?.meta_data.find( meta => meta.key === 'local_pickup' )?.value || 
			                      rate?.meta_data.find( meta => meta.key === 'shipper' )?.value === 'local_pickup';
			
			// Get location details from metadata
			const locationName = rate?.meta_data.find( meta => meta.key === 'location_name' )?.value;
			const locationAddress = rate?.meta_data.find( meta => meta.key === 'location_address' )?.value;

			if ( rateGroup === shipper.id ) {
				// Build display name for locations
				let displayName = options?.texts?.displayName || rate?.name;
				let description = options?.texts?.description;
				
				// For local pickup locations, use location details
				if ( isLocalPickup && locationName ) {
					displayName = locationName;
					description = locationAddress || '';
				}
				
				rates.push( {
					rate_id: rate?.rate_id,
					name: displayName,
					description: description,
					price: rate?.price,
					icon: options?.delivery?.serviceCode,
					selected: rate?.selected || false,
					delivery: {
						date: delivery,
						days: isLocalPickup ? null : Math.max(1, Math.ceil((new Date(delivery) - new Date()) / (1000 * 60 * 60 * 24))),
						customText: isLocalPickup ? options?.delivery?.estimatedDays : null,
					},
					locationName: locationName,
					locationAddress: locationAddress,
					isLocalPickup: isLocalPickup,
				} );
			}
		} );
	} );

	return rates;
}
