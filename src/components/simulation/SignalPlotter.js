import { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function SignalPlotter({ 
  trackedSignals, 
  onRemoveSignal, 
  simulationEngine,
  running
}) {
  const [signalData, setSignalData] = useState({});
  const [timeWindow, setTimeWindow] = useState(10); // Time window in seconds
  const [autoScale, setAutoScale] = useState(true);
  const [yMin, setYMin] = useState(0);
  const [yMax, setYMax] = useState(100);
  
  // Reference to chart update interval
  const updateIntervalRef = useRef(null);
  
  // Initialize signal data
  useEffect(() => {
    const initialData = {};
    trackedSignals.forEach(signal => {
      initialData[signal.key] = {
        timestamps: [],
        values: [],
        minValue: Infinity,
        maxValue: -Infinity,
        lastValue: null,
        color: signal.color
      };
    });
    setSignalData(initialData);
  }, []);
  
  // Update tracked signals
  useEffect(() => {
    // Add new signals
    trackedSignals.forEach(signal => {
      if (!signalData[signal.key]) {
        setSignalData(prev => ({
          ...prev,
          [signal.key]: {
            timestamps: [],
            values: [],
            minValue: Infinity,
            maxValue: -Infinity,
            lastValue: null,
            color: signal.color
          }
        }));
      }
    });
    
    // Remove signals that are no longer tracked
    Object.keys(signalData).forEach(key => {
      if (!trackedSignals.some(s => s.key === key)) {
        setSignalData(prev => {
          const newData = { ...prev };
          delete newData[key];
          return newData;
        });
      }
    });
  }, [trackedSignals]);
  
  // Start/stop update interval based on simulation running state
  useEffect(() => {
    if (running) {
      // Start updating signal data
      updateIntervalRef.current = setInterval(() => {
        if (!simulationEngine) return;
        
        const now = simulationEngine.getSimulationTime();
        
        // Update each tracked signal
        trackedSignals.forEach(signal => {
          const value = simulationEngine.getSignalValue(signal.messageId, signal.signalName);
          
          if (value !== undefined && signalData[signal.key]) {
            setSignalData(prev => {
              const signalHistory = prev[signal.key];
              
              // Add new data point
              const newTimestamps = [...signalHistory.timestamps, now];
              const newValues = [...signalHistory.values, value];
              
              // Keep only data points within the time window
              const cutoffTime = now - (timeWindow * 1000);
              const startIdx = newTimestamps.findIndex(t => t >= cutoffTime);
              
              const trimmedTimestamps = startIdx > 0 ? newTimestamps.slice(startIdx) : newTimestamps;
              const trimmedValues = startIdx > 0 ? newValues.slice(startIdx) : newValues;
              
              // Update min/max values
              const currentMin = Math.min(...trimmedValues);
              const currentMax = Math.max(...trimmedValues);
              
              return {
                ...prev,
                [signal.key]: {
                  ...signalHistory,
                  timestamps: trimmedTimestamps,
                  values: trimmedValues,
                  minValue: currentMin,
                  maxValue: currentMax,
                  lastValue: value
                }
              };
            });
          }
        });
      }, 100); // Update every 100ms
      
      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };
    } else if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
  }, [running, trackedSignals, simulationEngine, timeWindow]);
  
  // Prepare chart data
  const getChartData = () => {
    // Find global min/max timestamps across all signals
    let allTimestamps = [];
    Object.values(signalData).forEach(signal => {
      allTimestamps = [...allTimestamps, ...signal.timestamps];
    });
    
    // Sort and deduplicate timestamps
    const uniqueTimestamps = [...new Set(allTimestamps)].sort((a, b) => a - b);
    
    // Convert to seconds and make relative to start
    const startTime = uniqueTimestamps.length > 0 ? uniqueTimestamps[0] : 0;
    const labels = uniqueTimestamps.map(t => ((t - startTime) / 1000).toFixed(2));
    
    // Prepare datasets
    const datasets = Object.entries(signalData).map(([key, signal]) => {
      const trackedSignal = trackedSignals.find(s => s.key === key);
      
      return {
        label: trackedSignal ? `${trackedSignal.signalName} (${trackedSignal.messageId})` : key,
        data: signal.values,
        borderColor: signal.color,
        backgroundColor: `${signal.color}40`, // Add transparency
        borderWidth: 2,
        pointRadius: signal.values.length > 50 ? 0 : 2, // Hide points if too many
        tension: 0.1, // Slight smoothing
      };
    });
    
    return {
      labels,
      datasets
    };
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0 // Disable animations for performance
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (seconds)'
        }
      },
      y: {
        beginAtZero: false,
        min: autoScale ? undefined : yMin,
        max: autoScale ? undefined : yMax,
        title: {
          display: true,
          text: 'Value'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => {
            return `Time: ${tooltipItems[0].label}s`;
          }
        }
      }
    }
  };
  
  // Calculate global min/max values
  const calculateGlobalMinMax = () => {
    let globalMin = Infinity;
    let globalMax = -Infinity;
    
    Object.values(signalData).forEach(signal => {
      if (signal.minValue < globalMin) globalMin = signal.minValue;
      if (signal.maxValue > globalMax) globalMax = signal.maxValue;
    });
    
    // Add 10% padding
    const range = globalMax - globalMin;
    globalMin = globalMin - range * 0.1;
    globalMax = globalMax + range * 0.1;
    
    return { globalMin, globalMax };
  };
  
  // Update auto-scaling
  useEffect(() => {
    if (autoScale && Object.keys(signalData).length > 0) {
      const { globalMin, globalMax } = calculateGlobalMinMax();
      setYMin(globalMin);
      setYMax(globalMax);
    }
  }, [signalData, autoScale]);
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-gray-900 mb-2">Signal Plotter</h3>
        
        {trackedSignals.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            {trackedSignals.map(signal => (
              <div 
                key={signal.key}
                className="flex items-center bg-white px-3 py-1 rounded-full border"
                style={{ borderColor: signal.color }}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: signal.color }}
                ></div>
                <span className="text-sm">{signal.signalName}</span>
                <span className="text-xs text-gray-500 ml-1">({signal.messageId})</span>
                <button
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  onClick={() => onRemoveSignal(signal.key)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            
            <div className="flex items-center ml-auto space-x-4">
              <div className="flex items-center">
                <label className="text-sm text-gray-700 mr-2">Window:</label>
                <select
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(parseInt(e.target.value))}
                >
                  <option value="5">5s</option>
                  <option value="10">10s</option>
                  <option value="30">30s</option>
                  <option value="60">60s</option>
                  <option value="300">5m</option>
                </select>
              </div>
              
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={autoScale}
                  onChange={(e) => setAutoScale(e.target.checked)}
                />
                <span className="ml-2">Auto-scale</span>
              </label>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No signals are being tracked. Go to "Message Traffic" tab and click "Track" on a signal to start plotting.
          </p>
        )}
      </div>
      
      {trackedSignals.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="h-80">
              <Line data={getChartData()} options={chartOptions} />
            </div>
          </div>
          
          {!autoScale && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <label className="text-sm text-gray-700 mr-2">Y-Min:</label>
                <input
                  type="number"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={yMin}
                  onChange={(e) => setYMin(parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="flex items-center">
                <label className="text-sm text-gray-700 mr-2">Y-Max:</label>
                <input
                  type="number"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={yMax}
                  onChange={(e) => setYMax(parseFloat(e.target.value) || 100)}
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {trackedSignals.map(signal => {
              const data = signalData[signal.key];
              if (!data) return null;
              
              return (
                <div 
                  key={signal.key}
                  className="bg-white border rounded-md p-4"
                  style={{ borderColor: data.color }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{signal.signalName}</h4>
                      <div className="text-xs text-gray-500">{signal.messageId}</div>
                    </div>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: data.color }}
                    ></div>
                  </div>
                  
                  <div className="mt-2 text-2xl font-bold">
                    {data.lastValue !== null ? data.lastValue.toFixed(2) : '-'}
                  </div>
                  
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>Min: {data.minValue !== Infinity ? data.minValue.toFixed(2) : '-'}</div>
                    <div>Max: {data.maxValue !== -Infinity ? data.maxValue.toFixed(2) : '-'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}