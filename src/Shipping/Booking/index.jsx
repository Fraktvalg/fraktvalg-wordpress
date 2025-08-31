import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { useState } from 'react';
import Notification from '../../Components/Notifications';
import { InformationCircleIcon } from '@heroicons/react/24/solid';

export default function Booking({ setActiveView, dataAttributes, setDataAttributes }) {
    const [error, setError] = useState(null);
    const [errorCount, setErrorCount] = useState(0);

    const createConsignment = () => {
        // Clear any existing error when trying again
        setError(null);

        apiFetch({
            path: '/fraktvalg/v1/woocommerce/create-consignment',
            method: 'POST',
            data: {
                order_id: dataAttributes.order_id
            }
        })
        .then(response => {
            // Reset error count on success
            setErrorCount(0);
            
            // Check if this is a local pickup order
            if (response.local_pickup) {
                // Update data attributes to indicate local pickup
                setDataAttributes({
                    ...dataAttributes,
                    'fraktvalg_shipper': 'local_pickup',
                    'fraktvalg_local_pickup': true
                });
                // Don't switch to label view for local pickup
                return;
            }
            
            // Update data attributes with new shipment ID for regular shipments
            setDataAttributes({
                ...dataAttributes,
                'fraktvalg_shipment_id': response.shipment_id
            });
            // Switch to label view
            setActiveView('label');
        })
        .catch(error => {
            setErrorCount(prev => prev + 1);
            setError(
                error.error 
                    ? `${error.error} ${__('Please try again.', 'fraktvalg')}`
                    : __('Failed to create consignment. Please try again.', 'fraktvalg')
            );
        });
    }

    // Check if this is a local pickup order
    const isLocalPickup = dataAttributes['fraktvalg_shipper'] === 'local_pickup' || 
                          dataAttributes['fraktvalg_local_pickup'] === 'true' || 
                          dataAttributes['fraktvalg_local_pickup'] === '1' ||
                          dataAttributes['fraktvalg_local_pickup'] === true ||
                          dataAttributes['fraktvalg_local_pickup'] === 1;

    if (isLocalPickup) {
        // Get location details from data attributes
        const locationName = dataAttributes['fraktvalg_pickup_location_name'] || '';
        const locationAddress = dataAttributes['fraktvalg_pickup_location_address'] || '';
        
        return (
            <div className="p-4">
                <h3 className="text-base font-semibold mb-3">
                    {__('Local Store Pickup', 'fraktvalg')}
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                    {__('This is a local pickup order. Do not ship this order.', 'fraktvalg')}
                </p>
                
                {(locationName || locationAddress) && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                            {__('Pickup Location:', 'fraktvalg')}
                        </p>
                        {locationName && (
                            <p className="text-sm text-gray-600">
                                {locationName}
                            </p>
                        )}
                        {locationAddress && (
                            <p className="text-sm text-gray-600">
                                {locationAddress}
                            </p>
                        )}
                    </div>
                )}
                
                {!locationName && !locationAddress && (
                    <p className="text-sm text-gray-600">
                        {__('The customer will pick up the order at your store location.', 'fraktvalg')}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="space-y-2">
                    <Notification type="error">{error}</Notification>
                    {errorCount >= 2 && (
                        <p className="text-sm text-gray-600">
                            <InformationCircleIcon className="w-4 h-4 inline-block mr-1" />
                            {__('If this error persists, you may need to generate this consignment manually.', 'fraktvalg')}
                        </p>
                    )}
                </div>
            )}
            <button
                type="button"
                className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded w-full"
                onClick={createConsignment}
            >
                { __( 'Create consignment booking', 'fraktvalg' ) }
            </button>
        </div>
    );
} 