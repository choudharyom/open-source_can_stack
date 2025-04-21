import { useState, useEffect } from 'react';
import FormField from '../FormField';
import Tooltip from '../Tooltip';
import LoadingSpinner from '../LoadingSpinner';

export default function J1939Configuration({ config, updateConfig }) {
  const [activeTab, setActiveTab] = useState('pgn');
  const [editingPgn, setEditingPgn] = useState(null);
  const [editingSpn, setEditingSpn] = useState(null);
  const [currentPgnIndex, setCurrentPgnIndex] = useState(null);
  
  const [newPgn, setNewPgn] = useState({
    pgn: '',
    name: '',
    length: 8,
    transmitRate: 1000,
    priority: 6,
    description: '',
    spns: []
  });
  
  const [newSpn, setNewSpn] = useState({
    spn: '',
    name: '',
    startBit: 0,
    length: 8,
    resolution: 1,
    offset: 0,
    units: '',
    description: ''
  });

  // Default PGNs for common automotive parameters
  const defaultPgns = [
    {
      pgn: '0xF004',
      name: 'Electronic Engine Controller 1',
      length: 8,
      transmitRate: 100,
      priority: 3,
      description: 'Engine related parameters',
      spns: [
        {
          spn: '190',
          name: 'Engine Speed',
          startBit: 24,
          length: 16,
          resolution: 0.125,
          offset: 0,
          units: 'rpm',
          description: 'Actual engine speed'
        },
        {
          spn: '513',
          name: 'Actual Engine - Percent Torque',
          startBit: 8,
          length: 8,
          resolution: 1,
          offset: -125,
          units: '%',
          description: "Driver's demand engine - percent torque"
        }
      ]
    },
    {
      pgn: '0xFEF1',
      name: 'Cruise Control/Vehicle Speed',
      length: 8,
      transmitRate: 100,
      priority: 3,
      description: 'Vehicle speed and cruise control status',
      spns: [
        {
          spn: '84',
          name: 'Wheel-Based Vehicle Speed',
          startBit: 8,
          length: 16,
          resolution: 0.00390625,
          offset: 0,
          units: 'km/h',
          description: 'Wheel-based vehicle speed'
        }
      ]
    }
  ];
  
  // J1939 configuration from main config
  const j1939Config = config.protocolConfig?.j1939 || {
    preferredAddress: 128,
    enableAddressClaiming: true,
    industryGroup: 0,
    vehicleSystem: 0,
    vehicleSystemInstance: 0,
    function: 0,
    functionInstance: 0,
    ecuInstance: 0,
    manufacturerCode: 0,
    identityNumber: 0,
    pgns: defaultPgns
  };
  
  // Save J1939 configuration back to main config
  const saveJ1939Config = (newConfig) => {
    const currentProtocolConfig = config.protocolConfig || {};
    updateConfig('protocolConfig', {
      ...currentProtocolConfig,
      j1939: newConfig
    });
  };
    
  // Initialize config with default PGNs if none exist
  useEffect(() => {
    if (!j1939Config.pgns || j1939Config.pgns.length === 0) {
      saveJ1939Config({
        ...j1939Config,
        pgns: defaultPgns
      });
    }
  }, []);
  
  // Add or update PGN
  const savePgn = () => {
    // Validate PGN
    if (!newPgn.pgn || !newPgn.name) {
      alert('PGN and Name are required fields');
      return;
    }
    
    // Ensure PGN is in hex format
    if (!/^0x[0-9A-Fa-f]{1,5}$/.test(newPgn.pgn)) {
      alert('PGN must be in hexadecimal format (e.g., 0xF004)');
      return;
    }
    
    let updatedPgns;
    
    if (editingPgn !== null) {
      // Update existing PGN
      updatedPgns = [...j1939Config.pgns];
      updatedPgns[editingPgn] = { ...newPgn };
    } else {
      // Check if PGN already exists
      const pgnExists = j1939Config.pgns.some(p => p.pgn === newPgn.pgn);
      
      if (pgnExists) {
        if (!confirm(`A PGN with ID ${newPgn.pgn} already exists. Replace it?`)) {
          return;
        }
        
        // Replace existing PGN
        updatedPgns = j1939Config.pgns.map(p => 
          p.pgn === newPgn.pgn ? { ...newPgn } : p
        );
      } else {
        // Add new PGN
        updatedPgns = [...j1939Config.pgns, { ...newPgn }];
      }
    }
    
    // Sort PGNs by ID
    updatedPgns.sort((a, b) => {
      const aValue = parseInt(a.pgn, 16);
      const bValue = parseInt(b.pgn, 16);
      return aValue - bValue;
    });
    
    saveJ1939Config({
      ...j1939Config,
      pgns: updatedPgns
    });
    
    // Reset form and state
    setNewPgn({
      pgn: '',
      name: '',
      length: 8,
      transmitRate: 1000,
      priority: 6,
      description: '',
      spns: []
    });
    
    setEditingPgn(null);
    setActiveTab('pgn');
  };
  
  // Add or update SPN for current PGN
  const saveSpn = () => {
    // Validate SPN
    if (!newSpn.spn || !newSpn.name) {
      alert('SPN and Name are required fields');
      return;
    }
    
    // Ensure a PGN is selected
    if (currentPgnIndex === null) {
      alert('Please select a PGN first');
      return;
    }
    
    // Get the current PGN
    const currentPgn = { ...j1939Config.pgns[currentPgnIndex] };
    let updatedSpns;
    
    if (editingSpn !== null) {
      // Update existing SPN
      updatedSpns = [...currentPgn.spns];
      updatedSpns[editingSpn] = { ...newSpn };
    } else {
      // Check if SPN already exists
      const spnExists = currentPgn.spns.some(s => s.spn === newSpn.spn);
      
      if (spnExists) {
        if (!confirm(`An SPN with ID ${newSpn.spn} already exists in this PGN. Replace it?`)) {
          return;
        }
        
        // Replace existing SPN
        updatedSpns = currentPgn.spns.map(s => 
          s.spn === newSpn.spn ? { ...newSpn } : s
        );
      } else {
        // Add new SPN
        updatedSpns = [...currentPgn.spns, { ...newSpn }];
      }
    }
    
    // Sort SPNs by ID
    updatedSpns.sort((a, b) => {
      const aValue = parseInt(a.spn);
      const bValue = parseInt(b.spn);
      return aValue - bValue;
    });
    
    // Update PGN with new SPNs
    const updatedPgn = {
      ...currentPgn,
      spns: updatedSpns
    };
    
    // Update PGNs array
    const updatedPgns = [...j1939Config.pgns];
    updatedPgns[currentPgnIndex] = updatedPgn;
    
    saveJ1939Config({
      ...j1939Config,
      pgns: updatedPgns
    });
    
    // Reset form and state
    setNewSpn({
      spn: '',
      name: '',
      startBit: 0,
      length: 8,
      resolution: 1,
      offset: 0,
      units: '',
      description: ''
    });
    
    setEditingSpn(null);
    setActiveTab('spn');
  };
  
  // Delete a PGN
  const deletePgn = (index) => {
    if (confirm('Are you sure you want to delete this PGN?')) {
      const updatedPgns = j1939Config.pgns.filter((_, i) => i !== index);
      
      saveJ1939Config({
        ...j1939Config,
        pgns: updatedPgns
      });
      
      if (currentPgnIndex === index) {
        setCurrentPgnIndex(null);
      } else if (currentPgnIndex > index) {
        setCurrentPgnIndex(currentPgnIndex - 1);
      }
      
      if (editingPgn === index) {
        setEditingPgn(null);
        setNewPgn({
          pgn: '',
          name: '',
          length: 8,
          transmitRate: 1000,
          priority: 6,
          description: '',
          spns: []
        });
      }
    }
  };
  
  // Delete an SPN from the current PGN
  const deleteSpn = (index) => {
    if (currentPgnIndex === null) return;
    
    if (confirm('Are you sure you want to delete this SPN?')) {
      const currentPgn = { ...j1939Config.pgns[currentPgnIndex] };
      const updatedSpns = currentPgn.spns.filter((_, i) => i !== index);
      
      // Update PGN with new SPNs
      const updatedPgn = {
        ...currentPgn,
        spns: updatedSpns
      };
      
      // Update PGNs array
      const updatedPgns = [...j1939Config.pgns];
      updatedPgns[currentPgnIndex] = updatedPgn;
      
      saveJ1939Config({
        ...j1939Config,
        pgns: updatedPgns
      });
      
      if (editingSpn === index) {
        setEditingSpn(null);
        setNewSpn({
          spn: '',
          name: '',
          startBit: 0,
          length: 8,
          resolution: 1,
          offset: 0,
          units: '',
          description: ''
        });
      }
    }
  };
  
  // Edit a PGN
  const editPgn = (index) => {
    setEditingPgn(index);
    setNewPgn({ ...j1939Config.pgns[index] });
    setActiveTab('edit-pgn');
  };
  
  // Edit an SPN
  const editSpn = (index) => {
    if (currentPgnIndex === null) return;
    
    setEditingSpn(index);
    setNewSpn({ ...j1939Config.pgns[currentPgnIndex].spns[index] });
    setActiveTab('edit-spn');
  };
  
  // Select a PGN for editing SPNs
  const selectPgn = (index) => {
    setCurrentPgnIndex(index);
    setActiveTab('spn');
  };
  
  // Auto-assign bit positions for SPNs in a PGN
  const autoAssignBits = () => {
    if (currentPgnIndex === null) return;
    
    const currentPgn = { ...j1939Config.pgns[currentPgnIndex] };
    let currentBit = 0;
    
    // Sort SPNs by size (longest first) to optimize bit packing
    const sortedSpns = [...currentPgn.spns].sort((a, b) => b.length - a.length);
    
    // Assign bits
    const updatedSpns = sortedSpns.map(spn => {
      const updatedSpn = { ...spn, startBit: currentBit };
      currentBit += parseInt(spn.length);
      return updatedSpn;
    });
    
    // Check if we exceeded the maximum bits
    if (currentBit > currentPgn.length * 8) {
      alert(`Warning: Total SPN bits (${currentBit}) exceed PGN length (${currentPgn.length * 8} bits)`);
    }
    
    // Update PGN with new SPNs
    const updatedPgn = {
      ...currentPgn,
      spns: updatedSpns
    };
    
    // Update PGNs array
    const updatedPgns = [...j1939Config.pgns];
    updatedPgns[currentPgnIndex] = updatedPgn;
    
    saveJ1939Config({
      ...j1939Config,
      pgns: updatedPgns
    });
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-sm">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'pgn' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('pgn')}
          >
            Parameter Groups
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'spn' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => {
              if (currentPgnIndex !== null) {
                setActiveTab('spn');
              } else {
                alert('Please select a Parameter Group first');
              }
            }}
          >
            Signals (SPNs)
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'edit-pgn' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => {
              setEditingPgn(null);
              setNewPgn({
                pgn: '',
                name: '',
                length: 8,
                transmitRate: 1000,
                priority: 6,
                description: '',
                spns: []
              });
              setActiveTab('edit-pgn');
            }}
          >
            Add/Edit PGN
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'edit-spn' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => {
              if (currentPgnIndex !== null) {
                setEditingSpn(null);
                setNewSpn({
                  spn: '',
                  name: '',
                  startBit: 0,
                  length: 8,
                  resolution: 1,
                  offset: 0,
                  units: '',
                  description: ''
                });
                setActiveTab('edit-spn');
              } else {
                alert('Please select a Parameter Group first');
              }
            }}
          >
            Add/Edit SPN
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'configuration' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('configuration')}
          >
            Configuration
          </button>
        </nav>
      </div>
      
      <div className="p-4">
        {activeTab === 'pgn' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Parameter Group Numbers (PGNs)</h3>
              <button
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                onClick={() => {
                  setEditingPgn(null);
                  setNewPgn({
                    pgn: '',
                    name: '',
                    length: 8,
                    transmitRate: 1000,
                    priority: 6,
                    description: '',
                    spns: []
                  });
                  setActiveTab('edit-pgn');
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add PGN
              </button>
            </div>
            
            {!j1939Config.pgns ? (
              <div className="flex justify-center my-6">
                <LoadingSpinner text="Loading PGNs..." />
              </div>
            ) : j1939Config.pgns.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-gray-500">No Parameter Groups defined yet. Click "Add PGN" to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-gray-50 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PGN
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Length
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Length
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tx Rate
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SPNs
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {j1939Config.pgns.map((pgn, idx) => (
                      <tr key={idx} 
                          className={`hover:bg-gray-50 cursor-pointer ${
                            currentPgnIndex === idx ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => selectPgn(idx)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                          {pgn.pgn}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {pgn.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {pgn.length} bytes
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {pgn.transmitRate} ms
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {pgn.priority}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {pgn.spns ? pgn.spns.length : 0}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                editPgn(idx);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePgn(idx);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'spn' && (
          <div>
            {currentPgnIndex !== null ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Signals for {j1939Config.pgns[currentPgnIndex].name} ({j1939Config.pgns[currentPgnIndex].pgn})
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 flex items-center"
                      onClick={autoAssignBits}
                      title="Automatically assign bit positions to all SPNs in this PGN"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      Auto-Assign Bits
                    </button>
                    <button
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                      onClick={() => {
                        setEditingSpn(null);
                        setNewSpn({
                          spn: '',
                          name: '',
                          startBit: 0,
                          length: 8,
                          resolution: 1,
                          offset: 0,
                          units: '',
                          description: ''
                        });
                        setActiveTab('edit-spn');
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add Signal
                    </button>
                  </div>
                </div>
                
                {j1939Config.pgns[currentPgnIndex].spns && j1939Config.pgns[currentPgnIndex].spns.length > 0 ? (
                  <>
                    <div className="overflow-x-auto bg-gray-50 rounded-md mb-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SPN
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Start Bit
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Length
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Resolution
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Units
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {j1939Config.pgns[currentPgnIndex].spns.map((spn, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                                {spn.spn}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {spn.name}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {spn.startBit}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {spn.length} bits
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {spn.resolution}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {spn.units}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  <button
                                    className="text-blue-600 hover:text-blue-800"
                                    onClick={() => editSpn(idx)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => deleteSpn(idx)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Visual Bit Layout */}
                    <div className="bg-white border border-gray-200 rounded-md p-4">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Signal Bit Layout</h4>
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-8 gap-1 mb-4">
                          {Array.from({ length: j1939Config.pgns[currentPgnIndex].length * 8 }, (_, i) => {
                            // Find if this bit is used in any SPN
                            const spnIndex = j1939Config.pgns[currentPgnIndex].spns.findIndex(spn => 
                              i >= spn.startBit && i < spn.startBit + parseInt(spn.length)
                            );
                            
                            // Assign a color based on the SPN index
                            const spnColor = spnIndex >= 0 ? [
                              'bg-green-100 border-green-300', 
                              'bg-blue-100 border-blue-300', 
                              'bg-yellow-100 border-yellow-300', 
                              'bg-purple-100 border-purple-300', 
                              'bg-pink-100 border-pink-300', 
                              'bg-indigo-100 border-indigo-300'
                            ][spnIndex % 6] : 'bg-gray-100 border-gray-300';
                            
                            // Get the SPN name for the tooltip
                            const spnName = spnIndex >= 0 ? 
                              j1939Config.pgns[currentPgnIndex].spns[spnIndex].name : '';
                            
                            return (
                              <div
                                key={i}
                                className={`h-8 border rounded-sm flex items-center justify-center text-xs ${spnColor}`}
                                title={spnIndex >= 0 ? `${spnName} (Bit ${i})` : `Bit ${i}`}
                              >
                                {i}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Byte order: Little-endian (LSB first)
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="mt-2 text-gray-500">No signals defined for this Parameter Group yet. Click "Add Signal" to create one.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                <p className="mt-2 text-gray-500">Please select a Parameter Group first to view and edit signals.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'edit-pgn' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingPgn !== null ? 'Edit Parameter Group' : 'Add New Parameter Group'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="PGN (hex)"
                  id="pgn"
                  tooltip="The Parameter Group Number in hexadecimal format (e.g., 0xF004)"
                  required
                >
                  <input
                    type="text"
                    id="pgn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 0xF004"
                    value={newPgn.pgn}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value.startsWith('0x')) {
                        value = '0x' + value.substring(2).replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                      } else {
                        value = '0x' + value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                      }
                      setNewPgn({
                        ...newPgn,
                        pgn: value
                      });
                    }}
                  />
                </FormField>
                
                <FormField
                  label="Name"
                  id="pgn-name"
                  tooltip="A descriptive name for the Parameter Group"
                  required
                >
                  <input
                    type="text"
                    id="pgn-name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Electronic Engine Controller 1"
                    value={newPgn.name}
                    onChange={(e) => setNewPgn({
                      ...newPgn,
                      name: e.target.value
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Length (bytes)"
                  id="pgn-length"
                  tooltip="The data length in bytes (1-1785)"
                  required
                >
                  <input
                    type="number"
                    id="pgn-length"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max="1785"
                    value={newPgn.length}
                    onChange={(e) => setNewPgn({
                      ...newPgn,
                      length: Math.max(1, Math.min(1785, parseInt(e.target.value) || 8))
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Transmit Rate (ms)"
                  id="pgn-rate"
                  tooltip="The transmission interval in milliseconds"
                  required
                >
                  <input
                    type="number"
                    id="pgn-rate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="10"
                    step="10"
                    value={newPgn.transmitRate}
                    onChange={(e) => setNewPgn({
                      ...newPgn,
                      transmitRate: Math.max(10, parseInt(e.target.value) || 1000)
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Priority"
                  id="pgn-priority"
                  tooltip="The message priority (0-7, lower is higher priority)"
                  required
                >
                  <input
                    type="number"
                    id="pgn-priority"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max="7"
                    value={newPgn.priority}
                    onChange={(e) => setNewPgn({
                      ...newPgn,
                      priority: Math.max(0, Math.min(7, parseInt(e.target.value) || 6))
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    0 = Highest priority, 7 = Lowest priority
                  </p>
                </FormField>
                
                <div className="md:col-span-2">
                  <FormField
                    label="Description"
                    id="pgn-description"
                    tooltip="A description of the Parameter Group's purpose and usage"
                  >
                    <textarea
                      id="pgn-description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter a description..."
                      value={newPgn.description}
                      onChange={(e) => setNewPgn({
                        ...newPgn,
                        description: e.target.value
                      })}
                    ></textarea>
                  </FormField>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  onClick={() => {
                    setEditingPgn(null);
                    setNewPgn({
                      pgn: '',
                      name: '',
                      length: 8,
                      transmitRate: 1000,
                      priority: 6,
                      description: '',
                      spns: []
                    });
                    setActiveTab('pgn');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={savePgn}
                  disabled={!newPgn.pgn || !newPgn.name}
                >
                  {editingPgn !== null ? 'Update PGN' : 'Add PGN'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'edit-spn' && currentPgnIndex !== null && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingSpn !== null ? 'Edit Signal' : 'Add New Signal'} for {j1939Config.pgns[currentPgnIndex].name}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="SPN"
                  id="spn"
                  tooltip="The Suspect Parameter Number (SPN)"
                  required
                >
                  <input
                    type="text"
                    id="spn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 190"
                    value={newSpn.spn}
                    onChange={(e) => setNewSpn({
                      ...newSpn,
                      spn: e.target.value.replace(/[^0-9]/g, '')
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Name"
                  id="spn-name"
                  tooltip="A descriptive name for the signal"
                  required
                >
                  <input
                    type="text"
                    id="spn-name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Engine Speed"
                    value={newSpn.name}
                    onChange={(e) => setNewSpn({
                      ...newSpn,
                      name: e.target.value
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Start Bit"
                  id="spn-startbit"
                  tooltip="The starting bit position (0-based)"
                  required
                >
                  <input
                    type="number"
                    id="spn-startbit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max={(j1939Config.pgns[currentPgnIndex].length * 8) - 1}
                    value={newSpn.startBit}
                    onChange={(e) => setNewSpn({
                      ...newSpn,
                      startBit: Math.max(0, Math.min((j1939Config.pgns[currentPgnIndex].length * 8) - 1, parseInt(e.target.value) || 0))
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Length (bits)"
                  id="spn-length"
                  tooltip="The length in bits (1-64)"
                  required
                >
                  <input
                    type="number"
                    id="spn-length"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    max="64"
                    value={newSpn.length}
                    onChange={(e) => setNewSpn({
                      ...newSpn,
                      length: Math.max(1, Math.min(64, parseInt(e.target.value) || 8))
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Resolution"
                  id="spn-resolution"
                  tooltip="The scaling factor to convert raw value to engineering units"
                >
                  <input
                    type="number"
                    id="spn-resolution"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    step="0.001"
                    value={newSpn.resolution}
                    onChange={(e) => setNewSpn({
                      ...newSpn,
                      resolution: parseFloat(e.target.value) || 1
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Offset"
                  id="spn-offset"
                  tooltip="The offset to apply after scaling (Engineering = Raw × Resolution + Offset)"
                >
                  <input
                    type="number"
                    id="spn-offset"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    step="0.001"
                    value={newSpn.offset}
                    onChange={(e) => setNewSpn({
                      ...newSpn,
                      offset: parseFloat(e.target.value) || 0
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Units"
                  id="spn-units"
                  tooltip="The engineering units for the signal (e.g., rpm, km/h, °C)"
                >
                  <input
                    type="text"
                    id="spn-units"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., rpm"
                    value={newSpn.units}
                    onChange={(e) => setNewSpn({
                      ...newSpn,
                      units: e.target.value
                    })}
                  />
                </FormField>
                
                <div className="md:col-span-2">
                  <FormField
                    label="Description"
                    id="spn-description"
                    tooltip="A description of the signal's purpose and usage"
                  >
                    <textarea
                      id="spn-description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter a description..."
                      value={newSpn.description}
                      onChange={(e) => setNewSpn({
                        ...newSpn,
                        description: e.target.value
                      })}
                    ></textarea>
                  </FormField>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  onClick={() => {
                    setEditingSpn(null);
                    setNewSpn({
                      spn: '',
                      name: '',
                      startBit: 0,
                      length: 8,
                      resolution: 1,
                      offset: 0,
                      units: '',
                      description: ''
                    });
                    setActiveTab('spn');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={saveSpn}
                  disabled={!newSpn.spn || !newSpn.name}
                >
                  {editingSpn !== null ? 'Update Signal' : 'Add Signal'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'configuration' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">J1939 Configuration</h3>
            
            <div className="space-y-4">
              <FormField
                label="Preferred Address"
                id="preferred-address"
                tooltip="The preferred J1939 network address (0-253)"
                required
              >
                <input
                  type="number"
                  id="preferred-address"
                  min="0"
                  max="253"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={j1939Config.preferredAddress}
                  onChange={(e) => saveJ1939Config({
                    ...j1939Config,
                    preferredAddress: Math.min(253, Math.max(0, parseInt(e.target.value) || 128))
                  })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Valid range: 0-253 (254 and 255 are reserved)
                </p>
              </FormField>
              
              <FormField
                label="Address Claiming"
                id="address-claiming"
                tooltip="Configure J1939 address claiming"
              >
                <div className="mt-1 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={j1939Config.enableAddressClaiming}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        enableAddressClaiming: e.target.checked
                      })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Address Claiming</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Enables dynamic address negotiation on the J1939 network
                  </p>
                </div>
              </FormField>
              
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="text-md font-medium text-gray-900 mb-3">NAME Fields</h4>
                <p className="text-xs text-gray-500 mb-4">
                  These fields make up the 64-bit J1939 NAME used for address claiming and identification
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Industry Group"
                    id="industry-group"
                    tooltip="The industry group for this device"
                  >
                    <select
                      id="industry-group"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={j1939Config.industryGroup}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        industryGroup: parseInt(e.target.value)
                      })}
                    >
                      <option value="0">Global (0)</option>
                      <option value="1">On-Highway Equipment (1)</option>
                      <option value="2">Agricultural and Forestry (2)</option>
                      <option value="3">Construction (3)</option>
                      <option value="4">Marine (4)</option>
                      <option value="5">Industrial (5)</option>
                    </select>
                  </FormField>
                  
                  <FormField
                    label="Vehicle System"
                    id="vehicle-system"
                    tooltip="The vehicle system type"
                  >
                    <input
                      type="number"
                      id="vehicle-system"
                      min="0"
                      max="127"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={j1939Config.vehicleSystem}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        vehicleSystem: Math.min(127, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                    />
                  </FormField>
                  
                  <FormField
                    label="Vehicle System Instance"
                    id="vehicle-system-instance"
                    tooltip="The instance of this vehicle system"
                  >
                    <input
                      type="number"
                      id="vehicle-system-instance"
                      min="0"
                      max="15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={j1939Config.vehicleSystemInstance}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        vehicleSystemInstance: Math.min(15, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                    />
                  </FormField>
                  
                  <FormField
                    label="Function"
                    id="function"
                    tooltip="The function of this device"
                  >
                    <input
                      type="number"
                      id="function"
                      min="0"
                      max="255"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={j1939Config.function}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        function: Math.min(255, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                    />
                  </FormField>
                  
                  <FormField
                    label="Function Instance"
                    id="function-instance"
                    tooltip="The instance of this function"
                  >
                    <input
                      type="number"
                      id="function-instance"
                      min="0"
                      max="7"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={j1939Config.functionInstance}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        functionInstance: Math.min(7, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                    />
                  </FormField>
                  
                  <FormField
                    label="ECU Instance"
                    id="ecu-instance"
                    tooltip="The instance of this ECU"
                  >
                    <input
                      type="number"
                      id="ecu-instance"
                      min="0"
                      max="7"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={j1939Config.ecuInstance}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        ecuInstance: Math.min(7, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                    />
                  </FormField>
                  
                  <FormField
                    label="Manufacturer Code"
                    id="manufacturer-code"
                    tooltip="The SAE assigned manufacturer code"
                  >
                    <input
                      type="number"
                      id="manufacturer-code"
                      min="0"
                      max="2047"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={j1939Config.manufacturerCode}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        manufacturerCode: Math.min(2047, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                    />
                  </FormField>
                  
                  <FormField
                    label="Identity Number"
                    id="identity-number"
                    tooltip="The manufacturer-defined identity number"
                  >
                    <input
                      type="number"
                      id="identity-number"
                      min="0"
                      max="2097151"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={j1939Config.identityNumber}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        identityNumber: Math.min(2097151, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                    />
                  </FormField>
                </div>
              </div>
              
              <FormField
                label="Transport Protocol Settings"
                id="transport-protocol"
                tooltip="Configure J1939 Transport Protocol for large messages"
              >
                <div className="space-y-3 mt-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TP.CM_RTS Timeout (ms)
                    </label>
                    <input
                      type="number"
                      className="w-36 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="50"
                      step="10"
                      value={j1939Config.tpRtsTimeout || 200}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        tpRtsTimeout: Math.max(50, parseInt(e.target.value) || 200)
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TP.DT Timeout (ms)
                    </label>
                    <input
                      type="number"
                      className="w-36 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="50"
                      step="10"
                      value={j1939Config.tpDtTimeout || 200}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        tpDtTimeout: Math.max(50, parseInt(e.target.value) || 200)
                      })}
                    />
                  </div>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={j1939Config.enableBam || false}
                      onChange={(e) => saveJ1939Config({
                        ...j1939Config,
                        enableBam: e.target.checked
                      })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Broadcast Announce Message (BAM)</span>
                  </label>
                </div>
              </FormField>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
