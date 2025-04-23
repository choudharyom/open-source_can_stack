import { useState, useEffect, useRef } from 'react';

export default function NetworkTopology({ 
  simulationEngine, 
  selectedNode, 
  setSelectedNode,
  protocol
}) {
  const [nodes, setNodes] = useState([]);
  const [messages, setMessages] = useState([]);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Get nodes and messages from simulation engine
  useEffect(() => {
    if (simulationEngine) {
      setNodes(simulationEngine.getNodes());
      
      // Start message animation
      animationFrameRef.current = requestAnimationFrame(animateMessages);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [simulationEngine]);
  
  // Animate messages on the CAN bus
  const animateMessages = () => {
    if (!simulationEngine) return;
    
    // Get current messages on the bus
    const activeMessages = simulationEngine.getActiveMessages();
    setMessages(activeMessages);
    
    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animateMessages);
  };
  
  // Draw network on canvas
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bus line
    const busY = canvas.height / 2;
    const busWidth = canvas.width - 60;
    const busStartX = 30;
    const busEndX = busStartX + busWidth;
    
    ctx.beginPath();
    ctx.strokeStyle = '#6B7280'; // Gray
    ctx.lineWidth = 4;
    ctx.moveTo(busStartX, busY);
    ctx.lineTo(busEndX, busY);
    ctx.stroke();
    
    // Draw termination resistors
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Left terminator
    ctx.moveTo(busStartX - 10, busY - 10);
    ctx.lineTo(busStartX - 10, busY + 10);
    ctx.moveTo(busStartX - 12, busY - 10);
    ctx.lineTo(busStartX - 8, busY - 10);
    ctx.moveTo(busStartX - 12, busY + 10);
    ctx.lineTo(busStartX - 8, busY + 10);
    
    // Right terminator
    ctx.moveTo(busEndX + 10, busY - 10);
    ctx.lineTo(busEndX + 10, busY + 10);
    ctx.moveTo(busEndX + 12, busY - 10);
    ctx.lineTo(busEndX + 8, busY - 10);
    ctx.moveTo(busEndX + 12, busY + 10);
    ctx.lineTo(busEndX + 8, busY + 10);
    
    ctx.stroke();
    
    // Distribute nodes along the bus
    const nodeSpacing = busWidth / (nodes.length + 1);
    
    // Draw nodes
    nodes.forEach((node, idx) => {
      const x = busStartX + nodeSpacing * (idx + 1);
      const y = busY;
      
      // Draw connector line
      ctx.beginPath();
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 40);
      ctx.stroke();
      
      // Draw node circle
      ctx.beginPath();
      ctx.fillStyle = node.id === selectedNode ? '#2563EB' : node.color || '#9CA3AF';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1;
      ctx.arc(x, y - 60, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw node label
      ctx.fillStyle = node.id === selectedNode ? '#FFFFFF' : '#111827';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.address.toString(), x, y - 60);
      
      // Store node position for click detection
      node.position = { x, y: y - 60, radius: 20 };
    });
    
    // Draw messages
    messages.forEach(message => {
      const sourceNode = nodes.find(n => n.id === message.source);
      const targetNode = nodes.find(n => n.id === message.target);
      
      if (!sourceNode || !sourceNode.position) return;
      
      // Calculate message position
      const progress = (Date.now() - message.startTime) / message.duration;
      
      if (progress <= 1) {
        let startX, endX;
        
        if (targetNode && targetNode.position) {
          // Message between two nodes
          startX = sourceNode.position.x;
          endX = targetNode.position.x;
        } else {
          // Broadcast message
          startX = sourceNode.position.x;
          endX = startX < canvas.width / 2 ? busEndX : busStartX;
        }
        
        const x = startX + (endX - startX) * progress;
        
        // Draw message
        ctx.beginPath();
        ctx.fillStyle = message.color || '#EF4444';
        ctx.arc(x, busY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw node names below
    ctx.fillStyle = '#111827';
    ctx.font = '12px Arial';
    nodes.forEach(node => {
      if (!node.position) return;
      
      ctx.fillText(node.name, node.position.x, node.position.y + 30);
    });
  }, [nodes, selectedNode, messages]);
  
  // Handle canvas click to select node
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on a node
    const clickedNode = nodes.find(node => {
      if (!node.position) return false;
      
      const dx = x - node.position.x;
      const dy = y - node.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance <= node.position.radius;
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode.id);
    }
  };
  
  // Get protocol-specific description
  const getProtocolDescription = () => {
    switch (protocol) {
      case 'J1939':
        return 'J1939 network with ECUs communicating via PGNs (Parameter Group Numbers).';
      case 'CANopen':
        return 'CANopen network with master and slave nodes using COB-IDs for communication.';
      case 'UDS':
        return 'UDS diagnostic session between tester and ECU.';
      default:
        return 'CAN network with nodes exchanging messages.';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-gray-900 mb-2">Network Topology</h3>
        <p className="text-sm text-gray-500">{getProtocolDescription()}</p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-md p-4">
        <canvas 
          ref={canvasRef} 
          className="w-full h-64"
          onClick={handleCanvasClick}
        />
      </div>
      
      <div className="bg-white border border-gray-200 rounded-md">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Node Details</h4>
        </div>
        
        <div className="p-4">
          {nodes.map(node => (
            <div 
              key={node.id}
              className={`mb-2 p-3 rounded-md cursor-pointer ${
                node.id === selectedNode ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50'
              }`}
              onClick={() => setSelectedNode(node.id)}
            >
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: node.color }}
                ></div>
                <div className="font-medium">{node.name}</div>
                <div className="ml-2 text-sm text-gray-500">Address: {node.address}</div>
                {node.id === selectedNode && (
                  <div className="ml-auto text-xs text-blue-600">Selected</div>
                )}
              </div>
              
              {node.id === selectedNode && (
                <div className="mt-2 text-sm text-gray-600">
                  <div>Role: {node.role || 'ECU'}</div>
                  <div>Status: {node.status || 'Online'}</div>
                  {protocol === 'J1939' && (
                    <div>
                      NAME: 0x{(Math.random() * 0xFFFFFFFFFFFFFFFF).toString(16).toUpperCase().substring(0, 16)}
                    </div>
                  )}
                  {protocol === 'CANopen' && (
                    <div>
                      State: {['Stopped', 'Pre-operational', 'Operational'][Math.floor(Math.random() * 3)]}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}