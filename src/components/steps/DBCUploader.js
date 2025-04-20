"use client"; // Add this if using Next.js

import { useState } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import { validateDBC } from '../../utils/dbcParser';

export default function DBCUploader({ config, updateConfig, onNext, onPrevious }) {
  console.log('[DBCUploader] Rendering with config:', config);
  const [isDragging, setIsDragging] = useState(false);
  const [dbcSignals, setDbcSignals] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parseWarnings, setParseWarnings] = useState([]); // Added
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);

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
    setParseWarnings([]); // Reset warnings

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const validation = validateDBC(content);

        if (validation.valid) {
          setDbcSignals(validation.messages);
          setSelectedMessageIndex(0);
          setParseError(null);
          if (validation.warnings) {
            setParseWarnings(validation.warnings); // Set warnings
          }
        } else {
          setParseError(validation.error);
        }

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

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.dbc')) {
      handleFileSelect(file);
    } else if (file) {
      setParseError('Please upload a .dbc file');
    }
  };

  const importMessage = (message) => {
    const exists = config.messages.some((m) => m.id === message.id);

    if (exists) {
      if (!confirm(`A message with ID ${message.id} already exists. Replace it?`)) {
        return;
      }

      const filteredMessages = config.messages.filter((m) => m.id !== message.id);
      updateConfig('messages', [...filteredMessages, message]);
    } else {
      updateConfig('messages', [...config.messages, message]);
    }
  };

  const importAllMessages = () => {
    const existingIds = new Set(config.messages.map((m) => m.id));
    const newMessages = dbcSignals.filter((m) => !existingIds.has(m.id));
    const duplicates = dbcSignals.filter((m) => existingIds.has(m.id));

    if (duplicates.length > 0) {
      if (
        confirm(
          `${duplicates.length} messages have duplicate IDs. Replace existing messages?`
        )
      ) {
        const filteredMessages = config.messages.filter(
          (m) => !dbcSignals.some((dbcMsg) => dbcMsg.id === m.id)
        );
        updateConfig('messages', [...filteredMessages, ...dbcSignals]);
      } else {
        updateConfig('messages', [...config.messages, ...newMessages]);
      }
    } else {
      updateConfig('messages', [...config.messages, ...dbcSignals]);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-md shadow-sm">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Step 4: DBC File Parser</h2>
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
          <div className="mt-2 text-sm text-red-600">{parseError}</div>
        )}
        {parseWarnings.length > 0 && (
          <div className="mt-2 text-sm text-yellow-600">
            <strong>Warnings:</strong>
            <ul className="list-disc ml-5">
              {parseWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {isProcessing && (
        <div className="flex justify-center my-6">
          <LoadingSpinner text="Processing DBC file..." />
        </div>
      )}
      {dbcSignals.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">
              Parsed Messages ({dbcSignals.length})
            </h3>
            <button
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              onClick={importAllMessages}
            >
              Import All
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Message ID
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Message Name
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      DLC
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Signals
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dbcSignals.map((message, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedMessageIndex === index ? 'bg-blue-50' : ''
                      } ${message.signals.length === 0 && message.dlc > 0 ? 'bg-yellow-50' : ''}`}
                      onClick={() => setSelectedMessageIndex(index)}
                    >
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
                        {message.signals.length}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            importMessage(message);
                          }}
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
          {dbcSignals.length > 0 && dbcSignals[selectedMessageIndex] && (
            <div className="mt-4 bg-blue-50 p-4 rounded-md">
              <h4 className="text-md font-medium text-blue-800 mb-2">
                Signal Details for {dbcSignals[selectedMessageIndex].name} (
                {dbcSignals[selectedMessageIndex].id})
              </h4>
              {dbcSignals[selectedMessageIndex].comments &&
                dbcSignals[selectedMessageIndex].comments.length > 0 && (
                  <div className="mb-3 text-sm text-blue-700 italic border-b border-blue-200 pb-2">
                    <strong>Comment:</strong> {dbcSignals[selectedMessageIndex].comments[0]}
                  </div>
                )}
              {dbcSignals[selectedMessageIndex].signals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Name
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Start Bit
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Length
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Byte Order
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Factor
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Offset
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Min Value
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Max Value
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Unit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dbcSignals[selectedMessageIndex].signals.map((signal, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            <div>{signal.name}</div>
                            {signal.comment && (
                              <div className="text-xs text-gray-500 italic">
                                {signal.comment}
                              </div>
                            )}
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
                            {signal.factor}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {signal.offset}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {signal.minValue}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {signal.maxValue}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {signal.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No signals defined for this message.</p>
              )}
              {dbcSignals[selectedMessageIndex].signals.some(
                (s) => s.valueDefs && s.valueDefs.length > 0
              ) && (
                <div className="mt-4 border-t border-blue-200 pt-3">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    Value Definitions
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dbcSignals[selectedMessageIndex].signals
                      .filter((s) => s.valueDefs && s.valueDefs.length > 0)
                      .map((signal, idx) => (
                        <div key={idx} className="bg-white p-3 rounded shadow-sm">
                          <h6 className="text-sm font-medium mb-1">{signal.name}</h6>
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr>
                                <th className="py-1 px-2 text-left text-gray-500">Value</th>
                                <th className="py-1 px-2 text-left text-gray-500">
                                  Description
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {signal.valueDefs.map((vd, vidx) => (
                                <tr key={vidx} className="border-t border-gray-100">
                                  <td className="py-1 px-2">{vd.value}</td>
                                  <td className="py-1 px-2">{vd.text}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              <div className="mt-4 border-t border-blue-200 pt-3">
                <h5 className="text-sm font-medium text-blue-800 mb-2">Bit Layout</h5>
                <div className="bg-white p-3 rounded shadow-sm overflow-auto">
                  <div className="grid grid-cols-8 gap-1">
                    {Array.from(
                      { length: dbcSignals[selectedMessageIndex].dlc * 8 },
                      (_, i) => {
                        const signalIndex = dbcSignals[selectedMessageIndex].signals.findIndex(
                          (signal) =>
                            i >= signal.startBit && i < signal.startBit + signal.length
                        );
                        const signalColor =
                          signalIndex >= 0
                            ? [
                                'bg-green-100 border-green-300',
                                'bg-blue-100 border-blue-300',
                                'bg-yellow-100 border-yellow-300',
                                'bg-purple-100 border-purple-300',
                                'bg-pink-100 border-pink-300',
                                'bg-indigo-100 border-indigo-300',
                              ][signalIndex % 6]
                            : 'bg-gray-100 border-gray-300';
                        const signalName =
                          signalIndex >= 0
                            ? dbcSignals[selectedMessageIndex].signals[signalIndex].name
                            : '';
                        return (
                          <div
                            key={i}
                            className={`h-8 border rounded-sm flex items-center justify-center text-xs ${signalColor}`}
                            title={
                              signalIndex >= 0 ? `${signalName} (Bit ${i})` : `Bit ${i}`
                            }
                          >
                            {i}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
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