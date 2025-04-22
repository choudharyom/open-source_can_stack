import { useState, useEffect, useRef } from 'react';

export default function MessageTrafficView({
  messages,
  selectedMessage,
  setSelectedMessage,
  onToggleSignalTracking,
  trackedSignals,
  simulationEngine,
  protocol
}) {
  const [filteredMessages, setFilteredMessages] = useState(messages);
  const [filterText, setFilterText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [viewMode, setViewMode] = useState('hex'); // 'hex', 'dec', 'bin'
  const messagesEndRef = useRef(null);
  
  // Update filtered messages when messages change
  useEffect(() => {
    if (filterText) {
      const filtered = messages.filter(msg => 
        msg.id.toLowerCase().includes(filterText.toLowerCase()) ||
        msg.name.toLowerCase().includes(filterText.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
    
    // Auto-scroll to bottom
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, filterText, autoScroll]);
  
  // Get signal value based on the selected view mode
  const getFormattedValue = (value, type) => {
    if (typeof value === 'undefined' || value === null) return '-';
    
    if (type === 'physical') {
      return typeof value === 'number' ? value.toFixed(2) : value.toString();
    }
    
    // Convert to appropriate format for raw values
    const rawValue = typeof value === 'number' ? Math.floor(value) : 0;
    
    switch (viewMode) {
      case 'hex':
        return `0x${rawValue.toString(16).toUpperCase().padStart(2, '0')}`;
      case 'dec':
        return rawValue.toString();
      case 'bin':
        return `0b${rawValue.toString(2).padStart(8, '0')}`;
      default:
        return rawValue.toString();
    }
  };
  
  // Format the data bytes based on the selected view mode
  const formatDataBytes = (data) => {
    if (!data || !data.length) return '-';
    
    switch (viewMode) {
      case 'hex':
        return data.map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      case 'dec':
        return data.map(byte => byte.toString()).join(' ');
      case 'bin':
        return data.map(byte => byte.toString(2).padStart(8, '0')).join(' ');
      default:
        return data.join(' ');
    }
  };
  
  // Get protocol-specific styling for message types
  const getMessageTypeStyle = (message) => {
    // Default style
    let bgColor = 'bg-gray-50';
    let textColor = 'text-gray-900';
    
    if (protocol === 'J1939') {
      // J1939-specific styling based on PGN
      const pgnValue = parseInt(message.id.replace('0x', ''), 16);
      
      if (pgnValue >= 0xF000) {
        // Global PGNs
        bgColor = 'bg-purple-50';
        textColor = 'text-purple-800';
      } else if (pgnValue >= 0xFE00 && pgnValue <= 0xFEFF) {
        // Address claimed
        bgColor = 'bg-green-50';
        textColor = 'text-green-800';
      }
    } else if (protocol === 'CANopen') {
      // CANopen-specific styling based on COB-ID
      const cobId = parseInt(message.id.replace('0x', ''), 16);
      
      if (cobId <= 0x7F) {
        // NMT
        bgColor = 'bg-red-50';
        textColor = 'text-red-800';
      } else if (cobId >= 0x700 && cobId <= 0x77F) {
        // Heartbeat
        bgColor = 'bg-blue-50';
        textColor = 'text-blue-800';
      } else if (cobId >= 0x180 && cobId <= 0x5FF) {
        // PDOs
        bgColor = 'bg-green-50';
        textColor = 'text-green-800';
      }
    } else if (protocol === 'UDS') {
      // UDS-specific styling
      if (message.id === simulationEngine?.udsConfig?.rxId) {
        // Request
        bgColor = 'bg-yellow-50';
        textColor = 'text-yellow-800';
      } else if (message.id === simulationEngine?.udsConfig?.txId) {
        // Response
        bgColor = 'bg-blue-50';
        textColor = 'text-blue-800';
      }
    }
    
    // Error frames always in red
    if (message.error) {
      bgColor = 'bg-red-50';
      textColor = 'text-red-800';
    }
    
    return { bgColor, textColor };
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-grow max-w-md">
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Filter messages..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-700">View:</label>
            <select
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
            >
              <option value="hex">Hexadecimal</option>
              <option value="dec">Decimal</option>
              <option value="bin">Binary</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              <span className="ml-2">Auto-scroll</span>
            </label>
          </div>
          
          <button
            className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 flex items-center"
            onClick={() => setFilteredMessages([])}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Clear
          </button>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-md">
        <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between">
          <div className="grid grid-cols-6 gap-4 w-full text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-1">Timestamp</div>
            <div className="col-span-1">ID</div>
            <div className="col-span-1">Name</div>
            <div className="col-span-1">DLC</div>
            <div className="col-span-2">Data</div>
          </div>
        </div>
        
        <div className="max-h-96 overflow-auto">
          {filteredMessages.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredMessages.map((message, idx) => {
                const { bgColor, textColor } = getMessageTypeStyle(message);
                
                return (
                  <div 
                    key={idx} 
                    className={`p-3 cursor-pointer transition ${
                      selectedMessage === idx ? 'bg-blue-50' : bgColor
                    } hover:bg-blue-50`}
                    onClick={() => setSelectedMessage(idx === selectedMessage ? null : idx)}
                  >
                    <div className="grid grid-cols-6 gap-4 w-full text-sm">
                      <div className="col-span-1 font-mono text-gray-900">
                        {message.timestamp.toFixed(3)} ms
                      </div>
                      <div className={`col-span-1 font-mono font-medium ${textColor}`}>
                        {message.id}
                      </div>
                      <div className="col-span-1 truncate">
                        {message.name}
                      </div>
                      <div className="col-span-1 font-mono">
                        {message.dlc}
                      </div>
                      <div className="col-span-2 font-mono text-xs overflow-hidden whitespace-nowrap overflow-ellipsis">
                        {formatDataBytes(message.data)}
                      </div>
                    </div>
                    
                    {selectedMessage === idx && message.signals && message.signals.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h4 className="text-sm font-medium mb-2">Signal Values</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {message.signals.map((signal, sigIdx) => {
                            const isTracked = trackedSignals.some(
                              s => s.messageId === message.id && s.signalName === signal.name
                            );
                            
                            return (
                              <div 
                                key={sigIdx} 
                                className={`flex justify-between items-center p-2 rounded ${
                                  isTracked ? 'bg-blue-100' : 'bg-gray-100'
                                }`}
                              >
                                <div>
                                  <div className="font-medium text-sm">{signal.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Raw: {getFormattedValue(signal.rawValue, 'raw')}
                                    {signal.physicalValue !== undefined && (
                                      <> | Phys: {getFormattedValue(signal.physicalValue, 'physical')}
                                        {signal.unit && ` ${signal.unit}`}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  className={`text-xs px-2 py-1 rounded ${
                                    isTracked 
                                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSignalTracking(message.id, signal.name);
                                  }}
                                >
                                  {isTracked ? 'Untrack' : 'Track'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {selectedMessage === idx && message.error && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
                          <span className="font-bold">Error: </span>
                          {message.errorType} - {message.errorDescription}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No messages to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}