import { useState, useEffect } from 'react';
import FormField from '../FormField';
import Tooltip from '../Tooltip';
import LoadingSpinner from '../LoadingSpinner';

export default function CANopenObjectDictionary({ config, updateConfig }) {
  const [activeTab, setActiveTab] = useState('dictionary');
  const [editingObject, setEditingObject] = useState(null);
  const [newObject, setNewObject] = useState({
    index: '',
    subIndex: '00',
    name: '',
    objectType: 'VAR',
    dataType: 'UNSIGNED8',
    accessType: 'rw',
    defaultValue: '0',
    description: ''
  });

  // Default object dictionary entries
  const defaultObjects = [
    {
      index: '1000',
      subIndex: '00',
      name: 'Device Type',
      objectType: 'VAR',
      dataType: 'UNSIGNED32',
      accessType: 'ro',
      defaultValue: '0x00000000',
      description: 'Device type identifier'
    },
    {
      index: '1001',
      subIndex: '00',
      name: 'Error Register',
      objectType: 'VAR',
      dataType: 'UNSIGNED8',
      accessType: 'ro',
      defaultValue: '0',
      description: 'Error register'
    },
    {
      index: '1017',
      subIndex: '00',
      name: 'Producer Heartbeat Time',
      objectType: 'VAR',
      dataType: 'UNSIGNED16',
      accessType: 'rw',
      defaultValue: '1000',
      description: 'Heartbeat producer time in ms'
    },
    {
      index: '1018',
      subIndex: '00',
      name: 'Identity Object',
      objectType: 'RECORD',
      dataType: 'UNSIGNED8',
      accessType: 'ro',
      defaultValue: '4',
      description: 'Number of subindices'
    },
    {
      index: '1018',
      subIndex: '01',
      name: 'Vendor ID',
      objectType: 'VAR',
      dataType: 'UNSIGNED32',
      accessType: 'ro',
      defaultValue: '0x00000000',
      description: 'Vendor ID'
    },
    {
      index: '1018',
      subIndex: '02',
      name: 'Product Code',
      objectType: 'VAR',
      dataType: 'UNSIGNED32',
      accessType: 'ro',
      defaultValue: '0x00000000',
      description: 'Product code'
    },
    {
      index: '1018',
      subIndex: '03',
      name: 'Revision Number',
      objectType: 'VAR',
      dataType: 'UNSIGNED32',
      accessType: 'ro',
      defaultValue: '0x00000000',
      description: 'Revision number'
    },
    {
      index: '1018',
      subIndex: '04',
      name: 'Serial Number',
      objectType: 'VAR',
      dataType: 'UNSIGNED32',
      accessType: 'ro',
      defaultValue: '0x00000000',
      description: 'Serial number'
    }
  ];
  
  // CANopen configuration from main config
  const canOpenConfig = config.protocolConfig?.canopen || {
    nodeId: 1,
    heartbeatTime: 1000,
    objects: defaultObjects
  };
  
  // Save CANopen configuration back to main config
  const saveCanOpenConfig = (newConfig) => {
    const currentProtocolConfig = config.protocolConfig || {};
    updateConfig('protocolConfig', {
      ...currentProtocolConfig,
      canopen: newConfig
    });
  };
  
  // Object types
  const objectTypes = [
    { value: 'NULL', label: 'NULL - Null' },
    { value: 'DOMAIN', label: 'DOMAIN - Large variable amount of data' },
    { value: 'DEFTYPE', label: 'DEFTYPE - Defines a standard data type' },
    { value: 'DEFSTRUCT', label: 'DEFSTRUCT - Defines a complex data type' },
    { value: 'VAR', label: 'VAR - Single variable' },
    { value: 'ARRAY', label: 'ARRAY - Array of variables' },
    { value: 'RECORD', label: 'RECORD - Record or structure' }
  ];
  
  // Data types
  const dataTypes = [
    { value: 'BOOLEAN', label: 'BOOLEAN - Boolean' },
    { value: 'INTEGER8', label: 'INTEGER8 - 8-bit signed integer' },
    { value: 'INTEGER16', label: 'INTEGER16 - 16-bit signed integer' },
    { value: 'INTEGER32', label: 'INTEGER32 - 32-bit signed integer' },
    { value: 'UNSIGNED8', label: 'UNSIGNED8 - 8-bit unsigned integer' },
    { value: 'UNSIGNED16', label: 'UNSIGNED16 - 16-bit unsigned integer' },
    { value: 'UNSIGNED32', label: 'UNSIGNED32 - 32-bit unsigned integer' },
    { value: 'REAL32', label: 'REAL32 - 32-bit floating point' },
    { value: 'VISIBLE_STRING', label: 'VISIBLE_STRING - Visible string (ASCII)' },
    { value: 'OCTET_STRING', label: 'OCTET_STRING - Octet string' },
    { value: 'UNICODE_STRING', label: 'UNICODE_STRING - Unicode string' },
    { value: 'TIME_OF_DAY', label: 'TIME_OF_DAY - Time of day' },
    { value: 'DOMAIN', label: 'DOMAIN - Domain (arbitrary data)' }
  ];
  
  // Access types
  const accessTypes = [
    { value: 'ro', label: 'Read Only' },
    { value: 'wo', label: 'Write Only' },
    { value: 'rw', label: 'Read/Write' },
    { value: 'rwr', label: 'Read/Write on process input' },
    { value: 'rww', label: 'Read/Write on process output' },
    { value: 'const', label: 'Constant value' }
  ];
    
  // Initialize config with default objects if none exist
  useEffect(() => {
    if (!canOpenConfig.objects || canOpenConfig.objects.length === 0) {
      saveCanOpenConfig({
        ...canOpenConfig,
        objects: defaultObjects
      });
    }
  }, []);
  
  // Add or update object
  const saveObject = () => {
    let updatedObjects;
    
    if (editingObject !== null) {
      // Update existing object
      updatedObjects = [...canOpenConfig.objects];
      updatedObjects[editingObject] = { ...newObject };
    } else {
      // Check if object already exists
      const existingIndex = canOpenConfig.objects.findIndex(
        obj => obj.index === newObject.index && obj.subIndex === newObject.subIndex
      );
      
      if (existingIndex >= 0) {
        if (!confirm('An object with this index and subindex already exists. Replace it?')) {
          return;
        }
        updatedObjects = [...canOpenConfig.objects];
        updatedObjects[existingIndex] = { ...newObject };
      } else {
        // Add new object
        updatedObjects = [...canOpenConfig.objects, { ...newObject }];
      }
    }
    
    // Sort objects by index and subindex
    updatedObjects.sort((a, b) => {
      const indexCompare = parseInt(a.index, 16) - parseInt(b.index, 16);
      if (indexCompare !== 0) return indexCompare;
      return parseInt(a.subIndex, 16) - parseInt(b.subIndex, 16);
    });
    
    saveCanOpenConfig({
      ...canOpenConfig,
      objects: updatedObjects
    });
    
    // Reset form
    setNewObject({
      index: '',
      subIndex: '00',
      name: '',
      objectType: 'VAR',
      dataType: 'UNSIGNED8',
      accessType: 'rw',
      defaultValue: '0',
      description: ''
    });
    
    setEditingObject(null);
  };
  
  // Delete object
  const deleteObject = (index) => {
    if (confirm('Are you sure you want to delete this object?')) {
      const updatedObjects = canOpenConfig.objects.filter((_, i) => i !== index);
      
      saveCanOpenConfig({
        ...canOpenConfig,
        objects: updatedObjects
      });
      
      if (editingObject === index) {
        setEditingObject(null);
        setNewObject({
          index: '',
          subIndex: '00',
          name: '',
          objectType: 'VAR',
          dataType: 'UNSIGNED8',
          accessType: 'rw',
          defaultValue: '0',
          description: ''
        });
      }
    }
  };
  
  // Edit object
  const editObject = (index) => {
    setEditingObject(index);
    setNewObject({ ...canOpenConfig.objects[index] });
  };
  
  // Filter and group objects by communication profile areas
  const groupedObjects = {
    communication: canOpenConfig.objects?.filter(obj => {
      const index = parseInt(obj.index, 16);
      return index >= 0x1000 && index <= 0x1FFF;
    }) || [],
    manufacturer: canOpenConfig.objects?.filter(obj => {
      const index = parseInt(obj.index, 16);
      return index >= 0x2000 && index <= 0x5FFF;
    }) || [],
    standardized: canOpenConfig.objects?.filter(obj => {
      const index = parseInt(obj.index, 16);
      return index >= 0x6000 && index <= 0x9FFF;
    }) || [],
    other: canOpenConfig.objects?.filter(obj => {
      const index = parseInt(obj.index, 16);
      return !(
        (index >= 0x1000 && index <= 0x1FFF) ||
        (index >= 0x2000 && index <= 0x5FFF) ||
        (index >= 0x6000 && index <= 0x9FFF)
      );
    }) || []
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-sm">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            className={`py-3 px-4 text-sm font-medium ${
              activeTab === 'dictionary' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('dictionary')}
          >
            Object Dictionary
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium ${
              activeTab === 'editor' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('editor')}
          >
            Add/Edit Object
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium ${
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
        {activeTab === 'dictionary' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Object Dictionary Browser</h3>
              <button
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                onClick={() => {
                  setActiveTab('editor');
                  setEditingObject(null);
                  setNewObject({
                    index: '',
                    subIndex: '00',
                    name: '',
                    objectType: 'VAR',
                    dataType: 'UNSIGNED8',
                    accessType: 'rw',
                    defaultValue: '0',
                    description: ''
                  });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Object
              </button>
            </div>
            
            {!canOpenConfig.objects ? (
              <div className="flex justify-center my-6">
                <LoadingSpinner text="Loading Object Dictionary..." />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Communication Profile Area */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Communication Profile Area (0x1000-0x1FFF)</h4>
                  {groupedObjects.communication.length > 0 ? (
                    <div className="overflow-x-auto bg-gray-50 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Index:Sub
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Access
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Default
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupedObjects.communication.map((obj, idx) => {
                            const objectIndex = canOpenConfig.objects.findIndex(o => 
                              o.index === obj.index && o.subIndex === obj.subIndex
                            );
                            
                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                                  {obj.index}:{obj.subIndex}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.name}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.dataType}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.accessType}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.defaultValue}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  <div className="flex space-x-2">
                                    <button
                                      className="text-blue-600 hover:text-blue-800"
                                      onClick={() => {
                                        editObject(objectIndex);
                                        setActiveTab('editor');
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="text-red-600 hover:text-red-800"
                                      onClick={() => deleteObject(objectIndex)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 py-2">No objects defined in this area.</div>
                  )}
                </div>
                
                {/* Manufacturer Specific Profile Area */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Manufacturer Specific Profile (0x2000-0x5FFF)</h4>
                  {groupedObjects.manufacturer.length > 0 ? (
                    <div className="overflow-x-auto bg-gray-50 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Index:Sub
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Access
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Default
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupedObjects.manufacturer.map((obj, idx) => {
                            const objectIndex = canOpenConfig.objects.findIndex(o => 
                              o.index === obj.index && o.subIndex === obj.subIndex
                            );
                            
                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                                  {obj.index}:{obj.subIndex}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.name}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.dataType}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.accessType}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.defaultValue}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  <div className="flex space-x-2">
                                    <button
                                      className="text-blue-600 hover:text-blue-800"
                                      onClick={() => {
                                        editObject(objectIndex);
                                        setActiveTab('editor');
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="text-red-600 hover:text-red-800"
                                      onClick={() => deleteObject(objectIndex)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 py-2">No objects defined in this area.</div>
                  )}
                </div>
                
                {/* Standardized Device Profile Area */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Standardized Device Profile (0x6000-0x9FFF)</h4>
                  {groupedObjects.standardized.length > 0 ? (
                    <div className="overflow-x-auto bg-gray-50 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Index:Sub
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Access
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Default
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupedObjects.standardized.map((obj, idx) => {
                            const objectIndex = canOpenConfig.objects.findIndex(o => 
                              o.index === obj.index && o.subIndex === obj.subIndex
                            );
                            
                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                                  {obj.index}:{obj.subIndex}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.name}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.dataType}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.accessType}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.defaultValue}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  <div className="flex space-x-2">
                                    <button
                                      className="text-blue-600 hover:text-blue-800"
                                      onClick={() => {
                                        editObject(objectIndex);
                                        setActiveTab('editor');
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="text-red-600 hover:text-red-800"
                                      onClick={() => deleteObject(objectIndex)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 py-2">No objects defined in this area.</div>
                  )}
                </div>
                
                {/* Other Objects */}
                {groupedObjects.other.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Other Objects</h4>
                    <div className="overflow-x-auto bg-gray-50 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Index:Sub
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Access
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Default
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groupedObjects.other.map((obj, idx) => {
                            const objectIndex = canOpenConfig.objects.findIndex(o => 
                              o.index === obj.index && o.subIndex === obj.subIndex
                            );
                            
                            return (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">
                                  {obj.index}:{obj.subIndex}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.name}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.dataType}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.accessType}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  {obj.defaultValue}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                  <div className="flex space-x-2">
                                    <button
                                      className="text-blue-600 hover:text-blue-800"
                                      onClick={() => {
                                        editObject(objectIndex);
                                        setActiveTab('editor');
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="text-red-600 hover:text-red-800"
                                      onClick={() => deleteObject(objectIndex)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'editor' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingObject !== null ? 'Edit Object' : 'Add New Object'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Index (hex)"
                  id="index"
                  tooltip="The index of the object in hexadecimal (e.g., 1000)"
                  required
                >
                  <input
                    type="text"
                    id="index"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 1000"
                    value={newObject.index}
                    onChange={(e) => setNewObject({
                      ...newObject,
                      index: e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Sub-Index (hex)"
                  id="subIndex"
                  tooltip="The sub-index of the object in hexadecimal (e.g., 00)"
                  required
                >
                  <input
                    type="text"
                    id="subIndex"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 00"
                    value={newObject.subIndex}
                    onChange={(e) => setNewObject({
                      ...newObject,
                      subIndex: e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().padStart(2, '0')
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Name"
                  id="name"
                  tooltip="A descriptive name for the object"
                  required
                >
                  <input
                    type="text"
                    id="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Device Type"
                    value={newObject.name}
                    onChange={(e) => setNewObject({
                      ...newObject,
                      name: e.target.value
                    })}
                  />
                </FormField>
                
                <FormField
                  label="Object Type"
                  id="objectType"
                  tooltip="The type of the object in the dictionary"
                  required
                >
                  <select
                    id="objectType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newObject.objectType}
                    onChange={(e) => setNewObject({
                      ...newObject,
                      objectType: e.target.value
                    })}
                  >
                    {objectTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                
                <FormField
                  label="Data Type"
                  id="dataType"
                  tooltip="The data type of the object"
                  required
                >
                  <select
                    id="dataType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newObject.dataType}
                    onChange={(e) => setNewObject({
                      ...newObject,
                      dataType: e.target.value
                    })}
                  >
                    {dataTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                
                <FormField
                  label="Access Type"
                  id="accessType"
                  tooltip="The access rights for the object"
                  required
                >
                  <select
                    id="accessType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newObject.accessType}
                    onChange={(e) => setNewObject({
                      ...newObject,
                      accessType: e.target.value
                    })}
                  >
                    {accessTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                
                <FormField
                  label="Default Value"
                  id="defaultValue"
                  tooltip="The default value for the object"
                >
                  <input
                    type="text"
                    id="defaultValue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 0 or 0x00000000"
                    value={newObject.defaultValue}
                    onChange={(e) => setNewObject({
                      ...newObject,
                      defaultValue: e.target.value
                    })}
                  />
                </FormField>
                
                <div className="md:col-span-2">
                  <FormField
                    label="Description"
                    id="description"
                    tooltip="A description of the object's purpose and usage"
                  >
                    <textarea
                      id="description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter a description..."
                      value={newObject.description}
                      onChange={(e) => setNewObject({
                        ...newObject,
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
                    setEditingObject(null);
                    setNewObject({
                      index: '',
                      subIndex: '00',
                      name: '',
                      objectType: 'VAR',
                      dataType: 'UNSIGNED8',
                      accessType: 'rw',
                      defaultValue: '0',
                      description: ''
                    });
                    setActiveTab('dictionary');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={saveObject}
                  disabled={!newObject.index || !newObject.name}
                >
                  {editingObject !== null ? 'Update Object' : 'Add Object'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'configuration' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">CANopen Configuration</h3>
            
            <div className="space-y-4">
              <FormField
                label="Node ID"
                id="nodeId"
                tooltip="The CANopen node ID for this device (1-127)"
                required
              >
                <input
                  type="number"
                  id="nodeId"
                  min="1"
                  max="127"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={canOpenConfig.nodeId}
                  onChange={(e) => saveCanOpenConfig({
                    ...canOpenConfig,
                    nodeId: Math.min(127, Math.max(1, parseInt(e.target.value) || 1))
                  })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Valid range: 1-127
                </p>
              </FormField>
              
              <FormField
                label="Heartbeat Time (ms)"
                id="heartbeatTime"
                tooltip="The interval at which this node sends heartbeat messages"
                required
              >
                <input
                  type="number"
                  id="heartbeatTime"
                  min="0"
                  step="100"
                  className="w-36 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={canOpenConfig.heartbeatTime}
                  onChange={(e) => saveCanOpenConfig({
                    ...canOpenConfig,
                    heartbeatTime: Math.max(0, parseInt(e.target.value) || 0)
                  })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  0 = disabled, recommended: 1000ms
                </p>
              </FormField>
              
              <FormField
                label="Network Management"
                id="nmtControl"
                tooltip="Configure Network Management settings"
              >
                <div className="mt-1 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={canOpenConfig.autoStart || false}
                      onChange={(e) => saveCanOpenConfig({
                        ...canOpenConfig,
                        autoStart: e.target.checked
                      })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-start to operational state</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={canOpenConfig.enableLSS || false}
                      onChange={(e) => saveCanOpenConfig({
                        ...canOpenConfig,
                        enableLSS: e.target.checked
                      })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Layer Setting Services (LSS)</span>
                  </label>
                </div>
              </FormField>
              
              <FormField
                label="PDO Configuration"
                id="pdoConfig"
                tooltip="Configure Process Data Object settings"
              >
                <div className="mt-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transmit PDOs (TPDOs)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map(num => (
                        <label key={num} className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={(canOpenConfig.tpdos || []).includes(num)}
                            onChange={(e) => {
                              const tpdos = canOpenConfig.tpdos || [];
                              if (e.target.checked) {
                                saveCanOpenConfig({
                                  ...canOpenConfig,
                                  tpdos: [...tpdos, num].sort()
                                });
                              } else {
                                saveCanOpenConfig({
                                  ...canOpenConfig,
                                  tpdos: tpdos.filter(id => id !== num)
                                });
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-700">TPDO{num}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receive PDOs (RPDOs)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map(num => (
                        <label key={num} className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={(canOpenConfig.rpdos || []).includes(num)}
                            onChange={(e) => {
                              const rpdos = canOpenConfig.rpdos || [];
                              if (e.target.checked) {
                                saveCanOpenConfig({
                                  ...canOpenConfig,
                                  rpdos: [...rpdos, num].sort()
                                });
                              } else {
                                saveCanOpenConfig({
                                  ...canOpenConfig,
                                  rpdos: rpdos.filter(id => id !== num)
                                });
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-700">RPDO{num}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </FormField>
              
              <FormField
                label="SDO Timeout (ms)"
                id="sdoTimeout"
                tooltip="The timeout for SDO transactions"
              >
                <input
                  type="number"
                  id="sdoTimeout"
                  min="100"
                  step="100"
                  className="w-36 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={canOpenConfig.sdoTimeout || 1000}
                  onChange={(e) => saveCanOpenConfig({
                    ...canOpenConfig,
                    sdoTimeout: Math.max(100, parseInt(e.target.value) || 1000)
                  })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Recommended: 1000ms
                </p>
              </FormField>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
