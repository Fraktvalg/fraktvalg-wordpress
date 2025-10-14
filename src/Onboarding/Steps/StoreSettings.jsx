import React, { useState, useEffect } from "react";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import Button from "../../FormElements/Button";
import InputText from "../../FormElements/InputText";
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import ExpandableSection from "../../Components/ExpandableSection";

export default function StoreSettings({ nextStep }) {
	const [ isLoading, setIsLoading ] = useState( true );
	const [ storeStatus, setStoreStatus ] = useState( {} );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ sectionSaveStatus, setSectionSaveStatus ] = useState({
		address: false
	});

	useEffect( () => {
		fetchStoreStatus();
	}, [] );

	useEffect( () => {
		// Ensure country is set to "NO" if not already set
		if (storeStatus.address && storeStatus.address.fields && !storeStatus.address.fields.country) {
			setStoreStatus(prev => ({
				...prev,
				address: {
					...prev.address,
					fields: {
						...prev.address.fields,
						country: 'NO'
					}
				}
			}));
		}
	}, [ storeStatus ] );

	const fetchStoreStatus = async () => {
		try {
			const response = await apiFetch( {
				path: '/fraktvalg/v1/onboarding/store-status',
				method: 'GET',
			} );

			setStoreStatus( response );
			setIsLoading( false );
		} catch ( error ) {
			console.error( 'Error fetching store status:', error );
			setIsLoading( false );
		}
	};

	const handleAddressChange = ( field, value ) => {
		// Update the local state for any address field
		setStoreStatus( prev => ({
			...prev,
			address: {
				...prev.address,
				fields: {
					...prev.address.fields,
					[field]: value
				}
			}
		}));
	};

	const saveAddressSettings = async () => {
		setIsSaving( true );
		try {
			// Get the current address fields
			const addressFields = storeStatus.address?.fields || {};

			// Make API call to update all address fields at once
			await apiFetch( {
				path: '/fraktvalg/v1/onboarding/store-address',
				method: 'POST',
				data: {
					address: addressFields.address || '',
					postcode: addressFields.postcode || '',
					city: addressFields.city || '',
					country: addressFields.country || 'NO'
				}
			} );

			// Update local state to mark address as complete
			setStoreStatus( prev => ({
				...prev,
				address: {
					...prev.address,
					complete: true
				}
			}));

			// Show success message for this section
			setSectionSaveStatus(prev => ({
				...prev,
				address: true
			}));

			// Reset the success message after 3 seconds
			setTimeout(() => {
				setSectionSaveStatus(prev => ({
					...prev,
					address: false
				}));
			}, 3000);

		} catch ( error ) {
			console.error( 'Error updating store address:', error );
		} finally {
			setIsSaving( false );
		}
	};

	const handleDimensionChange = ( field, value ) => {
		// Update the local state for any dimension field
		setStoreStatus( prev => ({
			...prev,
			default_dimensions: {
				...prev.default_dimensions,
				[field]: value
			}
		}));
	};

	const saveDefaultDimensions = async () => {
		setIsSaving( true );
		try {
			// Make API call to update default dimensions
			await apiFetch( {
				path: '/fraktvalg/v1/onboarding/store-default-dimensions',
				method: 'POST',
				data: {
					length: storeStatus.default_dimensions?.length || '',
					width: storeStatus.default_dimensions?.width || '',
					height: storeStatus.default_dimensions?.height || '',
					weight: storeStatus.default_dimensions?.weight || ''
				}
			} );

			// Update local state to mark dimensions as complete
			setStoreStatus( prev => ({
				...prev,
				default_dimensions: {
					...prev.default_dimensions,
					complete: true
				}
			}));

			// Show success message for this section
			setSectionSaveStatus(prev => ({
				...prev,
				dimensions: true
			}));

			// Reset the success message after 3 seconds
			setTimeout(() => {
				setSectionSaveStatus(prev => ({
					...prev,
					dimensions: false
				}));
			}, 3000);

		} catch ( error ) {
			console.error( 'Error updating store default dimensions:', error );
		} finally {
			setIsSaving( false );
		}
	};

	if ( isLoading ) {
		return (
			<div className="flex flex-col justify-center items-center h-64">
				<ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
				<div className="text-lg text-center">
					<p>
						{ __( 'Loading store settings, and checking products.', 'fraktvalg' ) }
					</p>
					<p className="text-sm text-gray-600">
						{ __( 'This may take a few minutes if you have a lot of products...', 'fraktvalg' ) }
					</p>
				</div>
			</div>
		);
	}

	// Address section content
	const addressContent = (
		<div className="mt-4">
			<p className="text-sm text-gray-600 mb-4">
				{ __( 'It is important to have an accurate store address, as all shipping options need to know the sender location to accurately provide shipping estimates, even if the recipient address is less explicit.', 'fraktvalg' ) }
			</p>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{ __( 'Street Address', 'fraktvalg' ) }
					</label>
					<InputText
						value={ storeStatus.address?.fields?.address || '' }
						onChange={ (e) => handleAddressChange('address', e.target.value) }
						placeholder={ __( 'Enter your store address', 'fraktvalg' ) }
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{ __( 'Postal Code', 'fraktvalg' ) }
					</label>
					<InputText
						value={ storeStatus.address?.fields?.postcode || '' }
						onChange={ (e) => handleAddressChange('postcode', e.target.value) }
						placeholder={ __( 'Enter your postal code', 'fraktvalg' ) }
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{ __( 'City', 'fraktvalg' ) }
					</label>
					<InputText
						value={ storeStatus.address?.fields?.city || '' }
						onChange={ (e) => handleAddressChange('city', e.target.value) }
						placeholder={ __( 'Enter your city', 'fraktvalg' ) }
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{ __( 'Country', 'fraktvalg' ) }
					</label>
					<InputText
						value={ storeStatus.address?.fields?.country || 'NO' }
						onChange={ (e) => handleAddressChange('country', e.target.value) }
						readOnly={ true }
						placeholder={ __( 'Norway', 'fraktvalg' ) }
					/>
				</div>
			</div>

			<div className="mt-4 flex justify-end">
				<Button
					type="button"
					onClick={saveAddressSettings}
					disabled={isSaving}
				>
					{ isSaving ? (
						<>
							<ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
							{ __( 'Saving...', 'fraktvalg' ) }
						</>
					) : (
						<>
							{ __( 'Save Address', 'fraktvalg' ) }
						</>
					) }
				</Button>
			</div>

			{sectionSaveStatus.address && (
				<div className="mt-2 text-green-600 text-sm flex items-center">
					<CheckCircleIcon className="h-4 w-4 mr-1" />
					{ __( 'Address saved successfully', 'fraktvalg' ) }
				</div>
			)}
		</div>
	);

	// Package dimensions section content
	const packageDimensionsContent = (
		<div className="mt-4">
			<p className="text-sm text-gray-600 mb-4">
				{ __( 'Most shipping providers require the dimensions (width, height, and length) of a product, as well as its weight. This is used to more accurately calculate shipping costs, and without it you are more likely t use your fallback prices, or charge lower shipping costs than intended from your customers.', 'fraktvalg' ) }
			</p>
			{ storeStatus.products_without_dimensions && storeStatus.products_without_dimensions.has_products_without_dimensions ? (
				<div>
					<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
						<div className="flex">
							<div className="flex-shrink-0">
								<ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
							</div>
							<div className="grid grid-cols gap-2 ml-3">
								<p className="text-sm text-yellow-700">
									{ __( 'Some products appear to be missing dimensions or weight information. This may cause shipping prices to be inaccurate or unavailable. Note that this check does not account for variable products, we recommend you double-check the product information in WooCommerce.', 'fraktvalg' ) }
								</p>
								<p className="text-sm text-yellow-700">
									{ __( 'You may define default dimensions and weights that will substitute any missing ones. Note that some shipping prices may be inaccurate if you do not provide the correct dimensions and weights for each product.', 'fraktvalg' ) }
								</p>
							</div>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-4 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{ __( 'Length', 'fraktvalg' ) }
								<small> (cm)</small>
							</label>
							<InputText
								type="number"
								value={ storeStatus.default_dimensions?.length || '' }
								onChange={ (e) => handleDimensionChange('length', e.target.value) }
								placeholder={ __( 'Length', 'fraktvalg' ) }
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{ __( 'Width', 'fraktvalg' ) }
								<small> (cm)</small>
							</label>
							<InputText
								type="number"
								value={ storeStatus.default_dimensions?.width || '' }
								onChange={ (e) => handleDimensionChange('width', e.target.value) }
								placeholder={ __( 'Width', 'fraktvalg' ) }
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{ __( 'Height', 'fraktvalg' ) }
								<small> (cm)</small>
							</label>
							<InputText
								type="number"
								value={ storeStatus.default_dimensions?.height || '' }
								onChange={ (e) => handleDimensionChange('height', e.target.value) }
								placeholder={ __( 'Height', 'fraktvalg' ) }
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								{ __( 'Weight', 'fraktvalg' ) }
								<small> (kg)</small>
							</label>
							<InputText
								type="number"
								value={ storeStatus.default_dimensions?.weight || '' }
								onChange={ (e) => handleDimensionChange('weight', e.target.value) }
								placeholder={ __( 'Weight', 'fraktvalg' ) }
							/>
						</div>
					</div>

					<div className="mt-4 flex justify-end">
						<Button
							type="button"
							onClick={saveDefaultDimensions}
							disabled={isSaving}
						>
							{ isSaving ? (
								<>
									<ArrowPathIcon className="h-4 w-4 mr-2 inline-block animate-spin" />
									{ __( 'Saving...', 'fraktvalg' ) }
								</>
							) : (
								<>
									{ __( 'Save Default Dimensions', 'fraktvalg' ) }
								</>
							) }
						</Button>
					</div>

					{sectionSaveStatus.dimensions && (
						<div className="mt-2 text-green-600 text-sm flex items-center">
							<CheckCircleIcon className="h-4 w-4 mr-1" />
							{ __( 'Default dimensions saved successfully', 'fraktvalg' ) }
						</div>
					)}

				</div>
			) : (
				<p className="text-green-600">
					{ __( 'All products have complete dimension and weight information.', 'fraktvalg' ) }
				</p>
			) }
		</div>
	);

	// Create badge for address section
	const addressBadge = storeStatus.address && !storeStatus.address.complete ? (
		<>
			<ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
			{ __( 'Incomplete', 'fraktvalg' ) }
		</>
	) : null;

	// Create badge for package dimensions section
	const packageDimensionsBadge = storeStatus.products_without_dimensions && storeStatus.products_without_dimensions.has_products_without_dimensions ? (
		<>
			<ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
			{ __( 'Products missing dimensions', 'fraktvalg' ) }
		</>
	) : null;

	return (
		<div className="grid grid-cols-1 gap-6 p-6">
			<div className="text-center">
				<h2 className="text-xl font-semibold mb-4">
					{ __( 'Store Settings', 'fraktvalg' ) }
				</h2>
				<p className="text-gray-600 mb-6">
					{ __( 'Configure your store settings for Fraktvalg shipping options:', 'fraktvalg' ) }
				</p>
			</div>

			<div className="space-y-4">
				{/* Store Address Section */}
				<ExpandableSection
					title={ __( 'Store Address', 'fraktvalg' ) }
					badge={addressBadge}
					content={addressContent}
					visible={storeStatus.address && !storeStatus.address.complete}
				/>

				{/* Package Dimensions Section */}
				<ExpandableSection
					title={ __( 'Package Dimensions', 'fraktvalg' ) }
					badge={packageDimensionsBadge}
					content={packageDimensionsContent}
					visible={storeStatus.products_without_dimensions && storeStatus.products_without_dimensions.has_products_without_dimensions}
				/>
			</div>

			<Button type="button" onClick={nextStep}>
				{ __( 'Next step', 'fraktvalg' ) }
			</Button>
		</div>
	);
}
