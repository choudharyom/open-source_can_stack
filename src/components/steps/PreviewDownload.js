// src/components/steps/PreviewDownload.js
export default function PreviewDownload({ config, onPrevious }) {
    // Placeholder for download functionality
    const handleDownload = () => {
      alert('Download functionality to be implemented');
      // TODO: Implement ZIP generation with files from CodePreview
    };
  
    // List of generated files (matching CodePreview.js)
    const generatedFiles = [
      { name: 'main.c', description: 'Main application code initializing the CAN driver' },
      { name: 'can_cfg.h', description: 'Configuration header for CAN settings' },
      { name: 'can_driver.c', description: 'CAN driver implementation' },
      { name: 'can_driver.h', description: 'CAN driver header with API definitions' },
      { name: 'project.json', description: 'Project configuration and message definitions' },
    ];
  
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Preview & Download</h2>
        <div className="space-y-6">
          {/* Configuration Summary */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Configuration Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="summary-item">
                <span className="summary-label font-semibold text-gray-700 text-sm">Target MCU:</span>
                <span className="summary-value ml-2 text-gray-600 text-sm">{config.mcu || 'Not selected'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label font-semibold text-gray-700 text-sm">Operating System:</span>
                <span className="summary-value ml-2 text-gray-600 text-sm">{config.os || 'None'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label font-semibold text-gray-700 text-sm">CAN FD:</span>
                <span className="summary-value ml-2 text-gray-600 text-sm">{config.canFD ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label font-semibold text-gray-700 text-sm">ISO-TP:</span>
                <span className="summary-value ml-2 text-gray-600 text-sm">{config.isoTP ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label font-semibold text-gray-700 text-sm">Protocol:</span>
                <span className="summary-value ml-2 text-gray-600 text-sm">{config.protocol || 'Not selected'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label font-semibold text-gray-700 text-sm">DBC File:</span>
                <span className="summary-value ml-2 text-gray-600 text-sm">{config.dbcFile ? config.dbcFile.name : 'None'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label font-semibold text-gray-700 text-sm">Messages:</span>
                <span className="summary-value ml-2 text-gray-600 text-sm">{config.messages.length} defined</span>
              </div>
            </div>
          </div>
  
          {/* Generated Files */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Generated Files</h3>
            <ul className="space-y-3">
              {generatedFiles.map((file) => (
                <li key={file.name} className="flex items-start">
                  <i className="fas fa-file-code text-blue-500 mt-1 mr-3"></i>
                  <div>
                    <span className="font-medium text-gray-800 text-sm">{file.name}</span>
                    <p className="text-gray-600 text-sm">{file.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
  
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownload}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Download ZIP
            </button>
            <button
              onClick={onPrevious}
              className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }