import { useState } from 'react';
import LoadingSpinner from '../LoadingSpinner';

export default function DBCUploader({ config, updateConfig, onNext, onPrevious }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dbcSignals, setDbcSignals] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.dbc')) {
        handleFileSelect(file);
      } else {
        setParseError('Please upload a .dbc file');
      }
    }
  };
  
  const handleFileSelect = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      setParseError('File size exceeds 10MB limit');
      return;
    }
    
    updateConfig('dbcFile', file);
    setIsProcessing(true);
    setParseError(null);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsedData = parseDBC(content);
        setDbcSignals(parsedData);
        setIsProcessing(false);
      } catch (error) {
        setParseError(`Error parsing DBC file: ${error.message}`);
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      setParseError('Error reading file');
      setIsProcessing(false);
    };
    
    reader.readAsText(file);
  };
  
  const parseDBC = (content) => {
    // This is a simplified DBC parser - in a real app, you'd use a more robust library
    const messages = [];
    const lines = content.split('\n');
    
    let currentMessage = null;
    
    for (const line of lines) {
      // Parse message definition
      if (line.startsWith('BO_ ')) {
        // Format: BO_ message_id message_name: message_length sender
        const parts = line.match(/BO_ (\d+) ([^:]+): (\d+) ([^\s]+)/);
        if (parts) {
          const id = parseInt(parts[1]);
          const name = parts[2].trim();
          const length = parseInt(parts[3]);
          
          currentMessage = {
            id: `0x${id.toString(16).toUpperCase()}`,
            name,
            dlc: length,
            signals: []
          };
          
          messages.push(currentMessage);
        }
      }
      
      // Parse signal definition
      else if (line.startsWith(' SG_ ') && currentMessage) {
        // Format: SG_ signal_name : start_bit|length@byte_order factor offset range unit receiver
        const parts = line.match(/ SG_ ([^ ]+) : (\d+)\|(\d+)@(\d+)([+-]) \(([^,]+),([^)]+)\) \[([^|]*)\|([^]]*)\] "([^"]*)" (.*)/);
        
        if (parts) {
          const signalName = parts[1];
          const startBit = parseInt(parts[2]);
          const length = parseInt(parts[3]);
          const byteOrder = parts[4] === '0' ? 'little_endian' : 'big_endian';
          const isSigned = parts[5] === '-';
          const factor = parseFloat(parts[6]);
          const offset = parseFloat(parts[7]);
          const unit = parts[10];
          
          currentMessage.signals.push({
            name: signalName,
            startBit,
            length,
            byteOrder,
            isSigned,
            factor,
            offset,
            unit
          });
        }
      }
    }
    
    return messages;
  };
  
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.dbc')) {
      handleFileSelect(file);
    } else if (file) {
      setParseError('Please upload a .dbc file');
    }
  };
  
  const importMessage = (message) => {
    // Check if message ID already exists
    const exists = config.messages.some(m => m.id === message.id);
    
    if (exists) {
      if (!confirm(`A message with ID ${message.id} already exists. Replace it?`)) {
        return;
      }
      
      // Filter out existing message with same ID
      const filteredMessages = config.messages.filter(m => m.id !== message.id);
      updateConfig('messages', [...filteredMessages, message]);
    } else {
      updateConfig('messages', [...config.messages, message]);
    }
  };
  
  const importAllMessages = () => {
    // Check for duplicates
    const existingIds = new Set(config.messages.map(m => m.id));
    const newMessages = dbcSignals.filter(m => !existingIds.has(m.id));
    const duplicates = dbcSignals.filter(m => existingIds.has(m.id));
    
    if (duplicates.length > 0) {
      if (confirm(`${duplicates.length} messages have duplicate IDs. Replace existing messages?`)) {
        // Replace all duplicates
        const filteredMessages = config.messages.filter(m => !dbcSignals.some(dbcMsg => dbcMsg.id === m.id));
        updateConfig('messages', [...filteredMessages, ...dbcSignals]);
      } else {
        // Only add non-duplicates
        updateConfig('messages', [...config.messages, ...newMessages]);
      }
    } else {
      // No duplicates, add all
      updateConfig('messages', [...config.messages, ...dbcSignals]);
    }
  };
  
  return (
    <div className="p-6 bg-white rounded-md shadow-sm">
      <h2 className="text-2xl font-bold mb-4">Step 4: DBC File Parser</h2>
      
      <div className="mb-6">
        <div
          className={`border-2 border-dashed rounded-md p-8 text-center ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div className="mt-4 flex text-sm text-gray-600 justify-center">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
            >
              <span>Upload a DBC file</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".dbc"
                onChange={handleFileInputChange}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">DBC files only (max. 10MB)</p>
          
          {config.dbcFile && (
            <div className="mt-4 text-sm text-gray-900">
              Selected file: <span className="font-medium">{config.dbcFile.name}</span>
            </div>
          )}
        </div>
        
        {parseError && (
          <div className="mt-2 text-sm text-red-600">
            {parseError}
          </div>
        )}
      </div>
      
      {isProcessing && (
        <div className="my-6">
          <LoadingSpinner text="Processing DBC file..." />
        </div>
      )}
      
      {dbcSignals.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">Parsed Messages ({dbcSignals.length})</h3>
            <button
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              onClick={importAllMessages}
            >
              Import All
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message ID
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message Name
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DLC
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signals
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dbcSignals.map((message, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {message.id}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {message.name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {message.dlc} bytes
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {message.signals.length} ({message.signals.map(s => s.name).join(', ')})
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => importMessage(message)}
                      >
                        Import
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Signal Details Section */}
          {dbcSignals.length > 0 && dbcSignals[0].signals.length > 0 && (
            <div className="mt-4 bg-gray-50 p-4 rounded-md">
              <h4 className="text-md font-medium text-gray-900 mb-2">Signal Details for {dbcSignals[0].name}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Bit
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Length
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Byte Order
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Signed
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Factor
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Offset
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dbcSignals[0].signals.map((signal, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {signal.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {signal.startBit}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {signal.length}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {signal.byteOrder}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {signal.isSigned ? 'Yes' : 'No'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {signal.factor}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {signal.offset}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {signal.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
      <button
          onClick={onPrevious}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          disabled={isProcessing}
        >
          Previous
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={isProcessing}
        >
          {config.dbcFile ? 'Next' : 'Skip (No DBC File)'}
        </button>
      </div>
    </div>
  );
}