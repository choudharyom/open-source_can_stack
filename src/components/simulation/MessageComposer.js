import { useState, useEffect } from 'react';
import FormField from '../FormField';

export default function MessageComposer({ 
  simulationEngine, 
  selectedNode, 
  onSendMessage, 
  protocol, 
  protocolConfig 
}) {
  const [availableMessages, setAvailableMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [customMessage, setCustomMessage] = useState({
    id: '',
    name: 'Custom Message',
    dlc: 8,
    data: Array(8).fill(0),
    cyclical: false,
    cycleTime: 100
  });
  const [messageType, setMessageType] = useState('predefined'); // 'predefined' or 'custom'
  const [signalValues, setSignalValues] = useState({});
  
  // Initialize available messages
  useEffect(() => {
    if (simulationEngine) {
      const messages = simulationEngine.getAvailableMessages(selectedNode);
      setAvailableMessages(messages);
      
      if (messages.length > 0) {
        setSelectedMessage(messages[0].id);
      }
    }
  }, [simulationEngine, selectedNode]);
  
  // Update signal values when selected message changes
  useEffect(() => {
    if (selectedMessage && simulationEngine) {
      const message = simulationEngine.getMessageDetails(selectedMessage);
      if (message && message.signals) {
        const initialValues = {};
        message.signals.forEach(signal => {
          initialValues[signal.name] = signal.defaultValue || 0;
        });
        setSignalValues(initialValues);
      }
    }
  }, [selectedMessage, simulationEngine]);
  
  // Handle sending a predefined message
  const handleSendPredefined = () => {
    if (!selectedMessage) return;
    
    const messageDetails = simulationEngine.getMessageDetails(selectedMessage);
    if (!messageDetails) return;
    
    // Prepare message data with signal values
    const messageData = {
      id: selectedMessage,
      signals: Object.keys(signalValues).map(signalName => ({
        name: signalName,
        value: signalValues[signalName]
      }))
    };
    
    onSendMessage(messageData);
  };
  
  // Handle sending a custom message
  const handleSendCustom = () => {
    if (!customMessage.id) return;
    
    // Ensure ID is in proper format
    const id = customMessage.id.startsWith('0x') 
      ? customMessage.id 
      : `0x${parseInt(customMessage.id, 10).toString(16).toUpperCase()}`;
    
    const messageData = {
      ...customMessage,
      id
    };
    
    onSendMessage(messageData);
  };
  
  // Update custom message data byte
  const updateDataByte = (index, value) => {
    const newData = [...customMessage.data];
    newData[index] = parseInt(value, 16) || 0;
    setCustomMessage({
      ...customMessage,
      data: newData
    });
  };
  
  // Render protocol-specific message composer
  const renderProtocolSpecificComposer = () => {
    switch (protocol) {
      case 'UDS':
        return renderUDSComposer();
      case 'J1939':
        return renderJ1939Composer();
      case 'CANopen':
        return renderCANopenComposer();
      default:
        return renderGenericComposer();
    }
  };
  
  // UDS-specific message composer
  const renderUDSComposer = () => {
    // Get UDS requests if available
    const udsRequests = protocolConfig?.uds?.requests || [];
    
    return (
      <div className="mt-4 space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-md font-medium text-yellow-800 mb-2">Diagnostic Requests</h3>
          
          {udsRequests.length > 0 ? (
            <div className="space-y-2">
              {udsRequests.map((request, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{request.description || `Request ${idx + 1}`}</span>
                    <div className="text-xs text-gray-500 font-mono">
                      {[request.service, request.subfunction, ...(request.dataBytes || [])].filter(Boolean).map(b => b.toUpperCase()).join(' ')}
                    </div>
                  </div>
                  <button
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => {
                      // Send UDS request
                      onSendMessage({
                        id: protocolConfig?.uds?.rxId || '0x7E0',
                        udsRequest: request
                      });
                    }}
                  >
                    Send
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No diagnostic requests defined. Define requests in the UDS configuration.</p>
          )}
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-md font-medium text-gray-900 mb-2">Custom Diagnostic Request</h3>
          
          <div className="space-y-4">
            <FormField
              label="Service ID (hex)"
              id="uds-service"
            >
              <input
                type="text"
                id="uds-service"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 22"
                value={customMessage.service || ''}
                onChange={(e) => setCustomMessage({
                  ...customMessage,
                  service: e.target.value.replace(/[^0-9A-Fa-f]/g, '').substring(0, 2)
                })}
              />
            </FormField>
            
            <FormField
              label="Data (hex bytes, space-separated)"
              id="uds-data"
            >
              <input
                type="text"
                id="uds-data"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., F1 90"
                value={customMessage.udsData || ''}
                onChange={(e) => setCustomMessage({
                  ...customMessage,
                  udsData: e.target.value
                })}
              />
            </FormField>
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  // Parse UDS data
                  const service = customMessage.service || '';
                  const dataBytes = (customMessage.udsData || '')
                    .split(' ')
                    .filter(Boolean)
                    .map(b => b.trim());
                  
                  if (!service) {
                    alert('Service ID is required');
                    return;
                  }
                  
                  // Send UDS request
                  onSendMessage({
                    id: protocolConfig?.uds?.rxId || '0x7E0',
                    udsRequest: {
                      service,
                      dataBytes
                    }
                  });
                }}
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // J1939-specific message composer
  const renderJ1939Composer = () => {
    // Find selected message details
    const selectedPgn = availableMessages.find(msg => msg.id === selectedMessage);
    
    return (
      <div className="mt-4">
        <div className="flex items-start mb-4">
          <div className="w-1/3 pr-4">
            <FormField
              label="Select PGN"
              id="pgn-select"
            >
              <select
                id="pgn-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={selectedMessage || ''}
                onChange={(e) => setSelectedMessage(e.target.value)}
              >
                <option value="">Select PGN...</option>
                {availableMessages.map((msg, idx) => (
                  <option key={idx} value={msg.id}>
                    {msg.name} ({msg.id})
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          
          <div className="flex-1">
            {selectedPgn && (
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-1">{selectedPgn.name} Details</h4>
                <div className="text-xs text-blue-700">
                  <div>PGN: {selectedPgn.id}</div>
                  <div>Length: {selectedPgn.dlc} bytes</div>
                  <div>Default Cycle: {selectedPgn.cycleTime} ms</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {selectedMessage && simulationEngine && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Signal Values</h4>
            
            <div className="space-y-3 mb-4">
              {simulationEngine.getMessageDetails(selectedMessage)?.signals?.map((signal, idx) => (
                <FormField
                  key={idx}
                  label={`${signal.name} (${signal.spn || 'unknown'}) [${signal.unit || '-'}]`}
                  id={`signal-${signal.name}`}
                >
                  <div className="flex items-center">
                    <input
                      type="number"
                      id={`signal-${signal.name}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={signalValues[signal.name] || 0}
                      onChange={(e) => setSignalValues({
                        ...signalValues,
                        [signal.name]: parseFloat(e.target.value) || 0
                      })}
                      step={signal.resolution || 1}
                    />
                    {signal.unit && (
                      <span className="ml-2 text-sm text-gray-500">{signal.unit}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Min: {signal.minValue !== undefined ? signal.minValue : 'n/a'}, 
                    Max: {signal.maxValue !== undefined ? signal.maxValue : 'n/a'}
                  </div>
                </FormField>
              ))}
              
              {simulationEngine.getMessageDetails(selectedMessage)?.signals?.length === 0 && (
                <div className="text-sm text-gray-500 py-2">
                  No signals defined for this PGN. Raw data will be sent.
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={handleSendPredefined}
              >
                Send Message
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // CANopen-specific message composer
  const renderCANopenComposer = () => {
    return (
      <div className="mt-4">
        <div className="flex items-start mb-4">
          <div className="w-1/3 pr-4">
            <FormField
              label="Select COB-ID"
              id="cobid-select"
            >
              <select
                id="cobid-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={selectedMessage || ''}
                onChange={(e) => setSelectedMessage(e.target.value)}
              >
                <option value="">Select COB-ID...</option>
                {availableMessages.map((msg, idx) => (
                  <option key={idx} value={msg.id}>
                    {msg.name} ({msg.id})
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          
          <div className="flex-1">
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-1">CANopen Message Types</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                <div>NMT: 0x000</div>
                <div>SYNC: 0x080</div>
                <div>EMCY: 0x080+NodeID</div>
                <div>TPDO1: 0x180+NodeID</div>
                <div>TPDO2: 0x280+NodeID</div>
                <div>TPDO3: 0x380+NodeID</div>
                <div>TPDO4: 0x480+NodeID</div>
                <div>HEARTBEAT: 0x700+NodeID</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Special NMT Command Composer */}
        <div className="mb-4 p-4 border border-gray-200 rounded-md">
          <h4 className="text-md font-medium text-gray-900 mb-2">NMT Commands</h4>
          
          <div className="flex items-end space-x-4">
            <FormField
              label="Command"
              id="nmt-command"
            >
              <select
                id="nmt-command"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={customMessage.nmtCommand || '1'}
                onChange={(e) => setCustomMessage({
                  ...customMessage,
                  nmtCommand: e.target.value
                })}
              >
                <option value="1">Start Node (1)</option>
                <option value="2">Stop Node (2)</option>
                <option value="80">Enter Pre-Operational (80)</option>
                <option value="81">Reset Node (81)</option>
                <option value="82">Reset Communication (82)</option>
              </select>
            </FormField>
            
            <FormField
              label="Node ID (0 = all nodes)"
              id="nmt-node"
            >
              <input
                type="number"
                id="nmt-node"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="127"
                value={customMessage.nmtNode || '0'}
                onChange={(e) => setCustomMessage({
                  ...customMessage,
                  nmtNode: Math.max(0, Math.min(127, parseInt(e.target.value) || 0)).toString()
                })}
              />
            </FormField>
            
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => {
                // Send NMT command
                onSendMessage({
                  id: '0x000',
                  data: [
                    parseInt(customMessage.nmtCommand || '1'), 
                    parseInt(customMessage.nmtNode || '0')
                  ],
                  canopen: true,
                  nmtCommand: true
                });
              }}
            >
              Send NMT
            </button>
          </div>
        </div>
        
        {selectedMessage && simulationEngine && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Message Data</h4>
            
            <div className="grid grid-cols-8 gap-2 mb-4">
              {Array.from({ length: 8 }, (_, idx) => (
                <FormField
                  key={idx}
                  label={`Byte ${idx}`}
                  id={`data-byte-${idx}`}
                  className="w-full"
                >
                  <input
                    type="text"
                    id={`data-byte-${idx}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="00"
                    value={(customMessage.data[idx] || 0).toString(16).toUpperCase().padStart(2, '0')}
                    onChange={(e) => updateDataByte(idx, e.target.value)}
                    maxLength={2}
                  />
                </FormField>
              ))}
            </div>
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  onSendMessage({
                    id: selectedMessage,
                    data: customMessage.data,
                    canopen: true
                  });
                }}
              >
                Send Message
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Generic message composer
  const renderGenericComposer = () => {
    return (
      <div className="mt-4">
        <div className="flex space-x-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              checked={messageType === 'predefined'}
              onChange={() => setMessageType('predefined')}
            />
            <span className="ml-2 text-sm text-gray-700">Predefined Message</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="radio"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              checked={messageType === 'custom'}
              onChange={() => setMessageType('custom')}
            />
            <span className="ml-2 text-sm text-gray-700">Custom Message</span>
          </label>
        </div>
        
        {messageType === 'predefined' && (
          <div>
            <FormField
              label="Select Message"
              id="message-select"
            >
              <select
                id="message-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={selectedMessage || ''}
                onChange={(e) => setSelectedMessage(e.target.value)}
              >
                <option value="">Select a message...</option>
                {availableMessages.map((msg, idx) => (
                  <option key={idx} value={msg.id}>
                    {msg.name} ({msg.id})
                  </option>
                ))}
              </select>
            </FormField>
            
            {selectedMessage && simulationEngine && (
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-900 mb-2">Signal Values</h4>
                
                <div className="space-y-3 mb-4">
                  {simulationEngine.getMessageDetails(selectedMessage)?.signals?.map((signal, idx) => (
                    <FormField
                      key={idx}
                      label={signal.name}
                      id={`signal-${signal.name}`}
                    >
                      <input
                        type="number"
                        id={`signal-${signal.name}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={signalValues[signal.name] || 0}
                        onChange={(e) => setSignalValues({
                          ...signalValues,
                          [signal.name]: parseFloat(e.target.value) || 0
                        })}
                      />
                    </FormField>
                  ))}
                  
                  {simulationEngine.getMessageDetails(selectedMessage)?.signals?.length === 0 && (
                    <div className="text-sm text-gray-500 py-2">
                      No signals defined for this message. Raw data will be sent.
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={handleSendPredefined}
                  >
                    Send Message
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {messageType === 'custom' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormField
                label="Message ID (hex)"
                id="custom-id"
              >
                <input
                  type="text"
                  id="custom-id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 0x100"
                  value={customMessage.id}
                  onChange={(e) => setCustomMessage({
                    ...customMessage,
                    id: e.target.value
                  })}
                />
              </FormField>
              
              <FormField
                label="Data Length (bytes)"
                id="custom-dlc"
              >
                <select
                  id="custom-dlc"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={customMessage.dlc}
                  onChange={(e) => {
                    const dlc = parseInt(e.target.value);
                    const newData = Array(dlc).fill(0).map((_, i) => 
                      i < customMessage.data.length ? customMessage.data[i] : 0
                    );
                    setCustomMessage({
                      ...customMessage,
                      dlc,
                      data: newData
                    });
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                  {config.canFD && [12, 16, 20, 24, 32, 48, 64].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </FormField>
            </div>
            
            <div className="mb-4">
              <FormField
                label="Data Bytes (hex)"
                id="custom-data"
              >
                <div className="grid grid-cols-8 gap-2">
                  {Array.from({ length: customMessage.dlc }, (_, idx) => (
                    <input
                      key={idx}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="00"
                      value={(customMessage.data[idx] || 0).toString(16).toUpperCase().padStart(2, '0')}
                      onChange={(e) => updateDataByte(idx, e.target.value)}
                      maxLength={2}
                    />
                  ))}
                </div>
              </FormField>
            </div>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="custom-cyclical"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={customMessage.cyclical}
                onChange={(e) => setCustomMessage({
                  ...customMessage,
                  cyclical: e.target.checked
                })}
              />
              <label htmlFor="custom-cyclical" className="ml-2 text-sm text-gray-700">
                Send cyclically
              </label>
              
              {customMessage.cyclical && (
                <div className="ml-4 flex items-center">
                  <input
                    type="number"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="10"
                    step="10"
                    value={customMessage.cycleTime}
                    onChange={(e) => setCustomMessage({
                      ...customMessage,
                      cycleTime: Math.max(10, parseInt(e.target.value) || 100)
                    })}
                  />
                  <span className="ml-2 text-sm text-gray-700">ms</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={handleSendCustom}
                disabled={!customMessage.id}
              >
                Send Message
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-gray-900 mb-2">Message Composer</h3>
        <p className="text-sm text-gray-500">Compose and send CAN messages manually.</p>
      </div>
      
      {renderProtocolSpecificComposer()}
    </div>
  );
}