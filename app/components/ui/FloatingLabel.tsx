function FloatingLabel({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <div
        className={`relative rounded-md border ${
          error ? "border-red-300" : "border-gray-200"
        } bg-white px-3 py-2 transition-colors focus-within:border-blue-600`}
      >
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder=" "
          className="peer h-6 w-full bg-transparent placeholder-transparent text-sm outline-none"
        />
        <label
          htmlFor={id}
          className={`absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-500
  transition-all duration-150 ease-in-out
  peer-placeholder-shown:top-3
  peer-placeholder-shown:text-sm
  peer-placeholder-shown:text-gray-500
  peer-focus:-top-2.5
  peer-focus:text-xs
  peer-focus:text-blue-600
  peer-focus:font-semibold`}
        >
          {label}
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default FloatingLabel;
