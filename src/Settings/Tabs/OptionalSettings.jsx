import { useState, useEffect } from "react";

import {__, _x} from "@wordpress/i18n";
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
			default:
				newSettings[event.target.name] = event.target.value;
				break;
		}

		onUpdateSettings(newSettings);
	}

	const saveOptionalSettings = () => {
		setNotice(null);

		apiFetch({
			path: '/fraktvalg/v1/settings/optional-settings',
			method: 'POST',
			data: {
				options: settings,
			},
		}).then((response) => {
			setNotice({
				type: response?.type,
				title: response?.title,
				message: response?.message,
			})

			const envIndicator = document.getElementById('fraktvalg-env-indicator-block');
			if (envIndicator) {
				envIndicator.style.background = ( settings.useProduction ? '#4D8965' : '#DC2626' ); // Example: light green
			}
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
		<Wrapper title={_x('Optional settings', 'Tab label', 'fraktvalg')}>
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
									<small> (cm)</small>
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
									<small> (cm)</small>
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
									<small> (cm)</small>
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
									<small> (kg)</small>
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
