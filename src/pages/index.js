import { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import MCUSelector from '../components/steps/MCUSelector';
import OSSelector from '../components/steps/OSSelector';
import ProtocolSelector from '../components/steps/ProtocolSelector';
import DBCUploader from '../components/steps/DBCUploader';
import MessageEditor from '../components/steps/MessageEditor';
import CodePreview from '../components/CodePreview';
import Header from '../components/Header';

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
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
    setConfig({ ...config, [key]: value });
  };
  
  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  
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
        return (
          <div className="p-6 bg-white rounded-md shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Preview & Download</h2>
            <div className="flex flex-col gap-4">
              <div className="bg-gray-100 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Configuration Summary</h3>
                <ul className="list-disc pl-5">
                  <li>MCU: {config.mcu}</li>
                  <li>OS: {config.os}</li>
                  <li>CAN FD: {config.canFD ? 'Enabled' : 'Disabled'}</li>
                  <li>ISO TP: {config.isoTP ? 'Enabled' : 'Disabled'}</li>
                  <li>Protocol: {config.protocol}</li>
                  <li>DBC File: {config.dbcFile ? config.dbcFile.name : 'None'}</li>
                  <li>Messages: {config.messages.length}</li>
                </ul>
              </div>
              <button 
                onClick={() => alert('Download functionality to be implemented')}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
              >
                Download ZIP
              </button>
              <button 
                onClick={handlePrevious}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition"
              >
                Back
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
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentStep={currentStep} setCurrentStep={setCurrentStep} />
        
        <main className="flex-1 flex flex-col overflow-auto">
          <div className="flex-1 p-6">
            {renderStep()}
          </div>
          
          <div className="h-64 border-t border-gray-200">
            <CodePreview config={config} />
          </div>
        </main>
      </div>
    </div>
  );
}
