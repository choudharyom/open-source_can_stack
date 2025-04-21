// This utility will generate code based on the configuration
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Import protocol-specific generators
import { generateCanCode } from './protocolGenerators/canGenerator.js';
import { generateCanopenCode } from './protocolGenerators/canopenGenerator.js';
import { generateJ1939Code } from './protocolGenerators/j1939Generator.js';
import { generateUdsCode } from './protocolGenerators/udsGenerator.js';
import { generateUndefinedCode } from './protocolGenerators/undefinedGenerator.js';

// Import OS-specific generators
import { generateBareMetalCode } from './osGenerators/bareMetalGenerator.js';
import { generateFreeRtosCode } from './osGenerators/freeRtosGenerator.js';
import { generateAutosarCode } from './osGenerators/autosarGenerator.js';
import { generateUndefinedOsCode } from './osGenerators/undefinedOsGenerator.js';

// Import MCU-specific generators
import { generateStm32f446Code } from './mcuGenerators/stm32f446Generator.js';
import { generateS32k144Code } from './mcuGenerators/s32k144Generator.js';
import { generateGenericMcuCode } from './mcuGenerators/genericMcuGenerator.js';

// Import common code generator
import { generateBaseStackCode } from './commonGenerators/baseStackGenerator.js';


// Generate code templates for different protocols
const generateProtocolSpecificCode = (config) => {
  // Extract protocol-specific config if available, otherwise use an empty object
  const protocolConfig = config.protocolConfig && config.protocolConfig[config.protocol?.toLowerCase()]
                         ? config.protocolConfig[config.protocol.toLowerCase()]
                         : {};

  switch (config.protocol) {
    case 'CAN':
      // Pass the main config as it contains the 'messages' array needed by canGenerator
      return generateCanCode(config);
    case 'CANopen':
      // Pass the specific CANopen config object
      return generateCanopenCode(protocolConfig);
    case 'J1939':
      // Pass the specific J1939 config object
      return generateJ1939Code(protocolConfig);
    case 'UDS':
      // Pass the specific UDS config object
      return generateUdsCode(protocolConfig);
    default:
      // Pass the main config (though undefinedGenerator doesn't use it)
      return generateUndefinedCode(config);
  }
};

// Generate OS-specific code
const generateOSSpecificCode = (config) => {
  // Pass the full config to the OS generators as they might need protocol info etc.
  switch (config.os) {
    case 'Bare-metal':
      return generateBareMetalCode(config);
    case 'FreeRTOS':
      return generateFreeRtosCode(config);
    case 'AUTOSAR':
      return generateAutosarCode(config);
    default:
      return generateUndefinedOsCode(config);
  }
};

// Generate MCU-specific driver code
const generateMCUSpecificCode = (config) => {
  // Pass the full config to the MCU generators
  switch (config.mcu) {
    case 'STM32F446':
      return generateStm32f446Code(config);
    case 'S32K144':
      return generateS32k144Code(config);
    // Add other MCUs as needed
    default:
      return generateGenericMcuCode(config);
  }
};

// Generate common code files regardless of configuration
// This now delegates to the imported generator function
const generateCommonCode = (config) => {
  return generateBaseStackCode(config);
};

// Main function to generate all code files
const generateCode = (config) => {
  const protocolFiles = generateProtocolSpecificCode(config);
  const osFiles = generateOSSpecificCode(config);
  const mcuFiles = generateMCUSpecificCode(config);
  const commonFiles = generateCommonCode(config);
  
  // Merge all files
  const allFiles = {
    ...commonFiles,
    ...protocolFiles,
    ...osFiles,
    ...mcuFiles
  };
  
  return allFiles;
};

// Create and download ZIP file
export const downloadZIP = async (config) => {
  try {
    const files = generateCode(config);
    
    // Create a new JSZip instance
    const zip = new JSZip();
    
    // Add all files to the ZIP
    Object.keys(files).forEach(filename => {
      zip.file(filename, files[filename]);
    });
    
    // Generate the ZIP file
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Trigger download
    saveAs(content, `can_stack_${config.mcu.toLowerCase().replace(/\s+/g, '_')}.zip`);
    
    return true;
  } catch (error) {
    console.error('Error generating ZIP file:', error);
    return false;
  }
};

export default { generateCode, downloadZIP };
