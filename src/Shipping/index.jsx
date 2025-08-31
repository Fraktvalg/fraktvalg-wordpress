import { useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import Label from './Label';
import Booking from './Booking';
import Notification from '../Components/Notifications';

import './shipping.pcss';

export default function Shipping() {
    const [ activeView, setActiveView ] = useState( 'booking' );
    const [ dataAttributes, setDataAttributes ] = useState({});

    useEffect(() => {
        const element = document.querySelector('#fraktvalg-label-meta-box');
        if (element) {
            const attributes = {};
            
            // Get all data attributes and strip the 'data-' prefix
            Array.from(element.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    const key = attr.name.replace('data-', '');
                    attributes[key] = attr.value;
                }
            });
            
            setDataAttributes(attributes);

            // Set initial view based on shipment ID or local pickup
            const shipmentId = attributes['fraktvalg_shipment_id'];
            const isLocalPickup = attributes['fraktvalg_shipper'] === 'local_pickup' || attributes['fraktvalg_local_pickup'] === '1';
            
            if (shipmentId && shipmentId.trim() !== '') {
                setActiveView('label');
            } else if (isLocalPickup) {
                // Keep booking view for local pickup to show the message
                setActiveView('booking');
            }
        }
    }, []);

//    const isProduction = dataAttributes['environment'] === 'production';
    const isProduction = true;

    return (
        <div className="fraktvalg-shipping">
            {!isProduction ? (
                <div className="grid grid-cols-1 gap-2">
                    <Notification type="notice">
                        {__('You are currently in development mode. This means no valid consignment will be generated, and you may view the test shipping label.', 'fraktvalg')}
                    </Notification>

                    <Label orderId={dataAttributes['order_id']} />
                    <Booking 
                        setActiveView={setActiveView} 
                        dataAttributes={dataAttributes}
                        setDataAttributes={setDataAttributes}
                    />
                </div>
            ) : (
                activeView === 'label' ? (
                    <Label orderId={dataAttributes['order_id']} />
                ) : (
                    <Booking 
                        setActiveView={setActiveView} 
                        dataAttributes={dataAttributes}
                        setDataAttributes={setDataAttributes}
                    />
                )
            )}
        </div>
    );
}