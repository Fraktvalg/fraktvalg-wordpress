import { useState, useEffect } from "react";

import { __ } from "@wordpress/i18n";
import apiFetch from "@wordpress/api-fetch";

import Wrapper from "../Components/Wrapper";
import InputText from "../../FormElements/InputText";
import InputNumber from "../../FormElements/InputNumber";
import Notification from "../../Components/Notifications";
import Button from "../../FormElements/Button";
import {AccordionSection} from "../../Onboarding/Steps/OptionalSettings";
import {ArrowPathIcon} from "@heroicons/react/24/solid";
import InputBoolean from "../../FormElements/InputBoolean";

export default function OptionalSettings({settings, isLoading, error, onUpdateSettings}) {
	const [ notice, setNotice ] = useState(null);

	const setOption = (event) => {
		const newSettings = {...settings};
		
		// Ensure local_pickup object exists
		if (!newSettings.local_pickup) {
			newSettings.local_pickup = {
				enabled: false,
				name: 'Local store pickup',
				price: 0,
				free_threshold: null,
				locations: []
			};
		}
		
		// Ensure locations array exists
		if (!newSettings.local_pickup.locations) {
			newSettings.local_pickup.locations = [];
		}
		
		switch (event.target.name) {
			case 'freight[addedCost]':
				newSettings.freight.addedCost = event.target.value;
				break;
			case 'freight[addedCostType]':
				newSettings.freight.addedCostType = event.target.value;
				break;
			case 'freight[custom][name]':
				newSettings.freight.custom.name = event.target.value;
				break;
			case 'freight[custom][price]':
				newSettings.freight.custom.price = event.target.value;
				break;
			case 'freight[custom][type]':
				newSettings.freight.custom.type = event.target.value;
				break;
			case 'useProduction':
				newSettings.useProduction = event.target.checked;
				break;
			case 'default_dimensions[length]':
				newSettings.default_dimensions.length = event.target.value;
				break;
			case 'default_dimensions[width]':
				newSettings.default_dimensions.width = event.target.value;
				break;
			case 'default_dimensions[height]':
				newSettings.default_dimensions.height = event.target.value;
				break;
			case 'default_dimensions[weight]':
				newSettings.default_dimensions.weight = event.target.value;
				break;
			case 'local_pickup[enabled]':
				newSettings.local_pickup.enabled = event.target.checked;
				break;
			case 'local_pickup[name]':
				newSettings.local_pickup.name = event.target.value;
				break;
			case 'local_pickup[price]':
				newSettings.local_pickup.price = event.target.value;
				break;
			case 'local_pickup[free_threshold]':
				newSettings.local_pickup.free_threshold = event.target.value || null;
				break;
			case 'local_pickup[locations]':
				// Handle location array updates
				newSettings.local_pickup.locations = event.target.value;
				break;
			default:
				// Check if this is a location-specific field
				const locationMatch = event.target.name.match(/^local_pickup\[locations\]\[(\d+)\]\[(\w+)\]$/);
				if (locationMatch) {
					const index = parseInt(locationMatch[1]);
					const field = locationMatch[2];
					if (newSettings.local_pickup.locations[index]) {
						if (field === 'enabled') {
							newSettings.local_pickup.locations[index][field] = event.target.checked;
						} else if (field === 'price') {
							newSettings.local_pickup.locations[index][field] = parseFloat(event.target.value) || 0;
						} else {
							newSettings.local_pickup.locations[index][field] = event.target.value;
						}
					}
				} else {
					newSettings[event.target.name] = event.target.value;
				}
				break;
		}
		
		onUpdateSettings(newSettings);
	}

	const saveOptionalSettings = () => {
		setNotice(null);

		// Ensure local_pickup exists in settings before saving
		const settingsToSave = {
			...settings,
			local_pickup: settings.local_pickup || {
				enabled: false,
				name: 'Local store pickup',
				price: 0,
				free_threshold: null
			}
		};

		apiFetch({
			path: '/fraktvalg/v1/settings/optional-settings',
			method: 'POST',
			data: {
				options: settingsToSave,
			},
		}).then((response) => {
			setNotice({
				type: response?.type,
				title: response?.title,
				message: response?.message,
			})
		}).catch((error) => {
			setNotice({
				type: 'error',
				title: __('Error saving optional settings', 'fraktvalg'),
				message: error?.message,
			});
		});
	}

	if (isLoading) {
		return (
			<Wrapper title="My providers">
				<div className="flex flex-col justify-center items-center h-64">
					<ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
					<div className="text-lg">
						Fetching optional settings...
					</div>
				</div>
			</Wrapper>
		)
	}

	return (
		<Wrapper title="Optional settings">
			<div className="grid grid-cols-1 gap-3">
				{error &&
					<Notification type="error" title={__('Error fetching optional settings', 'fraktvalg')}>
						{error}
					</Notification>
				}

				<AccordionSection title={__('Backup shipping option', 'fraktvalg')} open={true}>
					<p>
						{__('If Fraktvalg should ever become unavailable, or no shiopping options are returned, returns this shipping alternative by default.', 'fraktvalg')}
					</p>

					<div className="mt-2 grid grid-cols-1 gap-4">
						<InputText 
							label={__('Shipping option name', 'fraktvalg')} 
							name="freight[custom][name]" 
							value={settings.freight.custom.name} 
							callback={setOption} 
						/>

						<div className="flex items-center gap-3">
							<input 
								name="freight[custom][price]" 
								value={settings.freight.custom.price} 
								onChange={setOption} 
								type="number" 
								min="0" 
								step="1" 
								placeholder="25" 
								className="w-16 border border-gray-300 rounded-md p-2" 
							/>
							<select 
								name="freight[custom][type]" 
								className="border border-gray-300 rounded-md p-2" 
								value={settings.freight.custom.type} 
								onChange={setOption}
							>
								<option value="percent">%</option>
								<option value="fixed">NOK</option>
							</select>

							<div>
								<label htmlFor="something">
									{__('Backup shipping cost', 'fraktvalg')}
								</label>
								<p className="text-xs italic">
									{__('The backup shipping cost can be set to either a fixed value, or a percentage of the order total.', 'fraktvalg')}
								</p>
							</div>
						</div>
					</div>
				</AccordionSection>

				<AccordionSection title={__('Local Store Pickup', 'fraktvalg')} open={true}>
					<p className="text-sm text-gray-600 mb-4">
						{__('Allow customers to pick up their orders directly from your store locations.', 'fraktvalg')}
					</p>

					<div className="grid grid-cols-1 gap-4">
						<InputBoolean
							label={__('Enable store pickup', 'fraktvalg')}
							name="local_pickup[enabled]"
							value={settings.local_pickup?.enabled || false}
							callback={setOption}
						/>

						{settings.local_pickup?.enabled && (
							<>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{__('Free pickup threshold', 'fraktvalg')}
									</label>
									<div className="flex items-center gap-3">
										<input
											name="local_pickup[free_threshold]"
											value={settings.local_pickup?.free_threshold || ''}
											onChange={setOption}
											type="number"
											min="0"
											step="1"
											placeholder=""
											className="w-24 border border-gray-300 rounded-md p-2"
										/>
										<span className="text-sm text-gray-600">NOK</span>
									</div>
									<p className="text-xs text-gray-500 mt-1">
										{__('Leave empty to always use location prices', 'fraktvalg')}
									</p>
								</div>

								<div>
									<h4 className="text-sm font-medium text-gray-700 mb-2">
										{__('Pickup Locations', 'fraktvalg')}
									</h4>
									
									<div className="space-y-3">
										{(settings.local_pickup?.locations || []).map((location, index) => (
											<div key={index} className="border border-gray-200 rounded-lg p-4">
												<div className="grid grid-cols-1 gap-3">
													<div className="flex items-center justify-between">
														<h5 className="font-medium text-gray-700">
															{__('Location', 'fraktvalg')} {index + 1}
														</h5>
														<button
															type="button"
															onClick={() => {
																const locations = [...(settings.local_pickup?.locations || [])];
																locations.splice(index, 1);
																setOption({
																	target: {
																		name: 'local_pickup[locations]',
																		value: locations
																	}
																});
															}}
															className="text-red-600 hover:text-red-700 text-sm"
														>
															{__('Remove', 'fraktvalg')}
														</button>
													</div>
													
													<InputBoolean
														label={__('Enabled', 'fraktvalg')}
														name={`local_pickup[locations][${index}][enabled]`}
														value={location.enabled !== false}
														callback={setOption}
													/>
													
													<InputText
														label={__('Location name', 'fraktvalg')}
														name={`local_pickup[locations][${index}][name]`}
														value={location.name || ''}
														callback={setOption}
														placeholder={__('Downtown Store', 'fraktvalg')}
													/>
													
													<InputText
														label={__('Address', 'fraktvalg')}
														name={`local_pickup[locations][${index}][address]`}
														value={location.address || ''}
														callback={setOption}
														placeholder={__('123 Main St, Oslo', 'fraktvalg')}
													/>
													
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-1">
															{__('Price', 'fraktvalg')}
														</label>
														<div className="flex items-center gap-3">
															<input
																name={`local_pickup[locations][${index}][price]`}
																value={location.price || 0}
																onChange={setOption}
																type="number"
																min="0"
																step="1"
																placeholder="0"
																className="w-24 border border-gray-300 rounded-md p-2"
															/>
															<span className="text-sm text-gray-600">NOK</span>
														</div>
													</div>
													
													<InputText
														label={__('Pickup time text', 'fraktvalg')}
														name={`local_pickup[locations][${index}][pickup_time_text]`}
														value={location.pickup_time_text || ''}
														callback={setOption}
														placeholder={__('Usually ready within 1 hour', 'fraktvalg')}
													/>
												</div>
											</div>
										))}
										
										<button
											type="button"
											onClick={() => {
												const locations = [...(settings.local_pickup?.locations || [])];
												const newIndex = locations.length;
												locations.push({
													id: `location_${newIndex}`,
													name: '',
													address: '',
													price: 0,
													pickup_time_text: 'Usually ready within 1 hour',
													enabled: true
												});
												setOption({
													target: {
														name: 'local_pickup[locations]',
														value: locations
													}
												});
											}}
											className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
										>
											{__('Add Location', 'fraktvalg')}
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				</AccordionSection>

				<AccordionSection title={__('Shipping cost adjustments', 'fraktvalg')} open={true}>
					{__('Safeguard your shipping costs with these optional alternatives.', 'fraktvalg')}

					<div className="flex items-center gap-3">
						<input 
							name="freight[addedCost]" 
							value={settings.freight.addedCost} 
							onChange={setOption} 
							type="number" 
							min="0" 
							step="1" 
							placeholder="10" 
							className="w-16 border border-gray-300 rounded-md p-2" 
						/>
						<select 
							name="freight[addedCostType]" 
							className="border border-gray-300 rounded-md p-2" 
							value={settings.freight.addedCostType} 
							onChange={setOption}
						>
							<option value="percent">%</option>
							<option value="fixed">NOK</option>
						</select>

						<div>
							<label htmlFor="something">
								{__('Add an optional surcharge to all shipping options', 'fraktvalg')}
							</label>
							<p className="text-xs italic">
								{__('Additional shipping surcharges are meant to cover administrative- and handling costs, and is automatically added to all shipping alternatives.', 'fraktvalg')}
							</p>
						</div>
					</div>
				</AccordionSection>

				<AccordionSection title={__('Default dimensions', 'fraktvalg')} open={true}>
					<p className="text-sm text-yellow-700 mb-4">
						{ __( 'Most shipping providers require all dimensions and weights for each product to reliably return shipping costs. If you have not set these for your products, you may define default dimensions and weights that will substitute any missing ones.', 'fraktvalg' ) }
					</p>

					<div className="mt-2 grid grid-cols-1 gap-4">
						<div className="grid grid-cols-4 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{__('Length', 'fraktvalg')}
								</label>
								<InputText
									type="number"
									name="default_dimensions[length]"
									value={settings.default_dimensions?.length || ''}
									onChange={setOption}
									placeholder={__('Length', 'fraktvalg')}
								/>
							</div>
							
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{__('Width', 'fraktvalg')}
								</label>
								<InputText
									type="number"
									name="default_dimensions[width]"
									value={settings.default_dimensions?.width || ''}
									onChange={setOption}
									placeholder={__('Width', 'fraktvalg')}
								/>
							</div>
							
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{__('Height', 'fraktvalg')}
								</label>
								<InputText
									type="number"
									name="default_dimensions[height]"
									value={settings.default_dimensions?.height || ''}
									onChange={setOption}
									placeholder={__('Height', 'fraktvalg')}
								/>
							</div>
							
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									{__('Weight', 'fraktvalg')}
								</label>
								<InputText
									type="number"
									name="default_dimensions[weight]"
									value={settings.default_dimensions?.weight || ''}
									onChange={setOption}
									placeholder={__('Weight', 'fraktvalg')}
								/>
							</div>
						</div>
					</div>
				</AccordionSection>

				<AccordionSection title={__('Shop environment', 'fraktvalg')} open={true}>
					<p>
						{__('Some times, you wish to use the shipping providers test environments, for example on a staging site. Doing so will not create legitimate shipping requests, and prevents yo ufrom incurring charges while testing your store setup.', 'fraktvalg')}
					</p>

					<div className="mt-2 grid grid-cols-1 gap-4">
						<InputBoolean 
							label={__('Use production environments', 'fraktvalg')} 
							name="useProduction" 
							value={settings.useProduction} 
							callback={setOption} 
						/>
					</div>
				</AccordionSection>

				{notice &&
					<Notification type={notice.type} title={notice.title}>
						{notice.message}
					</Notification>
				}

				<Button type="button" onClick={saveOptionalSettings}>
					{__('Save optional settings', 'fraktvalg')}
				</Button>
			</div>
		</Wrapper>
	);
}