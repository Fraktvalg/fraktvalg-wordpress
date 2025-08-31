import ProviderLogo from "../../../Components/ProviderLogo";
import { ClockIcon } from "@heroicons/react/24/outline";
import {formatShippingPrice} from "../utils/formatShippingPrice";
import { __, sprintf } from '@wordpress/i18n';

export default function Shippers({ shippers, onSelectShipper, editorMode }) {
	return (
		<div className="py-4 flex flex-col gap-2" role="listbox" aria-label="Shipping providers">
			{Object.entries(shippers).map(([key, shipper]) => (
				<button
					key={key}
					type="button"
					className="w-full text-left border border-solid rounded-lg p-4 bg-white flex flex-col sm:flex-row transition-all duration-300 items-center justify-between cursor-pointer hover:bg-tertiary/10 hover:shadow-md"
					onClick={() => editorMode !== 'multiple' && onSelectShipper(shipper)}
					onKeyDown={(e) => {
						if (editorMode !== 'multiple' && (e.key === 'Enter' || e.key === ' ')) {
							e.preventDefault();
							onSelectShipper(shipper);
						}
					}}
					disabled={editorMode === 'multiple'}
				>
					<div className="flex items-center gap-4">
						<ProviderLogo logo={ shipper?.texts?.logo?.url } shipper={ shipper?.id } alt="" className="w-12 h-12" />

						<div className="flex flex-col gap-1">
							<span className="text-md font-semibold">
								{ shipper?.id === 'local_pickup' 
									? shipper?.details?.label 
									: sprintf( __( 'Shipped by %s', 'fraktvalg' ), shipper?.details?.label ) 
								}
							</span>
							<p className="text-sm text-gray-600 flex items-center">
								<ClockIcon className="w-4 h-4 inline-block mr-2" />
								{shipper?.details?.quickestShippingTime}
							</p>
						</div>
					</div>
					<p className="text-md font-medium mt-2 sm:mt-0">{ sprintf( __( 'From %s', 'fraktvalg' ), formatShippingPrice( shipper?.details?.LowestPrice ) ) }</p>
				</button>
			))}
		</div>
	);
}
