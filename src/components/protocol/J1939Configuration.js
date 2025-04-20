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
          description: 'Driver's demand engine - percent torque'
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
                      <th scope="col" className="px-3 py-2 text-left