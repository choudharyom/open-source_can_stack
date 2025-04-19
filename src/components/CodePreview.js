// src/components/CodePreview.js
import { useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c'; // Include C language support
import 'prismjs/components/prism-json'; // Include JSON language support
import codeGenerator from '../utils/codeGenerator'; // Import the default export

export default function CodePreview({ config }) {
  const [selectedFile, setSelectedFile] = useState('main.c');
  const [files, setFiles] = useState([]);
  const [codeContent, setCodeContent] = useState({});

  useEffect(() => {
    // Generate the code when config changes
    if (config.mcu && config.os) {
      const generatedCode = codeGenerator.generateCode(config); // Use the function from the default export
      setCodeContent(generatedCode);
      
      // Update file list
      const fileNames = Object.keys(generatedCode);
      setFiles(fileNames.map(name => ({
        name,
        language: name.endsWith('.c') || name.endsWith('.h') ? 'c' : 
                  name.endsWith('.md') ? 'markdown' : 'plaintext'
      })));
      
      // Select a default file
      if (fileNames.includes('main.c')) {
        setSelectedFile('main.c');
      } else if (fileNames.length > 0) {
        setSelectedFile(fileNames[0]);
      }
    }
  }, [config]);
  
  useEffect(() => {
    // Highlight the code when selected file changes
    Prism.highlightAll();
  }, [selectedFile, codeContent]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-gray-200 bg-gray-100 overflow-x-auto">
        {files.map((file) => (
          <button
            key={file.name}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
              selectedFile === file.name
                ? 'bg-white border-t border-l border-r border-gray-200 -mb-px'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedFile(file.name)}
          >
            {file.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto bg-white p-4">
        {files.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Configure your CAN stack to preview generated code</p>
          </div>
        ) : (
          <pre className="h-full text-sm font-mono whitespace-pre text-gray-800 overflow-auto">
            {codeContent[selectedFile] || '// No content for this file'}
          </pre>
        )}
      </div>
    </div>
  );
}
