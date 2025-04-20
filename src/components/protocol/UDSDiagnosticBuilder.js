import { useState } from 'react';
import FormField from '../FormField';
import Tooltip from '../Tooltip';

export default function UDSDiagnosticBuilder({ config, updateConfig }) {
  const [activeTab, setActiveTab] = useState('services');
  const [selectedService, setSelectedService] = useState(null);
  const [diagnosticRequest, setDiagnosticRequest] = useState({
    service: '',
    subfunction: '',
    dataBytes: [],
    description: ''
  });
  
  // UDS service definitions
  const udsServices = [
    { id: '10', name: 'Diagnostic Session Control', subfunctions: [
      { id: '01', name: 'Default Session' },
      { id: '02', name: 'Programming Session' },
      { id: '03', name: 'Extended Diagnostic Session' },
      { id: '04', name: 'Safety System Diagnostic Session' }
    ]},
    { id: '11', name: 'ECU Reset', subfunctions: [
      { id: '01', name: 'Hard Reset' },
      { id: '02', name: 'Key Off/On Reset' },
      { id: '03', name: 'Soft Reset' },
      { id: '04', name: 'Enable Rapid Power Shutdown' },
      { id: '05', name: 'Disable Rapid Power Shutdown' }
    ]},
    { id: '14', name: 'Clear Diagnostic Information', subfunctions: [] },
    { id: '19', name: 'Read DTC Information', subfunctions: [
      { id: '01', name: 'Report Number of DTC by Status Mask' },
      { id: '02', name: 'Report DTC by Status Mask' },
      { id: '03', name: 'Report DTC Snapshot Identification' },
      { id: '04', name: 'Report DTC Snapshot Record by DTC Number' },
      { id: '05', name: 'Report DTC Stored Data by Record Number' },
      { id: '06', name: 'Report DTC Extended Data Record by DTC Number' }
    ]},
    { id: '22', name: 'Read Data By Identifier', subfunctions: [] },
    { id: '23', name: 'Read Memory By Address', subfunctions: [] },
    { id: '27', name: 'Security Access', subfunctions: [
      { id: '01', name: 'Request Seed (Level 1)' },
      { id: '02', name: 'Send Key (Level 1)' },
      { id: '03', name: 'Request Seed (Level 2)' },
      { id: '04', name: 'Send Key (Level 2)' },
      { id: '05', name: 'Request Seed (Level 3)' },
      { id: '06', name: 'Send Key (Level 3)' }
    ]},
    { id: '28', name: 'Communication Control', subfunctions: [
      { id: '00', name: 'Enable RX/TX' },
      { id: '01', name: 'Enable RX, Disable TX' },
      { id: '02', name: 'Disable RX, Enable TX' },
      { id: '03', name: 'Disable RX/TX' }
    ]},
    { id: '2E', name: 'Write Data By Identifier', subfunctions: [] },
    { id: '2F', name: 'Input Output Control By Identifier', subfunctions: [] },
    { id: '31', name: 'Routine Control', subfunctions: [
      { id: '01', name: 'Start Routine' },
      { id: '02', name: 'Stop Routine' },
      { id: '03', name: 'Request Routine Results' }
    ]},
    { id: '34', name: 'Request Download', subfunctions: [] },
    { id: '35', name: 'Request Upload', subfunctions: [] },
    { id: '36', name: 'Transfer Data', subfunctions: [] },
    { id: '37', name: 'Request Transfer Exit', subfunctions: [] },
    { id: '3E', name: 'Tester Present', subfunctions: [
      { id: '00', name: 'Zero Subfunction' }
    ]},
    { id: '85', name: 'Control DTC Setting', subfunctions: [
      { id: '01', name: 'ON (Enable DTC Setting)' },
      { id: '02', name: 'OFF (Disable DTC Setting)' }
    ]},
  ];
  
  // Common DIDs for Read/Write Data by Identifier
  const commonDIDs = [
    { id: 'F180', name: 'Boot Software Identification' },
    { id: 'F186', name: 'Active Diagnostic Session' },
    { id: 'F187', name: 'Vehicle Manufacturer ECU Software Number' },
    { id: 'F188', name: 'ECU Serial Number' },
    { id: 'F189', name: 'ECU Hardware Version Number' },
    { id: 'F18A', name: 'System Supplier ECU Hardware Number' },
    { id: 'F18B', name: 'ECU Manufacturing Date' },
    { id: 'F18C', name: 'ECU Software Version Number' },
    { id: 'F18D', name: 'System Supplier ECU Software Number' },
    { id: 'F190', name: 'Vehicle Identification Number' },
    { id: 'F195', name: 'VIN (Current)' },
    { id: 'F1A0', name: 'Component and/or System Supplier Identifier' }
  ];
  
  // Get the current UDS configuration
  const udsConfig = config.protocolConfig?.uds || {
    rxId: '0x7E0',
    txId: '0x7E8',
    requests: []
  };
  
  // Save the UDS configuration back to the main config
  const saveUdsConfig = (newUdsConfig) => {
    const currentProtocolConfig = config.protocolConfig || {};
    updateConfig('protocolConfig', {
      ...currentProtocolConfig,
      uds: newUdsConfig
    });
  };
  
  // Handle adding a diagnostic request to the configuration
  const addDiagnosticRequest = () => {
    if (!diagnosticRequest.service) {
      alert('Please select a service');
      return;
    }
    
    const newRequests = [...udsConfig.requests, {
      ...diagnosticRequest,
      id: `req_${Date.now()}`
    }];
    
    saveUdsConfig({
      ...udsConfig,
      requests: newRequests
    });
    
    // Reset the form
    setDiagnosticRequest({
      service: '',
      subfunction: '',
      dataBytes: [],
      description: ''
    });
    setSelectedService(null);
  };
  
  // Handle removing a diagnostic request
  const removeRequest = (requestId) => {
    const newRequests = udsConfig.requests.filter(req => req.id !== requestId);
    saveUdsConfig({
      ...udsConfig,
      requests: newRequests
    });
  };
  
  // Format the bytes of a request for display
  const formatRequestBytes = (request) => {
    let bytes = [request.service];
    
    if (request.subfunction) {
      bytes.push(request.subfunction);
    }
    
    if (request.dataBytes && request.dataBytes.length > 0) {
      bytes = [...bytes, ...request.dataBytes];
    }
    
    return bytes.map(b => b.toUpperCase()).join(' ');
  };
  
  // Get the name of a service by ID
  const getServiceName = (serviceId) => {
    const service = udsServices.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };
  
  // Get the name of a subfunction by service ID and subfunction ID
  const getSubfunctionName = (serviceId, subfunctionId) => {
    const service = udsServices.find(s => s.id === serviceId);
    if (!service) return 'Unknown Subfunction';
    
    const subfunction = service.subfunctions.find(sf => sf.id === subfunctionId);
    return subfunction ? subfunction.name : 'Custom Subfunction';
  };
  
  // Convert between hex string and byte array
  const hexStringToBytes = (hexString) => {
    const cleanHex = hexString.replace(/[^0-9A-Fa-f]/g, '');
    const bytes = [];
    
    for (let i = 0; i < cleanHex.length; i += 2) {
      if (i + 1 < cleanHex.length) {
        bytes.push(cleanHex.substring(i, i + 2));
      }
    }
    
    return bytes;
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-sm">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            className={`py-3 px-4 text-sm font-medium ${
              activeTab === 'services' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('services')}
          >
            UDS Services
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium ${
              activeTab === 'configuration' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('configuration')}
          >
            Configuration
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium ${
              activeTab === 'requests' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('requests')}
          >
            Saved Requests
          </button>
        </nav>
      </div>
      
      <div className="p-4">
        {activeTab === 'services' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">UDS Diagnostic Services</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {udsServices.map(service => (
                <div 
                  key={service.id}
                  className={`border rounded-md p-3 cursor-pointer ${
                    selectedService === service.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => {
                    setSelectedService(service.id);
                    setDiagnosticRequest({
                      ...diagnosticRequest,
                      service: service.id,
                      subfunction: service.subfunctions.length > 0 ? service.subfunctions[0].id : ''
                    });
                  }}
                >
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{service.name}</span>
                    <span className="text-gray-500 text-sm">0x{service.id}</span>
                  </div>
                  {service.subfunctions.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {service.subfunctions.length} subfunctions available
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {selectedService && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Configure {getServiceName(selectedService)} Request
                </h4>
                
                <div className="space-y-4">
                  {/* Service Selection (already selected above) */}
                  <FormField
                    label="Service ID"
                    id="service-id"
                    tooltip="The UDS service identifier"
                  >
                    <input
                      type="text"
                      id="service-id"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none"
                      value={`0x${diagnosticRequest.service}`}
                      readOnly
                    />
                  </FormField>
                  
                  {/* Subfunction Selection */}
                  {udsServices.find(s => s.id === selectedService)?.subfunctions.length > 0 && (
                    <FormField
                      label="Subfunction"
                      id="subfunction"
                      tooltip="The subfunction for this service"
                    >
                      <select
                        id="subfunction"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={diagnosticRequest.subfunction}
                        onChange={(e) => setDiagnosticRequest({
                          ...diagnosticRequest,
                          subfunction: e.target.value
                        })}
                      >
                        {udsServices.find(s => s.id === selectedService).subfunctions.map(sf => (
                          <option key={sf.id} value={sf.id}>
                            {sf.name} (0x{sf.id})
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}
                  
                  {/* Data Bytes for specific services */}
                  {selectedService === '22' && (
                    <FormField
                      label="Data Identifier (DID)"
                      id="did"
                      tooltip="The data identifier to read"
                    >
                      <select
                        id="did"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={diagnosticRequest.dataBytes.join('')}
                        onChange={(e) => {
                          const didBytes = hexStringToBytes(e.target.value);
                          setDiagnosticRequest({
                            ...diagnosticRequest,
                            dataBytes: didBytes,
                            description: e.target.selectedOptions[0].text
                          });
                        }}
                      >
                        <option value="">Select a DID...</option>
                        {commonDIDs.map(did => (
                          <option key={did.id} value={did.id}>
                            {did.name} (0x{did.id})
                          </option>
                        ))}
                      </select>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom DID (Hex)
                        </label>
                        <div className="flex">
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. F190"
                            value={diagnosticRequest.dataBytes.join('')}
                            onChange={(e) => {
                              const didBytes = hexStringToBytes(e.target.value);
                              setDiagnosticRequest({
                                ...diagnosticRequest,
                                dataBytes: didBytes
                              });
                            }}
                          />
                          <button
                            className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                            onClick={() => {
                              if (!diagnosticRequest.description) {
                                setDiagnosticRequest({
                                  ...diagnosticRequest,
                                  description: `Read DID 0x${diagnosticRequest.dataBytes.join('')}`
                                });
                              }
                            }}
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </FormField>
                  )}
                  
                  {/* Description for the request */}
                  <FormField
                    label="Description"
                    id="description"
                    tooltip="A description of what this request does"
                  >
                    <input
                      type="text"
                      id="description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Read VIN Number"
                      value={diagnosticRequest.description}
                      onChange={(e) => setDiagnosticRequest({
                        ...diagnosticRequest,
                        description: e.target.value
                      })}
                    />
                  </FormField>
                  
                  {/* Request Preview */}
                  <div className="mt-4 bg-gray-100 p-3 rounded-md">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Request Preview</h5>
                    <div className="font-mono text-xs">
                      {formatRequestBytes(diagnosticRequest)}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                      onClick={addDiagnosticRequest}
                    >
                      Save Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'configuration' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">UDS Protocol Configuration</h3>
            
            <div className="space-y-4">
              <FormField
                label="Diagnostic Request ID (Client → Server)"
                id="rx-id"
                tooltip="The CAN ID used for sending requests to the ECU"
              >
                <input
                  type="text"
                  id="rx-id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 0x7E0"
                  value={udsConfig.rxId}
                  onChange={(e) => saveUdsConfig({
                    ...udsConfig,
                    rxId: e.target.value
                  })}
                />
              </FormField>
              
              <FormField
                label="Diagnostic Response ID (Server → Client)"
                id="tx-id"
                tooltip="The CAN ID used by the ECU to respond to requests"
              >
                <input
                  type="text"
                  id="tx-id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 0x7E8"
                  value={udsConfig.txId}
                  onChange={(e) => saveUdsConfig({
                    ...udsConfig,
                    txId: e.target.value
                  })}
                />
              </FormField>
              
              <FormField
                label="Address Type"
                id="address-type"
                tooltip="The addressing type for UDS communication"
              >
                <div className="mt-1 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="address-type"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      checked={udsConfig.addressType === 'physical' || !udsConfig.addressType}
                      onChange={() => saveUdsConfig({
                        ...udsConfig,
                        addressType: 'physical'
                      })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Physical Addressing</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="address-type"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      checked={udsConfig.addressType === 'functional'}
                      onChange={() => saveUdsConfig({
                        ...udsConfig,
                        addressType: 'functional'
                      })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Functional Addressing</span>
                  </label>
                </div>
              </FormField>
              
              <FormField
                label="Supported Sessions"
                id="supported-sessions"
                tooltip="The diagnostic sessions supported by your ECU"
              >
                <div className="space-y-2 mt-1">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={udsConfig.supportedSessions?.includes('default') || false}
                      onChange={(e) => {
                        const sessions = udsConfig.supportedSessions || [];
                        if (e.target.checked) {
                          saveUdsConfig({
                            ...udsConfig,
                            supportedSessions: [...sessions, 'default']
                          });
                        } else {
                          saveUdsConfig({
                            ...udsConfig,
                            supportedSessions: sessions.filter(s => s !== 'default')
                          });
                        }
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">Default Session</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={udsConfig.supportedSessions?.includes('programming') || false}
                      onChange={(e) => {
                        const sessions = udsConfig.supportedSessions || [];
                        if (e.target.checked) {
                          saveUdsConfig({
                            ...udsConfig,
                            supportedSessions: [...sessions, 'programming']
                          });
                        } else {
                          saveUdsConfig({
                            ...udsConfig,
                            supportedSessions: sessions.filter(s => s !== 'programming')
                          });
                        }
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">Programming Session</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={udsConfig.supportedSessions?.includes('extended') || false}
                      onChange={(e) => {
                        const sessions = udsConfig.supportedSessions || [];
                        if (e.target.checked) {
                          saveUdsConfig({
                            ...udsConfig,
                            supportedSessions: [...sessions, 'extended']
                          });
                        } else {
                          saveUdsConfig({
                            ...udsConfig,
                            supportedSessions: sessions.filter(s => s !== 'extended')
                          });
                        }
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">Extended Diagnostic Session</span>
                  </label>
                </div>
              </FormField>
              
              <FormField
                label="Security Level Support"
                id="security-level"
                tooltip="The highest security level supported by your ECU"
              >
                <div className="flex items-center">
                  <input
                    type="number"
                    id="security-level"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max="127"
                    value={udsConfig.securityLevel || 0}
                    onChange={(e) => saveUdsConfig({
                      ...udsConfig,
                      securityLevel: parseInt(e.target.value) || 0
                    })}
                  />
                  <span className="ml-2 text-sm text-gray-500">
                    (0 = No security, 1-127 = Security levels)
                  </span>
                </div>
              </FormField>
            </div>
          </div>
        )}
        
        {activeTab === 'requests' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Saved Diagnostic Requests</h3>
            
            {udsConfig.requests && udsConfig.requests.length > 0 ? (
              <div className="space-y-3">
                {udsConfig.requests.map((request, index) => (
                  <div key={request.id} className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{request.description || 'Unnamed Request'}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {getServiceName(request.service)}
                          {request.subfunction && ` - ${getSubfunctionName(request.service, request.subfunction)}`}
                        </p>
                      </div>
                      <button
                        className="text-red-600 hover:text-red-800 text-sm"
                        onClick={() => removeRequest(request.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 font-mono text-xs bg-white border border-gray-300 p-2 rounded">
                      {formatRequestBytes(request)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-gray-500">No diagnostic requests saved yet. Go to UDS Services tab to create one.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}