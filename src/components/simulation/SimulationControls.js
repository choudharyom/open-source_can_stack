import { useState } from 'react';
import Tooltip from '../Tooltip';

export default function SimulationControls({ 
  running, 
  speed, 
  statistics, 
  onStart, 
  onStop, 
  onSpeedChange,
  onInjectError,
  protocol
}) {
  const [showErrors, setShowErrors] = useState(false);
  
  // Available error types by protocol
  const errorTypes = {
    'CAN': [
      { id: 'bit', name: 'Bit Error' },
      { id: 'stuff', name: 'Stuff Error' },
      { id: 'crc', name: 'CRC Error' },
      { id: 'form', name: 'Form Error' },
      { id: 'ack', name: 'ACK Error' }
    ],
    'CANopen': [
      { id: 'sdo-timeout', name: 'SDO Timeout' },
      { id: 'heartbeat-lost', name: 'Heartbeat Lost' },
      { id: 'nmt-error', name: 'NMT State Error' }
    ],
    'J1939': [
      { id: 'address-claim', name: 'Address Claim Conflict' },
      { id: 'tp-timeout', name: 'Transport Protocol Timeout' },
      { id: 'bam-error', name: 'BAM Sequence Error' }
    ],
    'UDS': [
      { id: 'negative-response', name: 'Negative Response' },
      { id: 'timeout', name: 'Request Timeout' },
      { id: 'wrong-sequence', name: 'Wrong Sequence Number' }
    ]
  };
  
  // Get protocol-specific error types, fallback to CAN if not available
  const getErrorTypes = () => {
    return errorTypes[protocol] || errorTypes['CAN'];
  };
  
  return (
    <div className="bg-gray-50 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex space-x-2 mb-2 sm:mb-0">
          {!running ? (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              onClick={onStart}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Start Simulation
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
              onClick={onStop}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              Stop Simulation
            </button>
          )}
          
          <div className="flex items-center space-x-2">
            <label htmlFor="sim-speed" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Speed:
            </label>
            <select
              id="sim-speed"
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              disabled={!running}
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
            </select>
          </div>
          
          <div>
            <Tooltip content="Inject errors to test error handling">
              <button
                className="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center text-sm"
                onClick={() => setShowErrors(!showErrors)}
                disabled={!running}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Inject Error
              </button>
            </Tooltip>
          </div>
        </div>
        
        <div className="flex flex-wrap space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <span className="font-medium text-gray-700">Bus Load:</span>
            <span className={`${statistics.busLoad > 80 ? 'text-red-600' : 'text-gray-900'}`}>
              {statistics.busLoad.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-medium text-gray-700">Messages:</span>
            <span className="text-gray-900">{statistics.messageCount}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-medium text-gray-700">Errors:</span>
            <span className={`${statistics.errorCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {statistics.errorCount}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-medium text-gray-700">Throughput:</span>
            <span className="text-gray-900">{statistics.throughput.toFixed(1)} kbit/s</span>
          </div>
        </div>
      </div>
      
      {showErrors && running && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Inject Error</h4>
          <div className="flex flex-wrap gap-2">
            {getErrorTypes().map(error => (
              <button
                key={error.id}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => {
                  onInjectError(error.id);
                  setShowErrors(false);
                }}
              >
                {error.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}