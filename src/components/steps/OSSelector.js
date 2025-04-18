export default function OSSelector({ config, updateConfig, onNext, onPrevious }) {
    return (
      <div className="p-6 bg-white rounded-md shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Step 2: Select OS & Stack Type</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Operating System
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Bare-metal', 'FreeRTOS', 'AUTOSAR'].map((os) => (
              <div 
                key={os}
                className={`border rounded-md p-4 cursor-pointer ${
                  config.os === os 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
                onClick={() => updateConfig('os', os)}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    checked={config.os === os}
                    onChange={() => updateConfig('os', os)}
                  />
                  <label className="ml-3 block text-sm font-medium text-gray-700">
                    {os}
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {os === 'Bare-metal' && 'Direct hardware access with no OS. Simplest implementation with minimal overhead.'}
                  {os === 'FreeRTOS' && 'Popular RTOS for embedded systems with task scheduling and synchronization.'}
                  {os === 'AUTOSAR' && 'Automotive Open System Architecture. Standardized software architecture for ECUs.'}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Additional Options
          </label>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="canfd"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={config.canFD}
                onChange={(e) => updateConfig('canFD', e.target.checked)}
              />
              <label htmlFor="canfd" className="ml-3 block text-sm font-medium text-gray-700">
                Enable CAN FD (Flexible Data Rate)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="isotp"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={config.isoTP}
                onChange={(e) => updateConfig('isoTP', e.target.checked)}
              />
              <label htmlFor="isotp" className="ml-3 block text-sm font-medium text-gray-700">
                Enable ISO-TP (ISO 15765-2 Transport Protocol)
              </label>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between">
          <button
            onClick={onPrevious}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={!config.os}
            className={`px-4 py-2 rounded-md ${
              config.os
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
  