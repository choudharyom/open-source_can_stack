import { useState, useEffect } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import MobileSidebar from '../components/MobileSidebar';
import MCUSelector from '../components/steps/MCUSelector';
import OSSelector from '../components/steps/OSSelector';
import ProtocolSelector from '../components/steps/ProtocolSelector';
import DBCUploader from '../components/steps/DBCUploader';
import MessageEditor from '../components/steps/MessageEditor';
import PreviewDownload from '../components/steps/PreviewDownload'; // Added import
import CodePreview from '../components/CodePreview';
import Header from '../components/Header';
import CANSimulator from '../components/simulation/CANSimulator';

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [config, setConfig] = useState({
    mcu: '',
    os: '',
    canFD: false,
    isoTP: false,
    protocol: '',
    dbcFile: null,
    messages: [
      { id: '0x100', name: 'Engine Status', signals: [] },
      { id: '0x200', name: 'Sample Message 2', signals: [] },
    ],
  });
  
  const updateConfig = (key, value) => {
    console.log(`[index.js] Request to update config: ${key} =`, value);
    setConfig(prevConfig => {
      const newState = {
        ...prevConfig,
        [key]: value
      };
      console.log('[index.js] Updated state:', newState);
      return newState;
    });
  };

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  
  // Close sidebar when changing steps on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [currentStep]);
  
  // Render current step based on currentStep value
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <MCUSelector config={config} updateConfig={updateConfig} onNext={handleNext} />;
      case 2:
        return <OSSelector config={config} updateConfig={updateConfig} onNext={handleNext} onPrevious={handlePrevious} />;
      case 3:
        return <ProtocolSelector config={config} updateConfig={updateConfig} onNext={handleNext} onPrevious={handlePrevious} />;
      case 4:
        return <DBCUploader config={config} updateConfig={updateConfig} onNext={handleNext} onPrevious={handlePrevious} />;
      case 5:
        return <MessageEditor config={config} updateConfig={updateConfig} onNext={handleNext} onPrevious={handlePrevious} />;
      case 6:
        return <PreviewDownload config={config} onPrevious={handlePrevious} />;
      case 7:
        return (
          <div className="p-4 md:p-6 bg-white rounded-md shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Simulation Environment</h2>
            <CANSimulator config={config} />
            
            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePrevious}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Back to Preview
              </button>
            </div>
          </div>
        );  
      default:
        return null;
      }
    };
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Head>
          <title>CAN Stack Generator</title>
          <meta name="description" content="Generate CAN stack code for automotive applications" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar currentStep={currentStep} setCurrentStep={setCurrentStep} />
          </div>
          
          {/* Mobile Sidebar */}
          <MobileSidebar 
            isOpen={sidebarOpen} 
            setIsOpen={setSidebarOpen}
            currentStep={currentStep} 
            setCurrentStep={setCurrentStep} 
          />
          
          <main className="flex-1 flex flex-col overflow-auto">
            <div className="flex-1 p-4 md:p-6">
              {renderStep()}
            </div>
            
            <div className="h-48 md:h-64 border-t border-gray-200">
              <CodePreview config={config} />
            </div>
          </main>
        </div>
      </div>
    );
  }
