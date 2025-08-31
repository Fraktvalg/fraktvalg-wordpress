import React from 'react';
import { useState, useEffect } from 'react';
import { __, _x } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

import "./fraktvalg.pcss";
import Header from "./Components/Header";
import Providers from "./Tabs/Providers";
import OptionalSettings from "./Tabs/OptionalSettings";
import Support from "./Tabs/Support";
import ShippingMethods from "./Tabs/ShippingMethods";

export default function Settings({}) {
	const [ tab, setTab ] = useState( 'providers' );
	const [ provider, setProvider ] = useState( null );

	// Shared state for providers
	const [ allSuppliers, setAllSuppliers ] = useState({});
	const [ suppliers, setSuppliers ] = useState({});
	const [ priorityProvider, setPriorityProvider ] = useState(null);
	const [ priorityProviderDiscount, setPriorityProviderDiscount ] = useState(10);
	const [ priorityProviderDiscountType, setPriorityProviderDiscountType ] = useState('percent');
	const [ providerFieldValues, setProviderFieldValues ] = useState({});

	// Shared state for optional settings
	const [ optionalSettings, setOptionalSettings ] = useState({
		freight: {
			addedCost: 0,
			addedCostType: 'fixed',
			custom: {
				name: __( 'Shipping & handling', 'fraktvalg' ),
				price: 100,
				type: 'fixed',
			}
		},
		useProduction: true,
		names: [],
		local_pickup: {
			enabled: false,
			name: __( 'Local store pickup', 'fraktvalg' ),
			price: 0,
			free_threshold: null,
		},
	});

	// Loading states
	const [ isLoadingProviders, setIsLoadingProviders ] = useState(true);
	const [ isLoadingOptionalSettings, setIsLoadingOptionalSettings ] = useState(true);

	// Error states
	const [ providerError, setProviderError ] = useState(null);
	const [ optionalSettingsError, setOptionalSettingsError ] = useState(null);

	const tabs = [
		{
			label: _x('My providers', 'Tab label', 'fraktvalg'),
			value: 'providers',
		},
		{
			label: _x('Optional settings', 'Tab label', 'fraktvalg'),
			value: 'settings',
		},
		{
			label: _x('Support', 'Tab label', 'fraktvalg'),
			value: 'support',
		},
	]

	const fetchProviders = () => {
		setProviderError(null);
		setIsLoadingProviders(true);

		apiFetch({
			path: 'fraktvalg/v1/settings/providers/mine',
			method: 'GET'
		}).then((response) => {
			const tempFieldValues = {};

			setSuppliers(response?.mine?.data || {});
			setAllSuppliers(response?.available?.data || {});

			if (response?.available?.data) {
				Object.keys(response?.available?.data).map((key) => {
					let fieldEntries = {};
					Object.keys(response?.available?.data[key]?.fields).map((fieldKey) => {
						fieldEntries[response?.available?.data[key]?.fields[fieldKey]?.name] = response?.available?.data[key]?.fields[fieldKey]?.value;
					});
					tempFieldValues[response?.available?.data[key]?.id] = fieldEntries;
				});
			}

			if (response?.mine?.data) {
				response?.mine?.data?.forEach((provider) => {
					if (allSuppliers[provider?.id]) {
						let modifiedAllSuppliers = { ...allSuppliers };
						delete modifiedAllSuppliers[provider?.id];
						setAllSuppliers(modifiedAllSuppliers);
					}

					let fieldEntries = {};
					Object.keys(provider?.fields).map((fieldKey) => {
						fieldEntries[provider?.fields[fieldKey]?.name] = provider?.fields[fieldKey]?.value;
					});

					tempFieldValues[provider?.id] = fieldEntries;
				});

				setProviderFieldValues(tempFieldValues);
			}
		}).catch((error) => {
			setProviderError(error?.message);
		}).finally(() => {
			setIsLoadingProviders(false);
		});
	};

	const fetchPriorityProvider = () => {
		apiFetch({
			path: 'fraktvalg/v1/settings/providers/priority',
			method: 'GET'
		}).then((response) => {
			setPriorityProvider(response?.data?.providerId);
			setPriorityProviderDiscount(response?.data?.discount);
			setPriorityProviderDiscountType(response?.data?.discountType);
		});
	};

	const fetchOptionalSettings = () => {
		setOptionalSettingsError(null);
		setIsLoadingOptionalSettings(true);

		apiFetch({
			path: '/fraktvalg/v1/settings/optional-settings',
			method: 'GET',
		}).then((response) => {
			// Merge the fetched settings with defaults to ensure all properties exist
			const fetchedSettings = response?.data || {};
			setOptionalSettings({
				...optionalSettings,
				...fetchedSettings,
				// Ensure local_pickup is properly merged
				local_pickup: {
					...optionalSettings.local_pickup,
					...(fetchedSettings.local_pickup || {})
				}
			});
		}).catch((error) => {
			setOptionalSettingsError(error?.message);
		}).finally(() => {
			setIsLoadingOptionalSettings(false);
		});
	};

	useEffect(() => {
		fetchProviders();
		fetchPriorityProvider();
		fetchOptionalSettings();
	}, []);

	const setProviderFieldValueCallback = (provider, values) => {
		setProviderFieldValues({ ...providerFieldValues, [provider]: values });
	};

	const updateOptionalSettings = (newSettings) => {
		setOptionalSettings(newSettings);
	};

	return (
		<div className="min-h-full">
			<Header tabs={tabs} activeTab={tab} setTab={setTab} />

			{tab === 'providers' && (
				<Providers
					allSuppliers={allSuppliers}
					suppliers={suppliers}
					priorityProvider={priorityProvider}
					priorityProviderDiscount={priorityProviderDiscount}
					priorityProviderDiscountType={priorityProviderDiscountType}
					providerFieldValues={providerFieldValues}
					isLoading={isLoadingProviders}
					error={providerError}
					setError={setProviderError}
					setProvider={setProvider}
					setTab={setTab}
					setProviderFieldValueCallback={setProviderFieldValueCallback}
					onUpdatePriorityProvider={(provider, discount, type) => {
						setPriorityProvider(provider);
						setPriorityProviderDiscount(discount);
						setPriorityProviderDiscountType(type);
					}}
				/>
			)}
			{tab === 'shipping-methods' && <ShippingMethods supplier={provider} setTab={setTab} />}
			{tab === 'settings' && (
				<OptionalSettings
					settings={optionalSettings}
					isLoading={isLoadingOptionalSettings}
					error={optionalSettingsError}
					onUpdateSettings={updateOptionalSettings}
				/>
			)}
			{tab === 'support' && <Support />}
		</div>
	)
}
