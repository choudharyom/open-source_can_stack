import { useState } from 'react';
import FormField from '../FormField';
import Tooltip from '../Tooltip';

export default function ProtocolSelector({ config, updateConfig, onNext, onPrevious }) {
  console.log('[ProtocolSelector] Rendering with config:', config); // Log props on render
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const protocols = [
    {
      id: 'CAN',
      name: 'Basic CAN',
      description: 'Standard CAN protocol with basic message transmission and reception.',
      suitableFor: 'Simple data exchange between ECUs',
      complexity: 'Low',
      features: [
        'Standard and Extended IDs',
        'Message filtering',
        'Error handling',
        'Basic bus-off recovery'
      ],
      advancedOptions: [
        { id: 'useInterrupts', label: 'Use interrupt-based reception', defaultValue: true },
        { id: 'autoBusOff', label: 'Automatic bus-off recovery', defaultValue: true },
        { id: 'acceptanceFiltering', label: 'Hardware acceptance filtering', defaultValue: true }
      ]
    },
    {
      id: 'CANopen',
      name: 'CANopen',
      description: 'Higher-layer protocol for industrial automation and embedded systems.',
      suitableFor: 'Industrial applications, machine control',
      complexity: 'Medium',
      features: [
        'Service Data Objects (SDO)',
        'Process Data Objects (PDO)',
        'Network Management (NMT)',
        'Heartbeat monitoring',
        'Emergency messaging'
      ],
      advancedOptions: [
        { id: 'nodeId', label: 'CANopen Node ID', defaultValue: 1, type: 'number', min: 1, max: 127 },
        { id: 'heartbeatTime', label: 'Heartbeat time (ms)', defaultValue: 1000, type: 'number', min: 100 },
        { id: 'enableLSS', label: 'Enable Layer Setting Services', defaultValue: false }
      ]
    },
    {
      id: 'J1939',
      name: 'SAE J1939',
      description: 'Protocol for commercial vehicles with standardized parameter groups.',
      suitableFor: 'Heavy-duty vehicles, trucks, buses',
      complexity: 'Medium',
      features: [
        'Parameter Group Numbers (PGN)',
        'Suspect Parameter Numbers (SPN)',
        'Transport Protocol for large messages',
        'Address claiming',
        'Diagnostic messaging'
      ],
      advancedOptions: [
        { id: 'preferredAddress', label: 'Preferred Address', defaultValue: 128, type: 'number', min: 0, max: 253 },
        { id: 'enableAddressClaiming', label: 'Enable Address Claiming', defaultValue: true },
        { id: 'industryGroup', label: 'Industry Group', defaultValue: 0, type: 'select', 
          options: [
            { value: 0, label: 'Global' },
            { value: 1, label: 'On-Highway Equipment' },
            { value: 2, label: 'Agricultural and Forestry' },
            { value: 3, label: 'Construction' },
            { value: 4, label: 'Marine' },
            { value: 5, label: 'Industrial' }
          ]
        }
      ]
    },
    {
      id: 'UDS',
      name: 'UDS (ISO 14229)',
      description: 'Unified Diagnostic Services for vehicle diagnostics.',
      suitableFor: 'Diagnostic applications, ECU testing',
      complexity: 'High',
      features: [
        'Diagnostic session control',
        'ECU reset',
        'Security access',
        'Communication control',
        'Routine control',
        'Data reading and writing'
      ],
      advancedOptions: [
        { id: 'rxId', label: 'Diagnostic Request ID', defaultValue: '0x7E0', type: 'text' },
        { id: 'txId', label: 'Diagnostic Response ID', defaultValue: '0x7E8', type: 'text' },
        { id: 'supportedSessions', label: 'Supported Sessions', defaultValue: ['default', 'programming', 'extended'], type: 'multiselect',
          options: [
            { value: 'default', label: 'Default Session' },
            { value: 'programming', label: 'Programming Session' },
            { value: 'extended', label: 'Extended Session' },
            { value: 'safety', label: 'Safety System Session' }
          ]
        },
        { id: 'securityLevel', label: 'Security Level Support', defaultValue: 1, type: 'number', min: 0, max: 127 },
        { id: 'p2ServerMax', label: 'Max Server Response Time (ms)', defaultValue: 50, type: 'number', min: 10 }
      ]
    }
  ];
  
  const validateAndProceed = () => {
    const newErrors = {};
    
    if (!config.protocol) {
      newErrors.protocol = 'Please select a protocol';
    }
    
    setErrors(newErrors);
    
    // If no errors, proceed to next step
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };
  
  const handleProtocolSelect = (protocolId) => {
    // Set default advanced options when selecting a protocol
    const selectedProtocol = protocols.find(p => p.id === protocolId);
    if (selectedProtocol) {
      const advancedConfig = {};
      
      selectedProtocol.advancedOptions.forEach(option => {
        advancedConfig[option.id] = option.defaultValue;
      });
      
      updateConfig('protocol', protocolId);
      updateConfig('protocolConfig', advancedConfig);
      setErrors({ ...errors, protocol: null });
    } else {
      console.error('[ProtocolSelector] Could not find protocol details for ID:', protocolId);
    }
  };
  
  const updateAdvancedOption = (optionId, value) => {
    const currentConfig = config.protocolConfig || {};
    updateConfig('protocolConfig', {
      ...currentConfig,
      [optionId]: value
    });
  };
  
  const renderAdvancedOption = (option) => {
    const currentConfig = config.protocolConfig || {};
    const value = currentConfig[option.id] !== undefined ? currentConfig[option.id] : option.defaultValue;
    
    switch (option.type) {
      case 'number':
        return (
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            min={option.min}
            max={option.max}
            value={value}
            onChange={(e) => updateAdvancedOption(option.id, parseInt(e.target.value) || option.defaultValue)}
          />
        );
      
      case 'text':
        return (
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={value}
            onChange={(e) => updateAdvancedOption(option.id, e.target.value)}
          />
        );
      
      case 'select':
        return (
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={value}
            onChange={(e) => updateAdvancedOption(option.id, parseInt(e.target.value) || option.defaultValue)}
          >
            {option.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {option.options.map(opt => (
              <label key={opt.value} className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={(value || []).includes(opt.value)}
                  onChange={(e) => {
                    const newValue = [...(value || [])];
                    if (e.target.checked) {
                      !newValue.includes(opt.value) && newValue.push(opt.value);
                    } else {
                      const idx = newValue.indexOf(opt.value);
                      idx >= 0 && newValue.splice(idx, 1);
                    }
                    updateAdvancedOption(option.id, newValue);
                  }}
                />
                <span className="ml-2 text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      
      default:
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={value}
              onChange={(e) => updateAdvancedOption(option.id, e.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-700">{option.label}</span>
          </div>
        );
    }
  };
  
  const selectedProtocol = protocols.find(p => p.id === config.protocol);
  
  return (
    <div className="p-4 md:p-6 bg-white rounded-md shadow-sm">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Step 3: Choose Protocol Layer</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {protocols.map((protocol) => (
          <div
            key={protocol.id}
            className={`border rounded-md p-4 cursor-pointer transition ${
              config.protocol === protocol.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
            onClick={() => handleProtocolSelect(protocol.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium text-gray-900">{protocol.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                protocol.complexity === 'Low' 
                  ? 'bg-green-100 text-green-800' 
                  : protocol.complexity === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {protocol.complexity} Complexity
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-2">{protocol.description}</p>
            <p className="text-xs text-gray-700 mb-2">
              <span className="font-semibold">Best for:</span> {protocol.suitableFor}
            </p>
            <details className="text-xs text-gray-600">
              <summary className="font-medium cursor-pointer">Key Features</summary>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {protocol.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </div>
      
      {errors.protocol && (
        <div className="mb-6 text-red-600 text-sm">
          {errors.protocol}
        </div>
      )}
      
      {selectedProtocol && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold text-blue-800">
              Configuration: {selectedProtocol.name}
            </h3>
            <button 
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-700 mb-4">
              {selectedProtocol.id === 'CAN' && 
                'Basic CAN implementation will include message filtering and basic error handling.'}
              {selectedProtocol.id === 'CANopen' && 
                'CANopen implementation will include SDO, PDO, SYNC, and NMT protocols.'}
              {selectedProtocol.id === 'J1939' && 
                'J1939 implementation will include PGN handling, address claiming, and transport protocol.'}
              {selectedProtocol.id === 'UDS' && 
                'UDS implementation will include diagnostic session control, ECU reset, and security access services.'}
            </p>
            
            {showAdvanced && (
              <div className="border-t border-blue-200 pt-3">
                <h4 className="text-sm font-medium text-blue-800 mb-3">Advanced Protocol Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedProtocol.advancedOptions.map((option) => (
                    <FormField
                      key={option.id}
                      label={option.label}
                      id={`protocol-option-${option.id}`}
                      tooltip={option.description}
                    >
                      {renderAdvancedOption(option)}
                    </FormField>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        <button
          onClick={onPrevious}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Previous
        </button>
        <button
          onClick={validateAndProceed}
          className={`px-4 py-2 rounded-md ${
            config.protocol
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
