import { useState, useEffect, useRef } from 'react';
import SimulationControls from './SimulationControls';
import MessageTrafficView from './MessageTrafficView';
import MessageComposer from './MessageComposer';
import SignalPlotter from './SignalPlotter';
import NetworkTopology from './NetworkTopology';
import LoadingSpinner from '../LoadingSpinner';
import SimulationEngine from '../../utils/simulationEngine';

export default function CANSimulator({ config }) {
  const [simRunning, setSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1.0); // Simulation speed multiplier
  const [messages, setMessages] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [trackedSignals, setTrackedSignals] = useState([]);
  const [statistics, setStatistics] = useState({
    busLoad: 0,
    messageCount: 0,
    errorCount: 0,
    throughput: 0
  });
  const [activeTab, setActiveTab] = useState('traffic');
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Reference to simulation engine
  const simulationEngineRef = useRef(null);
  
  // Initialize simulation engine
  useEffect(() => {
    setIsInitializing(true);
    
    // Create a new simulation engine instance
    simulationEngineRef.current = new SimulationEngine(config);
    
    // Set up event listeners
    simulationEngineRef.current.onMessage = (message) => {
      setMessages(prev => [message, ...prev].slice(0, 100)); // Keep the last 100 messages
    };
    
    simulationEngineRef.current.onStatistics = (stats) => {
      setStatistics(stats);
    };
    
    // Setup node list based on configuration
    const nodeList = [];
    
    // Add self node (this ECU)
    nodeList.push({
      id: 'self',
      name: 'This ECU',
      address: getNodeAddress(),
      color: '#4f46e5',
      role: 'self'
    });
    
    // Add other nodes based on configuration
    if (config.protocol === 'J1939' && config.protocolConfig?.j1939?.pgns) {
      // Add other ECUs in the J1939 network
      const otherAddresses = [5, 10, 17, 33, 49]; // Example addresses
      otherAddresses.forEach((addr, idx) => {
        nodeList.push({
          id: `ecu_${addr}`,
          name: `ECU ${addr}`,
          address: addr,
          color: getColorForIndex(idx),
          role: 'ecu'
        });
      });
    } else if (config.protocol === 'CANopen' && config.protocolConfig?.canopen) {
      // Add other nodes in the CANopen network
      const nodeCount = 5; // Example node count
      for (let i = 2; i <= nodeCount; i++) {
        nodeList.push({
          id: `node_${i}`,
          name: `Node ${i}`,
          address: i,
          color: getColorForIndex(i - 2),
          role: 'device'
        });
      }
    } else {
      // Add generic nodes for other protocols
      ['Engine', 'Transmission', 'Brakes', 'Body', 'Infotainment'].forEach((name, idx) => {
        nodeList.push({
          id: `node_${idx}`,
          name,
          address: 10 + idx,
          color: getColorForIndex(idx),
          role: 'ecu'
        });
      });
    }
    
    // Initialize the simulation with nodes
    simulationEngineRef.current.setNodes(nodeList);
    setSelectedNode(nodeList[0].id); // Select self by default
    
    // Initialize the messages that can be sent
    initializeMessages();
    
    setIsInitializing(false);
  }, [config]);
  
  // Get node address based on protocol configuration
  const getNodeAddress = () => {
    if (config.protocol === 'J1939' && config.protocolConfig?.j1939) {
      return config.protocolConfig.j1939.preferredAddress || 128;
    } else if (config.protocol === 'CANopen' && config.protocolConfig?.canopen) {
      return config.protocolConfig.canopen.nodeId || 1;
    } else {
      return 1; // Default address
    }
  };
  
  // Get a color for a node based on index
  const getColorForIndex = (index) => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316'  // orange
    ];
    return colors[index % colors.length];
  };
  
  // Initialize simulation messages based on configuration
  const initializeMessages = () => {
    if (!simulationEngineRef.current) return;
    
    if (config.protocol === 'J1939' && config.protocolConfig?.j1939?.pgns) {
      // Add J1939 messages
      config.protocolConfig.j1939.pgns.forEach(pgn => {
        simulationEngineRef.current.addMessage({
          id: pgn.pgn,
          name: pgn.name,
          dlc: pgn.length,
          cycleTime: pgn.transmitRate,
          signals: pgn.spns || [],
          source: getNodeAddressForPgn(pgn.pgn) // Determine source node for this PGN
        });
      });
    } else if (config.protocol === 'CANopen' && config.protocolConfig?.canopen) {
      // Add CANopen messages (PDOs, heartbeats, etc.)
      if (config.protocolConfig.canopen.tpdos) {
        config.protocolConfig.canopen.tpdos.forEach(pdoNum => {
          const cobId = 0x180 + (pdoNum - 1) * 0x100 + config.protocolConfig.canopen.nodeId;
          simulationEngineRef.current.addMessage({
            id: `0x${cobId.toString(16).toUpperCase()}`,
            name: `TPDO${pdoNum}`,
            dlc: 8,
            cycleTime: 100, // Default cycle time
            signals: [],
            source: 'self'
          });
        });
      }
      
      // Add NMT, heartbeat, etc.
      simulationEngineRef.current.addMessage({
        id: `0x${(0x700 + config.protocolConfig.canopen.nodeId).toString(16).toUpperCase()}`,
        name: 'Heartbeat',
        dlc: 1,
        cycleTime: config.protocolConfig.canopen.heartbeatTime || 1000,
        signals: [],
        source: 'self'
      });
    } else if (config.protocol === 'UDS' && config.protocolConfig?.uds) {
      // Add UDS messages
      const rxId = config.protocolConfig.uds.rxId || '0x7E0';
      const txId = config.protocolConfig.uds.txId || '0x7E8';
      
      simulationEngineRef.current.addMessage({
        id: rxId,
        name: 'Diagnostic Request',
        dlc: 8,
        cycleTime: 0, // On-demand
        signals: [],
        source: 'tester'
      });
      
      simulationEngineRef.current.addMessage({
        id: txId,
        name: 'Diagnostic Response',
        dlc: 8,
        cycleTime: 0, // On-demand
        signals: [],
        source: 'self'
      });
      
      // Add diagnostic requests from configuration
      if (config.protocolConfig.uds.requests) {
        config.protocolConfig.uds.requests.forEach(req => {
          simulationEngineRef.current.addDiagnosticRequest(req);
        });
      }
    } else {
      // Add generic messages from configured messages
      config.messages.forEach(msg => {
        simulationEngineRef.current.addMessage({
          id: msg.id,
          name: msg.name,
          dlc: msg.dlc || 8,
          cycleTime: msg.cycleTime || 100,
          signals: msg.signals || [],
          source: 'self'
        });
      });
    }
  };
  
  // Determine source node for a J1939 PGN
  const getNodeAddressForPgn = (pgn) => {
    // In a real implementation, this would map PGNs to the appropriate node sources
    // For now, use a simple algorithm to distribute PGNs across nodes
    const pgnNum = parseInt(pgn.replace('0x', ''), 16);
    const nodeIds = ['self', 'ecu_5', 'ecu_10', 'ecu_17', 'ecu_33', 'ecu_49'];
    return nodeIds[pgnNum % nodeIds.length];
  };
  
  // Start the simulation
  const startSimulation = () => {
    if (simulationEngineRef.current) {
      simulationEngineRef.current.start(simSpeed);
      setSimRunning(true);
    }
  };
  
  // Stop the simulation
  const stopSimulation = () => {
    if (simulationEngineRef.current) {
      simulationEngineRef.current.stop();
      setSimRunning(false);
    }
  };
  
  // Update simulation speed
  const updateSimSpeed = (speed) => {
    setSimSpeed(speed);
    if (simulationEngineRef.current && simRunning) {
      simulationEngineRef.current.setSpeed(speed);
    }
  };
  
  // Send a message manually
  const sendMessage = (messageData) => {
    if (simulationEngineRef.current) {
      simulationEngineRef.current.sendMessage(messageData);
    }
  };
  
  // Track/untrack a signal for plotting
  const toggleSignalTracking = (messageId, signalName) => {
    const signalKey = `${messageId}-${signalName}`;
    
    if (trackedSignals.some(s => s.key === signalKey)) {
      // Remove from tracked signals
      setTrackedSignals(trackedSignals.filter(s => s.key !== signalKey));
    } else {
      // Add to tracked signals (up to 4)
      if (trackedSignals.length < 4) {
        setTrackedSignals([...trackedSignals, {
          key: signalKey,
          messageId,
          signalName,
          color: getColorForIndex(trackedSignals.length)
        }]);
      } else {
        alert('You can track a maximum of 4 signals simultaneously');
      }
    }
  };
  
  // Inject an error on the bus
  const injectError = (errorType) => {
    if (simulationEngineRef.current) {
      simulationEngineRef.current.injectError(errorType);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (simulationEngineRef.current) {
        simulationEngineRef.current.stop();
      }
    };
  }, []);
  
  if (isInitializing) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner text="Initializing Simulation Environment..." />
      </div>
    );
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-sm">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'traffic' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('traffic')}
          >
            Message Traffic
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'composer' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('composer')}
          >
            Message Composer
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'signals' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('signals')}
          >
            Signal Plotter
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === 'network' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('network')}
          >
            Network Topology
          </button>
        </nav>
      </div>
      
      <div className="p-4">
        <SimulationControls 
          running={simRunning}
          speed={simSpeed}
          statistics={statistics}
          onStart={startSimulation}
          onStop={stopSimulation}
          onSpeedChange={updateSimSpeed}
          onInjectError={injectError}
          protocol={config.protocol}
        />
        
        <div className="mt-4">
          {activeTab === 'traffic' && (
            <MessageTrafficView 
              messages={messages}
              selectedMessage={selectedMessage}
              setSelectedMessage={setSelectedMessage}
              onToggleSignalTracking={toggleSignalTracking}
              trackedSignals={trackedSignals}
              simulationEngine={simulationEngineRef.current}
              protocol={config.protocol}
            />
          )}
          
          {activeTab === 'composer' && (
            <MessageComposer 
              simulationEngine={simulationEngineRef.current}
              selectedNode={selectedNode}
              onSendMessage={sendMessage}
              protocol={config.protocol}
              protocolConfig={config.protocolConfig}
            />
          )}
          
          {activeTab === 'signals' && (
            <SignalPlotter 
              trackedSignals={trackedSignals}
              onRemoveSignal={(key) => setTrackedSignals(trackedSignals.filter(s => s.key !== key))}
              simulationEngine={simulationEngineRef.current}
              running={simRunning}
            />
          )}
          
          {activeTab === 'network' && (
            <NetworkTopology 
              simulationEngine={simulationEngineRef.current}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              protocol={config.protocol}
            />
          )}
        </div>
      </div>
    </div>
  );
}