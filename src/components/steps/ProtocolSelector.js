export default function ProtocolSelector({ config, updateConfig, onNext, onPrevious }) {
    const protocols = [
      {
        id: 'CAN',
        name: 'Basic CAN',
        description: 'Standard CAN protocol with basic message transmission and reception.',
        suitableFor: 'Simple data exchange between ECUs',
        complexity: 'Low'
      },
      {
        id: 'CANopen',
        name: 'CANopen',
        description: 'Higher-layer protocol for industrial automation and embedded systems.',
        suitableFor: 'Industrial applications, machine control',
        complexity: 'Medium'
      },
      {
        id: 'J1939',
        name: 'SAE J1939',
        description: 'Protocol for commercial vehicles with standardized parameter groups.',
        suitableFor: 'Heavy-duty vehicles, trucks, buses',
        complexity: 'Medium'
      },
      {
        id: 'UDS',
        name: 'UDS (ISO 14229)',
        description: 'Unified Diagnostic Services for vehicle diagnostics.',
        suitableFor: 'Diagnostic applications, ECU testing',
        complexity: 'High'
      }
    ];
    
    return (
      <div className="p-6 bg-white rounded-md shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Step 3: Choose Protocol Layer</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {protocols.map((protocol) => (
            <div
              key={protocol.id}
              className={`border rounded-md p-4 cursor-pointer transition ${
                config.protocol === protocol.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
              onClick={() => updateConfig('protocol', protocol.id)}
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
              <p className="text-xs text-gray-700">
                <span className="font-semibold">Best for:</span> {protocol.suitableFor}
              </p>
            </div>
          ))}
        </div>
        
        {config.protocol && (
          <div className="mb-6 bg-blue-50 p-4 rounded-md">
            <h3 className="text-md font-semibold text-blue-800 mb-2">
              Configuration Notes: {protocols.find(p => p.id === config.protocol)?.name}
            </h3>
            <p className="text-sm text-blue-700">
              {config.protocol === 'CAN' && 'Basic CAN implementation will include message filtering and basic error handling.'}
              {config.protocol === 'CANopen' && 'CANopen implementation will include SDO, PDO, SYNC, and NMT protocols.'}
              {config.protocol === 'J1939' && 'J1939 implementation will include PGN handling, address claiming, and transport protocol.'}
              {config.protocol === 'UDS' && 'UDS implementation will include diagnostic session control, ECU reset, and security access services.'}
            </p>
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
            onClick={onNext}
            disabled={!config.protocol}
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
  