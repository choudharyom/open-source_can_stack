// src/components/CodePreview.js
import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import Prism from 'prismjs';
// Ensure necessary languages are imported for Prism
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
// Import the theme CSS for Prism (adjust path if necessary)
import 'prismjs/themes/prism-okaidia.css'; // Example theme
import dynamic from 'next/dynamic';
import LoadingSpinner from './LoadingSpinner';
import codeGenerator from '../utils/codeGenerator'; // Import the default export object

// Dynamically load Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  { ssr: false, loading: () => <LoadingSpinner text="Loading editor..." /> }
);

export default function CodePreview({ config }) {
  const [selectedFile, setSelectedFile] = useState('main.c');
  const [files, setFiles] = useState([]);
  const [codeContent, setCodeContent] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const codeRef = useRef(null); // Ref for the code element

  useEffect(() => {
    // Generate the code when config changes
    if (config.mcu && config.os) {
      setIsGenerating(true);
      
      // Use setTimeout to avoid blocking UI
      setTimeout(() => {
        try {
          // Access the generateCode function from the imported object
          const generatedCode = codeGenerator.generateCode(config); 
          setCodeContent(generatedCode);
          
          // Update file list
          const fileNames = Object.keys(generatedCode);
          setFiles(fileNames.map(name => ({
            name,
            language: getLanguageForFile(name)
          })));
          
          // Select a default file
          if (fileNames.includes('main.c')) {
            setSelectedFile('main.c');
          } else if (fileNames.length > 0) {
            setSelectedFile(fileNames[0]);
          }
        } catch (error) {
			console.error("Error generating code:", error);
			// Reset state on error
			setCodeContent({});
			setFiles([]);
			setSelectedFile('');
        } finally {
          setIsGenerating(false);
        }
      }, 100);
    } else {
      // Clear state if config is incomplete
      setCodeContent({});
      setFiles([]);
      setSelectedFile('');
    }
  }, [config]);
  
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

  const getLanguageForFile = (filename) => {
    if (filename.endsWith('.c') || filename.endsWith('.h')) return 'c';
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.txt')) return 'plaintext';
    return 'plaintext';
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between bg-gray-100 border-b border-gray-200 px-2">
        <div className="flex overflow-x-auto hide-scrollbar">
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
        <div className="flex-shrink-0 text-xs text-gray-500 px-2">
          {isGenerating ? 'Generating code...' : 'Generated code'}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {isGenerating ? (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner text="Generating code..." />
          </div>
        ) : files.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Configure your CAN stack to preview generated code</p>
          </div>
        ) : (
          <MonacoEditor
            height="100%"
            language={files.find(f => f.name === selectedFile)?.language || 'c'}
            theme="vs-light"
            value={codeContent[selectedFile] || '// No content for this file'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              wordWrap: 'on'
            }}
          />
        )}
      </div>
    </div>
  );
}
