// src/pages/index.js
import { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import MCUSelector from '../components/steps/MCUSelector';
import OSSelector from '../components/steps/OSSelector';
import ProtocolSelector from '../components/steps/ProtocolSelector';
import DBCUploader from '../components/steps/DBCUploader';
import MessageEditor from '../components/steps/MessageEditor';
import CodePreview from '../components/CodePreview';
import PreviewDownload from '../components/steps/PreviewDownload'; // Import new component
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
        return <PreviewDownload config={config} onPrevious={handlePrevious} />;
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