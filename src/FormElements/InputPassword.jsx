export default function InputPassword({ name, label, value = '', placeholder = '', required = false, callback, onChange, children }) {
	// Use onChange if provided, otherwise fall back to callback for backward compatibility
	const handleChange = onChange || callback;
	
	return (
		<div>
			<label className="block text-sm font-medium text-gray-700">{label}</label>
			<input
				name={name}
				type="password"
				value={value}
				onChange={handleChange}
				onPaste={handleChange}
				placeholder={placeholder}
				required={required}
				className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
			/>
			{children}
		</div>
	);
}
