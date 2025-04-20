import { useState } from 'react';
import FormField from '../FormField';

export default function MCUSelector({ config, updateConfig, onNext }) {
  console.log('[MCUSelector] Rendering with config:', config); // Log props on render
  const [errors, setErrors] = useState({});
  
  const mcuOptions = [
    { value: 'STM32F446', label: 'STM32F446 (ST Microelectronics)' },
    { value: 'S32K144', label: 'S32K144 (NXP)' },
    { value: 'TMS570LS3137', label: 'TMS570LS3137 (Texas Instruments)' },
    { value: 'TC397', label: 'TC397 (Infineon)' },
    { value: 'R-Car H3', label: 'R-Car H3 (Renesas)' },
  ];
  
  const mcuVendors = ['All', 'ST', 'NXP', 'TI', 'Infineon', 'Renesas'];
  
  const validateAndProceed = () => {
    const newErrors = {};
    
    if (!config.mcu) {
      newErrors.mcu = 'Please select a microcontroller';
    }
    
    setErrors(newErrors);
    
    // If no errors, proceed to next step
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };
  
  return (
    <div className="p-4 md:p-6 bg-white rounded-md shadow-sm">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Step 1: Select Target MCU</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Vendor
        </label>
        <div className="flex flex-wrap gap-2">
          {mcuVendors.map((vendor) => (
            <button
              key={vendor}
              className={`px-3 py-1 text-sm rounded-full ${
                vendor === 'All'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {vendor}
            </button>
          ))}
        </div>
      </div>
      
      <FormField
        label="Select Microcontroller"
        id="mcu"
        error={errors.mcu}
        tooltip="Choose the target microcontroller for your CAN stack implementation"
        required
      >
        <select
          id="mcu"
          value={config.mcu}
          onChange={(e) => {
            updateConfig('mcu', e.target.value);
            setErrors({ ...errors, mcu: null });
          }}
          className={`w-full px-3 py-2 border ${errors.mcu ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          aria-invalid={errors.mcu ? 'true' : 'false'}
        >
          <option value="">Select MCU...</option>
          {mcuOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
      
      {config.mcu && (
        <div className="mb-6 bg-blue-50 p-4 rounded-md">
          <h3 className="text-md font-semibold text-blue-800 mb-2">MCU Details: {config.mcu}</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>CAN Controllers: 2</li>
            <li>CAN FD Support: Yes</li>
            <li>Max Baudrate: 1 Mbps</li>
            <li>Recommended for: Automotive Body Control</li>
          </ul>
        </div>
      )}
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={validateAndProceed}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
