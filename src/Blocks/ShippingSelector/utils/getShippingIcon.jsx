import {__} from '@wordpress/i18n';
import {TruckIcon, HomeIcon, BuildingStorefrontIcon} from "@heroicons/react/24/outline";

/**
 * Get the appropriate icon component based on the shipping service code or type
 *
 * @param {string} serviceCode The shipping service code
 * @param {boolean} isLocalPickup Whether this is a local pickup option
 * @returns {JSX.Element|string} The icon component or translatable string
 */
export const getShippingIcon = (serviceCode, isLocalPickup = false) => {
    // Always use store icon for local pickup
    if (isLocalPickup) {
        return <BuildingStorefrontIcon className="w-10 h-10 mr-4" style={{color: 'var(--fraktvalg-tertiary-color)'}}/>;
    }
    
    switch (serviceCode) {
        case 'Parcel':
            return <TruckIcon className="w-10 h-10 mr-4" style={{color: 'var(--fraktvalg-tertiary-color)'}}/>;
        case 'HomeDelivery':
            return <HomeIcon className="w-10 h-10 mr-4" style={{color: 'var(--fraktvalg-tertiary-color)'}}/>;
        case 'ServiceParcel':
            return <BuildingStorefrontIcon className="w-10 h-10 mr-4" style={{color: 'var(--fraktvalg-tertiary-color)'}}/>;
        default:
            return <TruckIcon className="w-10 h-10 mr-4" style={{color: 'var(--fraktvalg-tertiary-color)'}}/>;
    }
};
