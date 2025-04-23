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
          heartbeatTime