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
            <label className="mr-2 text-sm text-gray-700">View: