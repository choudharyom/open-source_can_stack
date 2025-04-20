import { useState } from 'react';

export default function MessageEditor({ config, updateConfig, onNext, onPrevious }) {
  console.log('[MessageEditor] Rendering with config:', config); // Log props on render
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [messageForm, setMessageForm] = useState({
    id: '',
    name: '',
    dlc: 8,
    cycleTime: 100,
    signals: []
  });
  
  // Add new message
  const handleAddMessage = () => {
    setMessageForm({
      id: '',
      name: '',
      dlc: 8,
      cycleTime: 100,
      signals: []
    });
    setEditMode(true);
    setSelectedMessageIndex(null);
  };
  
  // Edit existing message
  const handleEditMessage = (index) => {
    const message = config.messages[index];
    setMessageForm({
      id: message.id,
      name: message.name,
      dlc: message.dlc || 8,
      cycleTime: message.cycleTime || 100,
      signals: message.signals || []
    });
    setEditMode(true);
    setSelectedMessageIndex(index);
  };
  
  // Delete message
  const handleDeleteMessage = (index) => {
    if (confirm('Are you sure you want to delete this message?')) {
      const updatedMessages = [...config.messages];
      updatedMessages.splice(index, 1);
      updateConfig('messages', updatedMessages);
    }
  };
  
  // Update form fields
  const updateFormField = (field, value) => {
    setMessageForm({
      ...messageForm,
      [field]: value
    });
  };
  
  // Save message
  const saveMessage = () => {
    // Validate form
    if (!messageForm.id || !messageForm.name) {
      alert('Message ID and name are required');
      return;
    }
    
    // Check if ID is in valid format
    if (!/^0x[0-9A-Fa-f]{1,8}$/.test(messageForm.id)) {
      alert('Message ID must be in hexadecimal format (e.g., 0x100)');
      return;
    }
    
    const updatedMessages = [...config.messages];
    
    if (selectedMessageIndex !== null) {
      // Update existing message
      updatedMessages[selectedMessageIndex] = messageForm;
    } else {
      // Add new message
      updatedMessages.push(messageForm);
    }
    
    updateConfig('messages', updatedMessages);
    setEditMode(false);
    setSelectedMessageIndex(null);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditMode(false);
    setSelectedMessageIndex(null);
  };
  
  // Add signal to current message
  const addSignal = () => {
    const newSignal = {
      name: `Signal_${messageForm.signals.length + 1}`,
      startBit: 0,
      length: 8,
      isSigned: false,
      factor: 1,
      offset: 0,
      unit: ''
    };
    
    setMessageForm({
      ...messageForm,
      signals: [...messageForm.signals, newSignal]
    });
  };
  
  // Delete signal
  const deleteSignal = (index) => {
    const updatedSignals = [...messageForm.signals];
    updatedSignals.splice(index, 1);
    setMessageForm({
      ...messageForm,
      signals: updatedSignals
    });
  };
  
  // Update signal
  const updateSignal = (index, field, value) => {
    const updatedSignals = [...messageForm.signals];
    updatedSignals[index] = {
      ...updatedSignals[index],
      [field]: value
    };
    setMessageForm({
      ...messageForm,
      signals: updatedSignals
    });
  };
  
  return (
    <div className="p-6 bg-white rounded-md shadow-sm">
      <h2 className="text-2xl font-bold mb-4">Step 5: Message Editor</h2>
      
      <div className="flex justify-between mb-4">
        <button
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
          onClick={handleAddMessage}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Message
        </button>
        
        <div className="flex space-x-2">
          <button 
            className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 flex items-center"
            onClick={() => alert('Import functionality coming soon')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Import
          </button>
          <button 
            className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 flex items-center"
            onClick={() => alert('Export functionality coming soon')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Export
          </button>
        </div>
      </div>
      
      {!editMode ? (
        // Message List View
        <div className="mb-6 overflow-x-auto">
          {config.messages.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="mt-2 text-gray-500">No messages defined yet. Click "Add Message" to create one.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signals
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DLC
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cycle Time
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {config.messages.map((message, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {message.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {message.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {message.signals?.length || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {message.dlc || 8} bytes
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {message.cycleTime || 100} ms
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => handleEditMessage(index)}
                        >
                          Edit
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteMessage(index)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        // Message Edit Form
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            {selectedMessageIndex !== null ? 'Edit Message' : 'Add New Message'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-4">
                <label htmlFor="message-id" className="block text-sm font-medium text-gray-700 mb-1">
                  Message ID (hex)
                </label>
                <input
                  type="text"
                  id="message-id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 0x100"
                  value={messageForm.id}
                  onChange={(e) => updateFormField('id', e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">Enter in hexadecimal format (e.g., 0x100)</p>
              </div>
              <div className="mb-4">
                <label htmlFor="message-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Message Name
                </label>
                <input
                  type="text"
                  id="message-name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Engine Status"
                  value={messageForm.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label htmlFor="message-dlc" className="block text-sm font-medium text-gray-700 mb-1">
                    DLC (bytes)
                  </label>
                  <select
                    id="message-dlc"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={messageForm.dlc}
                    onChange={(e) => updateFormField('dlc', parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                    {config.canFD && [12, 16, 20, 24, 32, 48, 64].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="message-cycle" className="block text-sm font-medium text-gray-700 mb-1">
                    Cycle Time (ms)
                  </label>
                  <input
                    type="number"
                    id="message-cycle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 100"
                    value={messageForm.cycleTime}
                    onChange={(e) => updateFormField('cycleTime', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700">Signal Layout</h4>
                <button
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                  onClick={addSignal}
                >
                  Add Signal
                </button>
              </div>
              
              <div className="grid grid-cols-8 gap-1 mb-4">
                {Array.from({ length: messageForm.dlc * 8 }, (_, i) => {
                  // Find if this bit is used in any signal
                  const signalIndex = messageForm.signals.findIndex(signal => 
                    i >= signal.startBit && i < signal.startBit + signal.length
                  );
                  
                  const signalColor = signalIndex >= 0 ? [
                    'bg-green-100', 'bg-blue-100', 'bg-yellow-100', 
                    'bg-purple-100', 'bg-pink-100', 'bg-indigo-100'
                  ][signalIndex % 6] : 'bg-gray-100';
                  
                  return (
                    <div
                      key={i}
                      className={`h-6 border border-gray-300 rounded-sm flex items-center justify-center text-xs cursor-pointer ${signalColor}`}
                      title={signalIndex >= 0 ? `${messageForm.signals[signalIndex].name} (Bit ${i})` : `Bit ${i}`}
                    >
                      {i}
                    </div>
                  );
                })}
              </div>
              
              {messageForm.signals.length > 0 ? (
                <div className="max-h-48 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-xs text-gray-500">Name</th>
                        <th className="px-2 py-1 text-xs text-gray-500">Start</th>
                        <th className="px-2 py-1 text-xs text-gray-500">Length</th>
                        <th className="px-2 py-1 text-xs text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {messageForm.signals.map((signal, index) => (
                        <tr key={index}>
                          <td className="px-2 py-1 text-xs">
                            <input
                              type="text"
                              className="w-full px-1 py-0.5 border border-gray-300 rounded-sm"
                              value={signal.name}
                              onChange={(e) => updateSignal(index, 'name', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1 text-xs">
                            <input
                              type="number"
                              className="w-full px-1 py-0.5 border border-gray-300 rounded-sm"
                              value={signal.startBit}
                              min={0}
                              max={messageForm.dlc * 8 - 1}
                              onChange={(e) => updateSignal(index, 'startBit', parseInt(e.target.value))}
                            />
                          </td>
                          <td className="px-2 py-1 text-xs">
                            <input
                              type="number"
                              className="w-full px-1 py-0.5 border border-gray-300 rounded-sm"
                              value={signal.length}
                              min={1}
                              max={messageForm.dlc * 8}
                              onChange={(e) => updateSignal(index, 'length', parseInt(e.target.value))}
                            />
                          </td>
                          <td className="px-2 py-1 text-xs">
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() => deleteSignal(index)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">No signals defined</p>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={cancelEditing}
              className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={saveMessage}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Save Message
            </button>
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
          Next
        </button>
      </div>
    </div>
  );
}
