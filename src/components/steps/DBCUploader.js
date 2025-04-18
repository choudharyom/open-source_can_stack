import { useState } from 'react';

export default function DBCUploader({ config, updateConfig, onNext, onPrevious }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dbcSignals, setDbcSignals] = useState([]);
  
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
        alert('Please upload a .dbc file');
      }
    }
  };
  
  const handleFileSelect = (file) => {
    updateConfig('dbcFile', file);
    
    // This is a simulated DBC parsing - in a real app, you would actually parse the file
    setTimeout(() => {
      // Simulated DBC parsing results
      setDbcSignals([
        { id: '0x100', name: 'Engine Status', signals: ['EngineRPM', 'EngineTemp', 'ThrottlePosition'] },
        { id: '0x200', name: 'Vehicle Speed', signals: ['Speed', 'Acceleration'] },
        { id: '0x300', name: 'Battery Status', signals: ['Voltage', 'Current', 'Temperature'] },
        { id: '0x400', name: 'Brake System', signals: ['BrakePressure', 'ABSActive'] },
      ]);
    }, 1000);
  };
  
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.dbc')) {
      handleFileSelect(file);
    } else if (file) {
      alert('Please upload a .dbc file');
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
          <div className="mt-4 flex text-sm text-gray-600">
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
      </div>
      
      {dbcSignals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Parsed Signals</h3>
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
                    Signals
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dbcSignals.map((message) => (
                  <tr key={message.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {message.id}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {message.name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {message.signals.join(', ')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => alert(`Import message ${message.name}`)}
                      >
                        Import
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          onClick={onNext}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {config.dbcFile ? 'Next' : 'Skip (No DBC File)'}
        </button>
      </div>
    </div>
  );
}
