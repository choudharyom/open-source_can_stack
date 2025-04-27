import { useState, useMemo, useEffect } from 'react'; // Import useMemo and useEffect
import FormField from '../FormField';

export default function MCUSelector({ config, updateConfig, onNext }) {
  console.log('[MCUSelector] Rendering with config:', config); // Log props on render
  const [errors, setErrors] = useState({});
  const [selectedVendor, setSelectedVendor] = useState('All'); // State for the selected vendor filter

  // Define MCU options with vendor information
  const mcuOptions = useMemo(() => [ // Use useMemo in case this data becomes dynamic later
    { value: 'STM32F446', label: 'STM32F446 (ST Microelectronics)', vendor: 'ST' },
    { value: 'S32K144', label: 'S32K144 (NXP)', vendor: 'NXP' },
    { value: 'TMS570LS3137', label: 'TMS570LS3137 (Texas Instruments)', vendor: 'TI' },
    { value: 'TC397', label: 'TC397 (Infineon)', vendor: 'Infineon' },
    { value: 'R-Car H3', label: 'R-Car H3 (Renesas)', vendor: 'Renesas' },
    // Add more MCUs here if needed
  ], []); // Empty dependency array means this runs once

  const mcuVendors = useMemo(() => // Calculate vendors from the options
    ['All', ...new Set(mcuOptions.map(mcu => mcu.vendor))]
  , [mcuOptions]);

  // Filter MCU options based on the selected vendor
  const filteredMcuOptions = useMemo(() => {
    if (selectedVendor === 'All') {
      return mcuOptions;
    }
    return mcuOptions.filter(mcu => mcu.vendor === selectedVendor);
  }, [selectedVendor, mcuOptions]);

  // Effect to reset MCU selection if it's filtered out
  useEffect(() => {
    // Check if the currently selected MCU is still valid after filtering
    if (config.mcu && !filteredMcuOptions.some(mcu => mcu.value === config.mcu)) {
      // If not valid, reset the selection
      updateConfig('mcu', '');
      // Optionally clear the error state as well if it was related to the selection
      setErrors(prev => ({ ...prev, mcu: null }));
    }
    // Dependency array includes filteredMcuOptions to re-run when the filter changes.
    // Also include config.mcu and updateConfig as per exhaustive-deps rule.
  }, [filteredMcuOptions, config.mcu, updateConfig]);


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

  // Get details for the selected MCU (example data)
  const getMcuDetails = (mcuValue) => {
    // In a real app, this data might come from an API or a more detailed config object
    const detailsMap = {
      'STM32F446': { controllers: 2, canFd: true, baudrate: '1 Mbps', recommended: 'Automotive Body Control' },
      'S32K144': { controllers: 3, canFd: true, baudrate: '5 Mbps', recommended: 'General Automotive' },
      'TMS570LS3137': { controllers: 2, canFd: false, baudrate: '1 Mbps', recommended: 'Safety Critical Systems' },
      'TC397': { controllers: 8, canFd: true, baudrate: '5 Mbps', recommended: 'High-Performance Computing' },
      'R-Car H3': { controllers: 4, canFd: true, baudrate: '2 Mbps', recommended: 'Infotainment, ADAS' },
    };
    return detailsMap[mcuValue] || null;
  };

  const selectedMcuDetails = config.mcu ? getMcuDetails(config.mcu) : null;

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
              type="button" // Add type="button" to prevent form submission if inside a form
              onClick={() => setSelectedVendor(vendor)} // Set the selected vendor on click
              className={`px-3 py-1 text-sm rounded-full transition-colors duration-150 ${
                selectedVendor === vendor
                  ? 'bg-blue-600 text-white font-semibold shadow-sm' // Active state
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300' // Inactive state
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
          {/* Use the filtered list of MCUs */}
          {filteredMcuOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Show details only if an MCU is selected and details exist */}
      {selectedMcuDetails && (
        <div className="mt-4 mb-6 bg-blue-50 p-4 rounded-md border border-blue-100">
          <h3 className="text-md font-semibold text-blue-800 mb-2">MCU Details: {config.mcu}</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>CAN Controllers: {selectedMcuDetails.controllers}</li>
            <li>CAN FD Support: {selectedMcuDetails.canFd ? 'Yes' : 'No'}</li>
            <li>Max Baudrate: {selectedMcuDetails.baudrate}</li>
            <li>Recommended for: {selectedMcuDetails.recommended}</li>
          </ul>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={validateAndProceed}
          disabled={!config.mcu} // Disable button if no MCU is selected
          className={`px-4 py-2 rounded-md text-white transition-colors duration-150 ${
            config.mcu
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed' // Disabled state
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
