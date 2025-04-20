// src/components/steps/PreviewDownload.js
import { useMemo, useState } from 'react'; // Import useMemo and useState
import LoadingSpinner from '../LoadingSpinner'; // Import LoadingSpinner
// Import the code generator utility
import codeGenerator, { downloadZIP } from '../../utils/codeGenerator'; // Import default export

export default function PreviewDownload({ config, onPrevious }) {
    console.log('[PreviewDownload] Rendering with config:', config); // Log props on render
    const [isGenerating, setIsGenerating] = useState(false); // Moved useState inside the component

    // Function to handle the download process
    const handleDownload = async () => {
      setIsGenerating(true);
      try {
        const success = await downloadZIP(config);
        if (success) {
          alert('Your CAN stack has been successfully generated and downloaded!');
        } else {
          alert('Error generating CAN stack. Please try again.');
        }
      } catch (error) {
        console.error('Download error:', error);
        alert('Error generating CAN stack. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    };

    // Dynamically generate the list of files based on the config
    const generatedFiles = useMemo(() => {
      if (config.mcu && config.os) {
        try {
          const filesObject = codeGenerator.generateCode(config);
          return Object.keys(filesObject).map(name => ({
            name,
            // Basic description based on file type, can be enhanced later
            description: name.endsWith('.c') ? 'C source file' :
                         name.endsWith('.h') ? 'C header file' :
                         name.endsWith('.md') ? 'Markdown documentation' :
                         'Generated file'
          }));
        } catch (error) {
          console.error("Error generating file list:", error);
          return []; // Return empty list on error
        }
      }
      return []; // Return empty list if config is incomplete
    }, [config]); // Recalculate only when config changes
  
    // Render the preview and download section
    // This section will show the configuration summary and generated files
    // and provide buttons to download the generated code or go back to the previous step
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

          {/* Generated Files: This would be dynamically generated in a real application */}
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
          
          {/* This section will show the messages defined in the DBC file */}
          {/* If no messages are defined, it will show a message indicating that */}
          {/* If messages are defined, it will list them with their IDs and signal counts */}
          {config.messages.length > 0 && (
          <div className="bg-gray-100 p-4 rounded-md">
            <h3 className="text-lg font-semibold mb-2">Defined Messages</h3>
            <ul className="list-disc pl-5">
              {config.messages.map((message, index) => (
                <li key={index}>
                  <span className="font-medium">{message.name}</span> ({message.id}) - 
                  {message.signals && message.signals.length > 0 
                    ? ` ${message.signals.length} signals` 
                    : ' No signals'}
                </li>
              ))}
            </ul>
          </div>
        )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="small" text={null} />
                  <span>Generating ZIP...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Download ZIP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
