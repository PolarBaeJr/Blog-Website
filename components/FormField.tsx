interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  multiline?: boolean;
  rows?: number;
}

export default function FormField({
  label,
  name,
  type = 'text',
  error,
  placeholder,
  required = false,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: FormFieldProps) {
  const inputClasses =
    'w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          rows={rows}
          className={`${inputClasses} resize-vertical`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          className={inputClasses}
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
