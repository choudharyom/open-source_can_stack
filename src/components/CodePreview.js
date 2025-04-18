// src/components/CodePreview.js
import { useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c'; // Include C language support
import 'prismjs/components/prism-json'; // Include JSON language support

export default function CodePreview({ config }) {
  const [selectedFile, setSelectedFile] = useState('main.c');

  const files = [
    { name: 'main.c', language: 'c' },
    { name: 'can_cfg.h', language: 'c' },
    { name: 'can_driver.c', language: 'c' },
    { name: 'can_driver.h', language: 'c' },
    { name: 'project.json', language: 'json' },
  ];

  const getCodeForFile = (fileName) => {
    switch (fileName) {
      case 'main.c':
        return `/* Generated CAN Stack - main.c */\n\n#include "can_driver.h"\n#include <stdio.h>\n\nint main(void) {\n  /* Initialize CAN driver for ${config?.mcu || 'TMS57OLS3137'} */\n  CAN_Init();\n  \n  /* Register message callbacks */\n  CAN_RegisterMessageCallback(0x100, EngineStatusHandler);\n  \n  while(1) {\n    /* Process CAN messages */\n    CAN_ProcessMessages();\n  }\n  \n  return 0;\n}`;
      case 'can_cfg.h':
        return `/* Generated CAN Stack - can_cfg.h */\n\n#ifndef CAN_CFG_H\n#define CAN_CFG_H\n\n/* Target MCU: ${config?.mcu || 'TMS57OLS3137'} */\n/* Operating System: ${config?.os || 'None'} */\n\n#define CAN_BAUDRATE 500000\n#define CAN_FD_ENABLED ${config?.canFD ? '1' : '0'}\n#define ISO_TP_ENABLED ${config?.isoTP ? '1' : '0'}\n\n/* Protocol: ${config?.protocol || 'CAN'} */\n\n/* Message IDs */\n#define ENGINE_STATUS_ID 0x100\n\n#endif /* CAN_CFG_H */`;
      case 'can_driver.c':
        return `/* Generated CAN Stack - can_driver.c */\n\n#include "can_driver.h"\n#include "can_cfg.h"\n\n/* CAN controller initialization for ${config?.mcu || 'TMS57OLS3137'} */\nvoid CAN_Init(void) {\n  /* Initialize CAN hardware */\n  /* ${config?.os === 'AUTOSAR' ? 'Using AUTOSAR CAN Interface' : 'Using Direct Hardware Access'} */\n}\n\n/* Register a callback function for a specific CAN ID */\nvoid CAN_RegisterMessageCallback(uint32_t id, CAN_CallbackFunction callback) {\n  /* Register callback in lookup table */\n}\n\n/* Process incoming CAN messages */\nvoid CAN_ProcessMessages(void) {\n  /* Check for new messages and call appropriate callbacks */\n}`;
      case 'can_driver.h':
        return `/* Generated CAN Stack - can_driver.h */\n\n#ifndef CAN_DRIVER_H\n#define CAN_DRIVER_H\n\n#include <stdint.h>\n\ntypedef void (*CAN_CallbackFunction)(uint8_t*, uint8_t);\n\n/* CAN driver API */\nvoid CAN_Init(void);\nvoid CAN_RegisterMessageCallback(uint32_t id, CAN_CallbackFunction callback);\nvoid CAN_ProcessMessages(void);\nvoid CAN_SendMessage(uint32_t id, uint8_t* data, uint8_t length);\n\n/* Message handler prototypes */\nvoid EngineStatusHandler(uint8_t* data, uint8_t length);\n\n#endif /* CAN_DRIVER_H */`;
      case 'project.json':
        return `{\n  "project": "CAN Stack Generator",\n  "configuration": {\n    "mcu": "${config?.mcu || 'TMS57OLS3137'}",\n    "os": "${config?.os || 'None'}",\n    "canFD": ${config?.canFD ?? false},\n    "isoTP": ${config?.isoTP ?? false},\n    "protocol": "${config?.protocol || 'CAN'}"\n  },\n  "messages": [\n    {\n      "id": "0x100",\n      "name": "Engine Status",\n      "signals": []\n    },\n    {\n      "id": "0x200",\n      "name": "Sample Message 2",\n      "signals": []\n    }\n  ]\n}`;
      default:
        return '// No content for this file';
    }
  };

  useEffect(() => {
    Prism.highlightAll();
  }, [selectedFile]);

  return (
    <div className="code-preview">
      <div className="file-tabs">
        {files.map((file) => (
          <div
            key={file.name}
            className={`file-tab ${selectedFile === file.name ? 'active' : ''}`}
            onClick={() => setSelectedFile(file.name)}
          >
            {file.name}
          </div>
        ))}
      </div>
      <pre className="mt-0 rounded-t-none">
        <code className={`language-${files.find((f) => f.name === selectedFile)?.language}`}>
          {getCodeForFile(selectedFile)}
        </code>
      </pre>
    </div>
  );
}