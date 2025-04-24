// CAN Bus Simulation Engine

export default class SimulationEngine {
    constructor(config) {
      this.config = config;
      this.running = false;
      this.speed = 1.0;
      this.startTime = 0;
      this.simulationTime = 0;
      this.nodes = [];
      this.messages = [];
      this.activeMessages = [];
      this.messageHistory = [];
      this.messageCallbacks = [];
      this.signalValues = {};
      this.messageCounter = 0;
      this.errorCounter = 0;
      this.statistics = {
        busLoad: 0,
        messageCount: 0,
        errorCount: 0,
        throughput: 0
      };
      
      // Protocol-specific configuration
      this.protocol = config.protocol || 'CAN';
      
      if (this.protocol === 'UDS' && config.protocolConfig?.uds) {
        this.udsConfig = {
          rxId: config.protocolConfig.uds.rxId || '0x7E0',
          txId: config.protocolConfig.uds.txId || '0x7E8',
          requests: config.protocolConfig.uds.requests || []
        };
      } else if (this.protocol === 'J1939' && config.protocolConfig?.j1939) {
        this.j1939Config = {
          preferredAddress: config.protocolConfig.j1939.preferredAddress || 128,
          pgns: config.protocolConfig.j1939.pgns || []
        };
      } else if (this.protocol === 'CANopen' && config.protocolConfig?.canopen) {
        this.canopenConfig = {
          nodeId: config.protocolConfig.canopen.nodeId || 1,
          heartbeatTime: config.protocolConfig.canopen.heartbeatTime || 1000,
          tpdos: config.protocolConfig.canopen.tpdos || [],
          rpdos: config.protocolConfig.canopen.rpdos || []
        };
      }
      
      // Message callbacks
      this.onMessage = null;
      this.onStatistics = null;
    }
    
    // Set nodes in the CAN network
    setNodes(nodes) {
      this.nodes = nodes;
    }
    
    // Get all nodes
    getNodes() {
      return this.nodes;
    }
    
    // Add a message definition
    addMessage(message) {
      this.messages.push(message);
    }
    
    // Add a diagnostic request definition
    addDiagnosticRequest(request) {
      if (!this.udsConfig) {
        this.udsConfig = {
          rxId: '0x7E0',
          txId: '0x7E8',
          requests: []
        };
      }
      
      this.udsConfig.requests.push(request);
    }
    
    // Get available messages that can be sent from a specific node
    getAvailableMessages(nodeId) {
      return this.messages.filter(msg => 
        msg.source === nodeId || msg.source === undefined || msg.source === 'any'
      );
    }
    
    // Get detailed information about a message
    getMessageDetails(messageId) {
      return this.messages.find(msg => msg.id === messageId);
    }
    
    // Get the current simulation time in milliseconds
    getSimulationTime() {
      return this.simulationTime;
    }
    
    // Get the current value of a signal
    getSignalValue(messageId, signalName) {
      const key = `${messageId}-${signalName}`;
      return this.signalValues[key]?.physicalValue;
    }
    
    // Get active messages currently on the bus
    getActiveMessages() {
      // Remove expired messages
      const now = this.simulationTime;
      this.activeMessages = this.activeMessages.filter(msg => 
        now - msg.startTime < msg.duration
      );
      
      return this.activeMessages;
    }
    
    // Start the simulation
    start(speed = 1.0) {
      if (this.running) return;
      
      this.running = true;
      this.speed = speed;
      this.startTime = Date.now();
      this.lastUpdateTime = this.startTime;
      this.simulationTime = 0;
      
      // Clear statistics
      this.messageCounter = 0;
      this.errorCounter = 0;
      
      // Start simulation loop
      this.simulationLoop();
      
      // Start periodic message transmission
      this.messages.forEach(msg => {
        if (msg.cycleTime && msg.cycleTime > 0) {
          this.schedulePeriodicMessage(msg);
        }
      });
      
      // Protocol-specific initialization
      if (this.protocol === 'CANopen') {
        // Send NMT startup message
        this.sendNMTCommand('start', this.canopenConfig.nodeId);
        
        // Start heartbeat
        this.scheduleHeartbeat();
      } else if (this.protocol === 'J1939') {
        // Send address claim
        this.sendAddressClaim();
      }
    }
    
    // Stop the simulation
    stop() {
      this.running = false;
      
      // Clear all timeouts
      this.activeTimeouts = this.activeTimeouts || [];
      this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
      this.activeTimeouts = [];
    }
    
    // Set simulation speed
    setSpeed(speed) {
      this.speed = speed;
    }
    
    // Main simulation loop
    simulationLoop() {
      if (!this.running) return;
      
      const now = Date.now();
      const elapsed = (now - this.lastUpdateTime) * this.speed;
      
      // Update simulation time
      this.simulationTime += elapsed;
      this.lastUpdateTime = now;
      
      // Update statistics
      this.updateStatistics();
      
      // Schedule next update
      requestAnimationFrame(() => this.simulationLoop());
    }
    
    // Schedule a periodic message
    schedulePeriodicMessage(message) {
      if (!this.running) return;
      
      // Calculate time until next transmission
      const interval = message.cycleTime / this.speed;
      
      // Add some jitter for realism (±10%)
      const jitter = interval * 0.1 * (Math.random() * 2 - 1);
      const delay = interval + jitter;
      
      // Schedule message transmission
      const timeout = setTimeout(() => {
        if (!this.running) return;
        
        // Generate message data
        let data;
        
        if (message.signals && message.signals.length > 0) {
          // Generate data based on signals
          data = this.generateSignalData(message);
        } else {
          // Generate random data
          data = Array.from({ length: message.dlc }, () => Math.floor(Math.random() * 256));
        }
        
        // Send message on the bus
        this.simulateMessageTransmission({
          id: message.id,
          name: message.name,
          data,
          source: message.source,
          target: message.target
        });
        
        // Schedule next transmission
        this.schedulePeriodicMessage(message);
      }, delay);
      
      // Track timeout for cleanup
      this.activeTimeouts = this.activeTimeouts || [];
      this.activeTimeouts.push(timeout);
    }
    
    // Generate data based on signal definitions
    generateSignalData(message) {
      // Create a buffer of zeros
      const data = new Array(message.dlc).fill(0);
      
      // Apply each signal
      if (message.signals) {
        message.signals.forEach(signal => {
          // Generate a value for this signal
          let value;
          
          // Check if we have a stored value for this signal
          const key = `${message.id}-${signal.name}`;
          if (this.signalValues[key]) {
            // Use existing value but add some noise for realism
            const variation = (signal.maxValue - signal.minValue) * 0.05 * (Math.random() * 2 - 1);
            value = this.signalValues[key].rawValue + variation;
          } else {
            // Generate a random value within range or defaults
            const min = signal.minValue !== undefined ? signal.minValue : 0;
            const max = signal.maxValue !== undefined ? signal.maxValue : 100;
            value = min + Math.random() * (max - min);
          }
          
          // Store signal value
          this.updateSignalValue(message.id, signal.name, value);
          
          // Convert to raw value
          let rawValue;
          if (signal.resolution !== undefined && signal.offset !== undefined) {
            rawValue = (value - signal.offset) / signal.resolution;
          } else {
            rawValue = value;
          }
          
          // Apply to data buffer
          this.applySignalToData(data, signal, Math.round(rawValue));
        });
      }
      
      return data;
    }
    
    // Apply a signal value to the data buffer
    applySignalToData(data, signal, value) {
      // Calculate byte positions
      const startByte = Math.floor(signal.startBit / 8);
      const endByte = Math.floor((signal.startBit + signal.length - 1) / 8);
      
      // Check if byte positions are within data range
      if (endByte >= data.length) return;
      
      // Little endian (Intel format)
      let bitPosition = signal.startBit;
      let remainingBits = signal.length;
      
      while (remainingBits > 0) {
        const byteIndex = Math.floor(bitPosition / 8);
        const bitIndex = bitPosition % 8;
        
        const bitsInThisByte = Math.min(remainingBits, 8 - bitIndex);
        const mask = ((1 << bitsInThisByte) - 1) << bitIndex;
        const byteValue = (value << bitIndex) & mask;
        
        // Apply to data buffer
        data[byteIndex] = (data[byteIndex] & ~mask) | byteValue;
        
        // Move to next bits
        value >>= bitsInThisByte;
        bitPosition += bitsInThisByte;
        remainingBits -= bitsInThisByte;
      }
    }
    
    // Update stored signal value
    updateSignalValue(messageId, signalName, rawValue) {
      const key = `${messageId}-${signalName}`;
      
      // Find signal definition
      const message = this.messages.find(msg => msg.id === messageId);
      const signal = message?.signals?.find(sig => sig.name === signalName);
      
      if (signal) {
        // Calculate physical value
        let physicalValue;
        if (signal.resolution !== undefined && signal.offset !== undefined) {
          physicalValue = rawValue * signal.resolution + signal.offset;
        } else {
          physicalValue = rawValue;
        }
        
        this.signalValues[key] = {
          rawValue,
          physicalValue
        };
      }
    }
    
    // Simulate transmission of a message on the CAN bus
    simulateMessageTransmission(message) {
      // Increment message counter
      this.messageCounter++;
      
      // Get current time
      const timestamp = this.simulationTime;
      
      // Create message object
      const msgObject = {
        timestamp,
        id: message.id,
        name: message.name || `Message ${message.id}`,
        dlc: message.data.length,
        data: message.data,
        error: message.error || false,
        errorType: message.errorType,
        errorDescription: message.errorDescription,
        signals: []
      };
      
      // Extract signal values if available
      const msgDef = this.messages.find(m => m.id === message.id);
      if (msgDef && msgDef.signals) {
        msgDef.signals.forEach(signal => {
          // Extract raw value from data
          const rawValue = this.extractSignalValue(message.data, signal);
          
          // Calculate physical value
          let physicalValue;
          if (signal.resolution !== undefined && signal.offset !== undefined) {
            physicalValue = rawValue * signal.resolution + signal.offset;
          } else {
            physicalValue = rawValue;
          }
          
          // Update stored value
          const key = `${message.id}-${signal.name}`;
          this.signalValues[key] = {
            rawValue,
            physicalValue
          };
          
          // Add to message object
          msgObject.signals.push({
            name: signal.name,
            rawValue,
            physicalValue,
            unit: signal.unit || ''
          });
        });
      }
      
      // Add to message history
      this.messageHistory.push(msgObject);
      
      // Notify listeners
      if (this.onMessage) {
        this.onMessage(msgObject);
      }
      
      // Add to active messages for visualization
      const speed = 0.5; // seconds to travel across the bus
      this.activeMessages.push({
        id: message.id,
        source: message.source || 'unknown',
        target: message.target || 'broadcast',
        startTime: timestamp,
        duration: speed * 1000,
        color: message.color || this.getColorForMessage(message)
      });
      
      // Protocol-specific handling
      if (this.protocol === 'UDS' && message.id === this.udsConfig?.rxId) {
        // Handle UDS request
        this.handleUDSRequest(message);
      }
    }
    
    // Extract a signal value from data buffer
    extractSignalValue(data, signal) {
      // Calculate byte positions
      const startByte = Math.floor(signal.startBit / 8);
      const endByte = Math.floor((signal.startBit + signal.length - 1) / 8);
      
      // Check if byte positions are within data range
      if (endByte >= data.length) return 0;
      
      // Extract value (little endian)
      let value = 0;
      let bitPosition = signal.startBit;
      let remainingBits = signal.length;
      
      while (remainingBits > 0) {
        const byteIndex = Math.floor(bitPosition / 8);
        const bitIndex = bitPosition % 8;
        
        const bitsInThisByte = Math.min(remainingBits, 8 - bitIndex);
        const mask = ((1 << bitsInThisByte) - 1) << bitIndex;
        const byteValue = (data[byteIndex] & mask) >> bitIndex;
        
        value |= byteValue << (signal.length - remainingBits);
        
        bitPosition += bitsInThisByte;
        remainingBits -= bitsInThisByte;
      }
      
      // Apply sign if needed
      if (signal.isSigned && (value & (1 << (signal.length - 1)))) {
        value = value - (1 << signal.length);
      }
      
      return value;
    }
    
    // Get a color for visualizing a message
    getColorForMessage(message) {
      // Protocol-specific colors
      if (this.protocol === 'J1939') {
        const pgnValue = parseInt(message.id.replace('0x', ''), 16);
        
        if (pgnValue >= 0xF000) {
          return '#8B5CF6'; // Purple for global PGNs
        } else if (pgnValue >= 0xFE00 && pgnValue <= 0xFEFF) {
          return '#10B981'; // Green for address claimed
        }
      } else if (this.protocol === 'CANopen') {
        const cobId = parseInt(message.id.replace('0x', ''), 16);
        
        if (cobId <= 0x7F) {
          return '#EF4444'; // Red for NMT
        } else if (cobId >= 0x700 && cobId <= 0x77F) {
          return '#3B82F6'; // Blue for heartbeat
        } else if (cobId >= 0x180 && cobId <= 0x5FF) {
          return '#10B981'; // Green for PDOs
        }
      } else if (this.protocol === 'UDS') {
        if (message.id === this.udsConfig?.rxId) {
          return '#F59E0B'; // Yellow for requests
        } else if (message.id === this.udsConfig?.txId) {
          return '#3B82F6'; // Blue for responses
        }
      }
      
      // Default colors based on ID
      const idValue = parseInt(message.id.replace('0x', ''), 16);
      const colors = [
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // amber
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#06b6d4', // cyan
        '#f97316'  // orange
      ];
      
      return colors[idValue % colors.length];
    }
    
    // Send a message
    sendMessage(messageData) {
      if (!this.running) return;
      
      // Find message definition
      const messageDef = this.messages.find(m => m.id === messageData.id);
      
      if (messageDef) {
        // Create data buffer
        let data;
        
        if (messageData.data) {
          // Use provided data
          data = messageData.data;
        } else if (messageData.udsRequest) {
          // Create UDS request data
          data = this.createUDSRequestData(messageData.udsRequest);
        } else if (messageData.signals) {
          // Create data from signals
          data = new Array(messageDef.dlc).fill(0);
          
          // Apply each signal
          messageData.signals.forEach(signal => {
            // Find signal definition
            const signalDef = messageDef.signals.find(s => s.name === signal.name);
            if (signalDef) {
              // Convert to raw value
              let rawValue;
              if (signalDef.resolution !== undefined && signalDef.offset !== undefined) {
                rawValue = (signal.value - signalDef.offset) / signalDef.resolution;
              } else {
                rawValue = signal.value;
              }
              
              // Apply to data buffer
              this.applySignalToData(data, signalDef, Math.round(rawValue));
            }
          });
        } else {
          // Generate random data
          data = Array.from({ length: messageDef.dlc }, () => Math.floor(Math.random() * 256));
        }
        
        // Send message on the bus
        this.simulateMessageTransmission({
          id: messageData.id,
          name: messageDef.name,
          data,
          source: 'self',
          target: messageData.target || 'broadcast',
          canopen: messageData.canopen,
          nmtCommand: messageData.nmtCommand
        });
        
        // Set up as periodic if requested
        if (messageData.cyclical && messageData.cycleTime) {
          const msg = { ...messageDef, cycleTime: messageData.cycleTime };
          
          // Update stored message
          const msgIndex = this.messages.findIndex(m => m.id === messageData.id);
          if (msgIndex >= 0) {
            this.messages[msgIndex] = msg;
          }
          
          // Schedule periodic transmission
          this.schedulePeriodicMessage(msg);
        }
      } else {
        console.error(`Message with ID ${messageData.id} not found`);
      }
    }
    
    // Create UDS request data from configuration
    createUDSRequestData(request) {
      const data = [parseInt(request.service, 16)];
      
      if (request.subfunction) {
        data.push(parseInt(request.subfunction, 16));
      }
      
      if (request.dataBytes) {
        request.dataBytes.forEach(byte => {
          data.push(parseInt(byte, 16));
        });
      }
      
      // Pad to 8 bytes for CAN
      while (data.length < 8) {
        data.push(0);
      }
      
      return data;
    }
    
    // Handle UDS request
    handleUDSRequest(message) {
      // Wait a brief time before responding
      setTimeout(() => {
        if (!this.running) return;
        
        // Create response data
        const requestData = message.data;
        const responseData = new Array(8).fill(0);
        
        // Service ID + 0x40 for positive response
        responseData[0] = requestData[0] + 0x40;
        
        // Copy subfunction if present
        if (requestData.length > 1) {
          responseData[1] = requestData[1];
        }
        
        // Add some example data based on service
        switch (requestData[0]) {
          case 0x10: // Diagnostic Session Control
            // No additional data needed
            break;
            
          case 0x22: // Read Data By Identifier
            if (requestData.length > 2) {
              // Echo DID
              responseData[1] = requestData[1];
              responseData[2] = requestData[2];
              
              // Add some example data
              responseData[3] = 0x01;
              responseData[4] = 0x02;
              responseData[5] = 0x03;
              responseData[6] = 0x04;
            }
            break;
            
          case 0x27: // Security Access
            if (requestData[1] % 2 === 1) {
              // Seed request (odd subfunction)
              responseData[2] = 0xAA;
              responseData[3] = 0xBB;
              responseData[4] = 0xCC;
              responseData[5] = 0xDD;
            } else {
              // Key response (even subfunction)
              // No additional data
            }
            break;
            
          default:
            // Generic response, no additional data
            break;
        }
        
        // Send response
        this.simulateMessageTransmission({
          id: this.udsConfig?.txId || '0x7E8',
          name: 'Diagnostic Response',
          data: responseData,
          source: 'self',
          target: 'tester'
        });
      }, 20); // 20ms response time
    }
    
    // Send NMT command (CANopen)
    sendNMTCommand(command, nodeId) {
      // NMT command mapping
      const nmt