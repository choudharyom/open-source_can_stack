// src/components/CodePreview.js
import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import Prism from 'prismjs';
// Ensure necessary languages are imported for Prism
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
// Import the theme CSS for Prism (adjust path if necessary)
import 'prismjs/themes/prism-okaidia.css'; // Example theme
import codeGenerator from '../utils/codeGenerator';

export default function CodePreview({ config }) {
  const [selectedFile, setSelectedFile] = useState(''); // Default to empty
  const [files, setFiles] = useState([]);
  const [codeContent, setCodeContent] = useState({});
  const codeRef = useRef(null); // Ref for the code element

  useEffect(() => {
    // Generate the code when config changes
    if (config.mcu && config.os) {
      try {
        const generatedCode = codeGenerator.generateCode(config);
        setCodeContent(generatedCode);

        const fileNames = Object.keys(generatedCode);
        setFiles(fileNames.map(name => ({
          name,
          // Determine language for Prism highlighting
          language: name.endsWith('.c') || name.endsWith('.h') ? 'c' :
                    name.endsWith('.md') ? 'markdown' :
                    name.endsWith('.json') ? 'json' :
                    'plaintext' // Fallback language
        })));

        // Select a default file intelligently
        const defaultFile = fileNames.includes('main.c') ? 'main.c' :
                           fileNames.includes('README.md') ? 'README.md' :
                           fileNames.length > 0 ? fileNames[0] : '';
        setSelectedFile(defaultFile);

      } catch (error) {
        console.error("Error generating code:", error);
        // Reset state on error
        setCodeContent({});
        setFiles([]);
        setSelectedFile('');
      }
    } else {
      // Clear state if config is incomplete
      setCodeContent({});
      setFiles([]);
      setSelectedFile('');
    }
  }, [config]); // Rerun when config changes

  // Highlight code when selectedFile or codeContent changes
  useEffect(() => {
    // Ensure the ref is current and the selected file/content exists
    if (codeRef.current && selectedFile && codeContent[selectedFile]) {
      // Use Prism.highlightElement for targeted highlighting
      Prism.highlightElement(codeRef.current);
    }
  }, [selectedFile, codeContent]); // Rerun highlighting when file or content changes

  // Memoize current file details to avoid recalculation on every render
  const currentFile = React.useMemo(() => files.find(f => f.name === selectedFile), [files, selectedFile]);
  const currentLanguage = currentFile?.language || 'plaintext';
  const currentCode = codeContent[selectedFile] || '';

  return (
    <div className="h-full flex flex-col bg-gray-800"> {/* Dark background for code */}
      {/* File Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-900 overflow-x-auto">
        {files.map((file) => (
          <button
            key={file.name}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
              selectedFile === file.name
                ? 'border-blue-500 text-white' // Active tab style
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500' // Inactive tab style
            }`}
            onClick={() => setSelectedFile(file.name)}
          >
            {file.name}
          </button>
        ))}
      </div>

      {/* Code Display Area */}
      <div className="flex-1 overflow-auto p-4">
        {files.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Configure your CAN stack to preview generated code</p>
          </div>
        ) : (
          // Pre and Code elements styled for Prism theme compatibility
          <pre className={`language-${currentLanguage} !bg-transparent !p-0 !m-0 h-full`}>
            <code ref={codeRef} className={`language-${currentLanguage} text-sm`}>
              {currentCode}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
