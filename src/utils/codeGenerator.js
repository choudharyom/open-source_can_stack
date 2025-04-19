// This utility will generate code based on the configuration
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Generate code templates for different protocols
const generateProtocolSpecificCode = (config) => {
  switch (config.protocol) {
    case 'CAN':
      return {
        'can_protocol.h': `/* Basic CAN Protocol Implementation */
#ifndef CAN_PROTOCOL_H
#define CAN_PROTOCOL_H

#include "can_driver.h"

/* Initialize the CAN protocol layer */
void CAN_Protocol_Init(void);

/* Send a CAN message */
void CAN_Protocol_SendMessage(uint32_t id, uint8_t* data, uint8_t length);

/* Process received CAN messages */
void CAN_Protocol_ProcessMessages(void);

#endif /* CAN_PROTOCOL_H */`,
        'can_protocol.c': `/* Basic CAN Protocol Implementation */
#include "can_protocol.h"
#include "can_cfg.h"

/* Initialize the CAN protocol layer */
void CAN_Protocol_Init(void) {
  /* Register message handlers */
${config.messages.map(msg => `  CAN_RegisterMessageCallback(${msg.id}, ${msg.name.replace(/\s+/g, '')}Handler);`).join('\n')}
}

/* Send a CAN message */
void CAN_Protocol_SendMessage(uint32_t id, uint8_t* data, uint8_t length) {
  CAN_SendMessage(id, data, length);
}

/* Process received CAN messages */
void CAN_Protocol_ProcessMessages(void) {
  /* This is called periodically to process incoming messages */
  CAN_ProcessMessages();
}`
      };
      
    case 'CANopen':
      return {
        'canopen.h': `/* CANopen Protocol Implementation */
#ifndef CANOPEN_H
#define CANOPEN_H

#include "can_driver.h"

/* CANopen NMT states */
typedef enum {
  NMT_STATE_INITIALIZING = 0,
  NMT_STATE_STOPPED,
  NMT_STATE_OPERATIONAL,
  NMT_STATE_PRE_OPERATIONAL
} NMT_State_t;

/* Initialize the CANopen stack */
void CANopen_Init(uint8_t nodeId);

/* Process CANopen communication */
void CANopen_Process(void);

/* Transmit a PDO */
void CANopen_TransmitPDO(uint8_t pdoNum, uint8_t* data, uint8_t length);

/* Set the NMT state */
void CANopen_SetNMTState(NMT_State_t state);

#endif /* CANOPEN_H */`,
        'canopen.c': `/* CANopen Protocol Implementation */
#include "canopen.h"
#include "can_cfg.h"

/* CANopen node ID */
static uint8_t nodeId = 0;

/* Current NMT state */
static NMT_State_t nmtState = NMT_STATE_INITIALIZING;

/* Initialize the CANopen stack */
void CANopen_Init(uint8_t _nodeId) {
  nodeId = _nodeId;
  
  /* Register CANopen message handlers */
  CAN_RegisterMessageCallback(0x000, NMTCommandHandler);
  CAN_RegisterMessageCallback(0x600 + nodeId, SDOServerHandler);
  CAN_RegisterMessageCallback(0x700 + nodeId, HeartbeatHandler);
  
  /* Set initial state */
  nmtState = NMT_STATE_PRE_OPERATIONAL;
}

/* Process CANopen communication */
void CANopen_Process(void) {
  /* This is called periodically to process incoming messages */
  CAN_ProcessMessages();
  
  /* Send heartbeat if needed */
  static uint32_t lastHeartbeat = 0;
  uint32_t currentTime = /* Get system time */;
  
  if (currentTime - lastHeartbeat >= 1000) {
    uint8_t heartbeatData = nmtState;
    CAN_SendMessage(0x700 + nodeId, &heartbeatData, 1);
    lastHeartbeat = currentTime;
  }
}

/* Transmit a PDO */
void CANopen_TransmitPDO(uint8_t pdoNum, uint8_t* data, uint8_t length) {
  if (nmtState != NMT_STATE_OPERATIONAL) {
    return; /* PDOs are only transmitted in OPERATIONAL state */
  }
  
  /* PDO base IDs */
  uint32_t pdoBaseId = 0x180; /* TPDO1 base ID */
  
  switch (pdoNum) {
    case 1:
      pdoBaseId = 0x180;
      break;
    case 2:
      pdoBaseId = 0x280;
      break;
    case 3:
      pdoBaseId = 0x380;
      break;
    case 4:
      pdoBaseId = 0x480;
      break;
    default:
      return; /* Invalid PDO number */
  }
  
  CAN_SendMessage(pdoBaseId + nodeId, data, length);
}`
      };
      
    case 'J1939':
      return {
        'j1939.h': `/* SAE J1939 Protocol Implementation */
#ifndef J1939_H
#define J1939_H

#include "can_driver.h"

/* J1939 Address */
#define J1939_GLOBAL_ADDRESS      255
#define J1939_NULL_ADDRESS        254

/* J1939 PGN ranges */
#define J1939_PGN_REQUEST         0x00EA00
#define J1939_PGN_ADDRESS_CLAIMED 0x00EE00

/* Initialize the J1939 stack */
void J1939_Init(uint8_t preferredAddress);

/* Process J1939 communication */
void J1939_Process(void);

/* Transmit a J1939 message */
void J1939_TransmitMessage(uint32_t pgn, uint8_t destAddr, uint8_t* data, uint8_t length);

/* Get the current J1939 address */
uint8_t J1939_GetAddress(void);

#endif /* J1939_H */`,
        'j1939.c': `/* SAE J1939 Protocol Implementation */
#include "j1939.h"
#include "can_cfg.h"

/* J1939 node address */
static uint8_t j1939Address = J1939_NULL_ADDRESS;
static uint8_t preferredAddress = 0;

/* NAME fields for address claiming */
static uint64_t j1939Name = 0; /* Set your device's NAME value */

/* Initialize the J1939 stack */
void J1939_Init(uint8_t preferred) {
  preferredAddress = preferred;
  
  /* Initialize CAN driver */
  CAN_Init();
  
  /* Register J1939 message handlers */
  /* We register for all possible addresses since our address might change */
  
  /* Start address claim procedure */
  J1939_ClaimAddress(preferredAddress);
}

/* Process J1939 communication */
void J1939_Process(void) {
  /* This is called periodically to process incoming messages */
  CAN_ProcessMessages();
}

/* Transmit a J1939 message */
void J1939_TransmitMessage(uint32_t pgn, uint8_t destAddr, uint8_t* data, uint8_t length) {
  if (j1939Address == J1939_NULL_ADDRESS) {
    return; /* Cannot transmit without a valid address */
  }
  
  /* Construct J1939 29-bit ID */
  uint32_t id = (pgn << 8) | j1939Address;
  if (pgn & 0xF000) {
    /* PDU2 format */
    id = (pgn << 8) | j1939Address;
  } else {
    /* PDU1 format */
    id = (pgn << 8) | (destAddr << 8) | j1939Address;
  }
  
  CAN_SendMessage(id, data, length);
}`
      };
      
    case 'UDS':
      return {
        'uds.h': `/* UDS (ISO 14229) Protocol Implementation */
#ifndef UDS_H
#define UDS_H

#include "can_driver.h"

/* UDS service IDs */
#define UDS_SID_DIAGNOSTIC_SESSION_CONTROL     0x10
#define UDS_SID_ECU_RESET                      0x11
#define UDS_SID_SECURITY_ACCESS                0x27
#define UDS_SID_COMMUNICATION_CONTROL          0x28
#define UDS_SID_TESTER_PRESENT                 0x3E
#define UDS_SID_READ_DATA_BY_IDENTIFIER        0x22
#define UDS_SID_WRITE_DATA_BY_IDENTIFIER       0x2E
#define UDS_SID_ROUTINE_CONTROL                0x31

/* UDS response codes */
#define UDS_RESPONSE_POSITIVE                  0x00
#define UDS_RESPONSE_GENERAL_REJECT            0x10
#define UDS_RESPONSE_SERVICE_NOT_SUPPORTED     0x11
#define UDS_RESPONSE_BUSY_REPEAT_REQUEST       0x21
#define UDS_RESPONSE_CONDITIONS_NOT_CORRECT    0x22
#define UDS_RESPONSE_REQUEST_OUT_OF_RANGE      0x31
#define UDS_RESPONSE_SECURITY_ACCESS_DENIED    0x33

/* Initialize the UDS stack */
void UDS_Init(uint16_t rxId, uint16_t txId);

/* Process UDS communication */
void UDS_Process(void);

/* Send a positive response */
void UDS_SendPositiveResponse(uint8_t serviceId, uint8_t* data, uint16_t length);

/* Send a negative response */
void UDS_SendNegativeResponse(uint8_t serviceId, uint8_t responseCode);

#endif /* UDS_H */`,
        'uds.c': `/* UDS (ISO 14229) Protocol Implementation */
#include "uds.h"
#include "can_cfg.h"
#include "isotp.h" /* ISO-TP transport layer for segmented messages */

/* UDS CAN IDs */
static uint16_t udsRxId = 0;
static uint16_t udsTxId = 0;

/* Current session and security level */
static uint8_t currentSession = 1; /* Default session */
static uint8_t securityLevel = 0;  /* Not authenticated */

/* Initialize the UDS stack */
void UDS_Init(uint16_t rxId, uint16_t txId) {
  udsRxId = rxId;
  udsTxId = txId;
  
  /* Initialize ISO-TP layer */
  ISOTP_Init(rxId, txId);
  
  /* Register message callback */
  CAN_RegisterMessageCallback(rxId, UDS_MessageHandler);
}

/* Process UDS communication */
void UDS_Process(void) {
  /* This is called periodically to process incoming messages */
  CAN_ProcessMessages();
  
  /* Handle any pending ISO-TP segmented messages */
  ISOTP_Process();
}

/* Handle incoming UDS messages */
void UDS_MessageHandler(uint8_t* data, uint8_t length) {
  /* Process through ISO-TP first */
  ISOTP_ReceiveData(data, length);
  
  /* Once ISO-TP has a complete message, it will call UDS_ProcessMessage */
}

/* Process a complete UDS message */
void UDS_ProcessMessage(uint8_t* data, uint16_t length) {
  if (length < 1) {
    return; /* Invalid message */
  }
  
  uint8_t serviceId = data[0];
  
  /* Process different UDS services */
  switch (serviceId) {
    case UDS_SID_DIAGNOSTIC_SESSION_CONTROL:
      UDS_HandleSessionControl(data, length);
      break;
      
    case UDS_SID_ECU_RESET:
      UDS_HandleEcuReset(data, length);
      break;
      
    case UDS_SID_SECURITY_ACCESS:
      UDS_HandleSecurityAccess(data, length);
      break;
      
    case UDS_SID_TESTER_PRESENT:
      /* Simple response to keep session alive */
      if (length >= 2 && data[1] == 0x00) {
        UDS_SendPositiveResponse(serviceId, NULL, 0);
      }
      break;
    
    /* Add other service handlers here */
    
    default:
      /* Service not supported */
      UDS_SendNegativeResponse(serviceId, UDS_RESPONSE_SERVICE_NOT_SUPPORTED);
      break;
  }
}`
      };
      
    default:
      return {
        'protocol_undefined.h': `/* Protocol Layer Undefined */
#ifndef PROTOCOL_UNDEFINED_H
#define PROTOCOL_UNDEFINED_H

#include "can_driver.h"

/* Initialize the protocol layer */
void Protocol_Init(void);

/* Process protocol communication */
void Protocol_Process(void);

#endif /* PROTOCOL_UNDEFINED_H */`,
        'protocol_undefined.c': `/* Protocol Layer Undefined */
#include "protocol_undefined.h"

/* Initialize the protocol layer */
void Protocol_Init(void) {
  /* TODO: Implement protocol initialization */
}

/* Process protocol communication */
void Protocol_Process(void) {
  /* TODO: Implement protocol processing */
}`
      };
  }
};

// Generate OS-specific code
const generateOSSpecificCode = (config) => {
  switch (config.os) {
    case 'Bare-metal':
      return {
        'main.c': `/* Main application for bare-metal implementation */
#include <stdint.h>
#include "can_driver.h"
#include "can_cfg.h"
${config.protocol !== '' ? `#include "${config.protocol.toLowerCase()}.h"` : ''}

int main(void) {
  /* Initialize hardware and peripherals */
  SystemInit();
  
  /* Initialize CAN driver */
  CAN_Init();
  
  ${config.protocol !== '' ? 
    `/* Initialize ${config.protocol} protocol */
  ${config.protocol}_Init();` : 
    '/* No protocol selected */'}
  
  /* Main loop */
  while (1) {
    /* Process CAN messages */
    CAN_ProcessMessages();
    
    ${config.protocol !== '' ? 
      `/* Process ${config.protocol} protocol */
    ${config.protocol}_Process();` : 
      '/* No protocol processing */'}
  }
  
  /* This point should never be reached */
  return 0;
}`
      };
      
    case 'FreeRTOS':
      return {
        'main.c': `/* Main application for FreeRTOS implementation */
#include <stdint.h>
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "can_driver.h"
#include "can_cfg.h"
${config.protocol !== '' ? `#include "${config.protocol.toLowerCase()}.h"` : ''}

/* Task handles */
TaskHandle_t canRxTaskHandle;
TaskHandle_t canTxTaskHandle;
TaskHandle_t appTaskHandle;

/* Queue for CAN messages */
QueueHandle_t canTxQueue;

/* CAN receive task */
void canRxTask(void *pvParameters) {
  while (1) {
    /* Process incoming CAN messages */
    CAN_ProcessMessages();
    
    /* Small delay to prevent task starvation */
    vTaskDelay(pdMS_TO_TICKS(1));
  }
}

/* CAN transmit task */
void canTxTask(void *pvParameters) {
  CAN_Message_t message;
  
  while (1) {
    /* Wait for a message to be queued for transmission */
    if (xQueueReceive(canTxQueue, &message, portMAX_DELAY) == pdTRUE) {
      /* Transmit the message */
      CAN_SendMessage(message.id, message.data, message.dlc);
    }
  }
}

/* Application task */
void appTask(void *pvParameters) {
  /* Initialize protocol layer */
  ${config.protocol !== '' ? `${config.protocol}_Init();` : '/* No protocol selected */'}
  
  while (1) {
    /* Application logic */
    ${config.protocol !== '' ? 
      `/* Process ${config.protocol} protocol */
    ${config.protocol}_Process();` : 
      '/* No protocol processing */'}
    
    /* Periodic operations */
    
    /* Task delay */
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

int main(void) {
  /* Initialize hardware and peripherals */
  SystemInit();
  
  /* Initialize CAN driver */
  CAN_Init();
  
  /* Create queues */
  canTxQueue = xQueueCreate(10, sizeof(CAN_Message_t));
  
  /* Create tasks */
  xTaskCreate(canRxTask, "CAN_RX", configMINIMAL_STACK_SIZE, NULL, 3, &canRxTaskHandle);
  xTaskCreate(canTxTask, "CAN_TX", configMINIMAL_STACK_SIZE, NULL, 3, &canTxTaskHandle);
  xTaskCreate(appTask, "APP", configMINIMAL_STACK_SIZE * 2, NULL, 2, &appTaskHandle);
  
  /* Start the scheduler */
  vTaskStartScheduler();
  
  /* This point should never be reached */
  for (;;);
  return 0;
}`
      };
      
    case 'AUTOSAR':
      return {
        'Can_GeneralTypes.h': `/* AUTOSAR CAN general types */
#ifndef CAN_GENERALTYPES_H
#define CAN_GENERALTYPES_H

#include "Std_Types.h"

/* CAN controller states */
typedef enum {
  CAN_CS_UNINIT = 0,
  CAN_CS_STARTED,
  CAN_CS_STOPPED,
  CAN_CS_SLEEP
} Can_ControllerStateType;

/* CAN hardware object types */
typedef enum {
  CAN_OBJECT_TYPE_RECEIVE,
  CAN_OBJECT_TYPE_TRANSMIT
} Can_ObjectTypeType;

/* CAN ID types */
typedef enum {
  CAN_ID_TYPE_STANDARD,
  CAN_ID_TYPE_EXTENDED
} Can_IdTypeType;

/* CAN handle type */
typedef uint16 Can_HwHandleType;

/* CAN message type */
typedef struct {
  Can_IdTypeType id_type;  /* Standard or extended ID */
  uint32         id;       /* CAN identifier */
  uint8          length;   /* Data length code */
  uint8          data[8];  /* CAN message data */
} Can_PduType;

#endif /* CAN_GENERALTYPES_H */`,
        'Can_Cfg.h': `/* AUTOSAR CAN configuration */
#ifndef CAN_CFG_H
#define CAN_CFG_H

#include "Can_GeneralTypes.h"

/* CAN controller configuration */
#define CAN_CONTROLLER_ID      0
#define CAN_BAUDRATE           500000 /* 500 kbps */
#define CAN_FD_ENABLED         ${config.canFD ? '1' : '0'}
#define CAN_HOH_COUNT          ${config.messages.length + 5} /* Hardware Object Handles */

/* Hardware Object Handle configurations */
typedef struct {
  Can_ObjectTypeType type;  /* Receive or transmit */
  Can_IdTypeType id_type;   /* Standard or extended ID */
  uint32 id;                /* CAN identifier (or filter) */
  uint8 controller;         /* Controller ID this HOH belongs to */
} Can_HohConfigType;

/* CAN configuration */
typedef struct {
  uint8 controller_count;               /* Number of CAN controllers */
  uint8 hoh_count;                      /* Number of Hardware Object Handles */
  const Can_HohConfigType* hoh_config;  /* Hardware Object Handle configurations */
} Can_ConfigType;

/* External declaration of configuration */
extern const Can_ConfigType Can_Config;

#endif /* CAN_CFG_H */`,
        'Can.c': `/* AUTOSAR CAN driver implementation */
#include "Can.h"
#include "Can_Cfg.h"
#include "Det.h"  /* Development Error Tracer */
#include "CanIf_Cbk.h"  /* CAN Interface callbacks */

/* CAN controller states */
static Can_ControllerStateType Can_ControllerStates[1] = {CAN_CS_UNINIT};

/* CAN driver initialization */
Std_ReturnType Can_Init(const Can_ConfigType* Config) {
  /* Check for development errors */
  if (Config == NULL) {
    Det_ReportError(CAN_MODULE_ID, CAN_INSTANCE_ID, CAN_INIT_SID, CAN_E_PARAM_POINTER);
    return E_NOT_OK;
  }
  
  /* Initialize all configured CAN controllers */
  for (uint8 i = 0; i < Config->controller_count; i++) {
    /* Initialize controller hardware */
    /* ... */
    
    /* Set controller state */
    Can_ControllerStates[i] = CAN_CS_STOPPED;
  }
  
  return E_OK;
}

/* Set CAN controller mode */
Std_ReturnType Can_SetControllerMode(uint8 Controller, Can_ControllerStateType Transition) {
  /* Check for development errors */
  if (Controller >= 1) {
    Det_ReportError(CAN_MODULE_ID, CAN_INSTANCE_ID, CAN_SET_CONTROLLER_MODE_SID, CAN_E_PARAM_CONTROLLER);
    return E_NOT_OK;
  }
  
  /* Handle controller state transitions */
  switch (Transition) {
    case CAN_CS_STARTED:
      /* Start CAN controller */
      /* ... */
      Can_ControllerStates[Controller] = CAN_CS_STARTED;
      break;
      
    case CAN_CS_STOPPED:
      /* Stop CAN controller */
      /* ... */
      Can_ControllerStates[Controller] = CAN_CS_STOPPED;
      break;
      
    case CAN_CS_SLEEP:
      /* Put CAN controller to sleep */
      /* ... */
      Can_ControllerStates[Controller] = CAN_CS_SLEEP;
      break;
      
    default:
      Det_ReportError(CAN_MODULE_ID, CAN_INSTANCE_ID, CAN_SET_CONTROLLER_MODE_SID, CAN_E_PARAM_CONTROLLER_MODE);
      return E_NOT_OK;
  }
  
  return E_OK;
}

/* Write CAN message to the hardware buffer */
Std_ReturnType Can_Write(Can_HwHandleType Hth, const Can_PduType* PduInfo) {
  /* Check for development errors */
  if (PduInfo == NULL) {
    Det_ReportError(CAN_MODULE_ID, CAN_INSTANCE_ID, CAN_WRITE_SID, CAN_E_PARAM_POINTER);
    return E_NOT_OK;
  }
  
  if (Hth >= CAN_HOH_COUNT) {
    Det_ReportError(CAN_MODULE_ID, CAN_INSTANCE_ID, CAN_WRITE_SID, CAN_E_PARAM_HANDLE);
    return E_NOT_OK;
  }
  
  /* Check if HTH is a transmit handle */
  const Can_HohConfigType* hoh = &Can_Config.hoh_config[Hth];
  if (hoh->type != CAN_OBJECT_TYPE_TRANSMIT) {
    Det_ReportError(CAN_MODULE_ID, CAN_INSTANCE_ID, CAN_WRITE_SID, CAN_E_PARAM_HANDLE);
    return E_NOT_OK;
  }
  
  /* Check controller state */
  if (Can_ControllerStates[hoh->controller] != CAN_CS_STARTED) {
    return CAN_NOT_OK;
  }
  /* Write to hardware transmit buffer */
  /* ... */
  
  return CAN_OK;
}

/* Main function of the CAN driver */
void Can_MainFunction_Read(void) {
  /* Check for received messages and notify upper layers */
  /* ... */
}

/* Main function for transmit handling */
void Can_MainFunction_Write(void) {
  /* Handle transmit confirmations */
  /* ... */
}

/* Main function for bus-off handling */
void Can_MainFunction_BusOff(void) {
  /* Handle bus-off conditions */
  /* ... */
}

/* Main function for wakeup handling */
void Can_MainFunction_Wakeup(void) {
  /* Handle wakeup events */
  /* ... */
}

/* Main function for mode transitions */
void Can_MainFunction_Mode(void) {
  /* Handle pending mode transitions */
  /* ... */
}`
      };

    default:
      return {
        'main.c': `/* Main application */
#include <stdint.h>
#include "can_driver.h"
#include "can_cfg.h"

int main(void) {
  /* Initialize hardware and peripherals */
  SystemInit();
  
  /* Initialize CAN driver */
  CAN_Init();
  
  /* Main loop */
  while (1) {
    /* Process CAN messages */
    CAN_ProcessMessages();
  }
  
  /* This point should never be reached */
  return 0;
}`
      };
  }
};

// Generate MCU-specific driver code
const generateMCUSpecificCode = (config) => {
  switch (config.mcu) {
    case 'STM32F446':
      return {
        'stm32f4xx_can.c': `/* STM32F4xx CAN driver implementation */
#include "stm32f4xx.h"
#include "can_driver.h"
#include "can_cfg.h"

/* CAN controller instance */
CAN_TypeDef* CAN_Instance = CAN1;

/* Initialize CAN hardware */
void CAN_HW_Init(void) {
  /* Enable CAN clock */
  RCC->APB1ENR |= RCC_APB1ENR_CAN1EN;
  
  /* Configure CAN pins */
  /* ... */
  
  /* Enter initialization mode */
  CAN_Instance->MCR |= CAN_MCR_INRQ;
  while (!(CAN_Instance->MSR & CAN_MSR_INAK));
  
  /* Configure bit timing */
  CAN_Instance->BTR = 0;  /* Reset register */
  CAN_Instance->BTR |= (1 << 0);  /* SJW = 1 */
  CAN_Instance->BTR |= (3 << 16); /* BS1 = 4 */
  CAN_Instance->BTR |= (1 << 20); /* BS2 = 2 */
  CAN_Instance->BTR |= (4 << 0);  /* Prescaler = 5 (for 500 kbps @ 42 MHz) */
  
  /* Configure filters */
  /* ... */
  
  /* Exit initialization mode */
  CAN_Instance->MCR &= ~CAN_MCR_INRQ;
  while (CAN_Instance->MSR & CAN_MSR_INAK);
  
  /* Enable interrupts */
  CAN_Instance->IER |= CAN_IER_FMPIE0; /* FIFO 0 message pending interrupt */
  
  /* Enable CAN interrupts in NVIC */
  NVIC_EnableIRQ(CAN1_RX0_IRQn);
}

/* Send a CAN message */
void CAN_HW_SendMessage(uint32_t id, uint8_t* data, uint8_t length) {
  /* Wait for an empty mailbox */
  while ((CAN_Instance->TSR & CAN_TSR_TME) == 0);
  
  /* Get an empty mailbox */
  uint8_t mailbox = (CAN_Instance->TSR & CAN_TSR_CODE) >> 24;
  
  /* Setup identifier */
  if (id & 0x80000000) { /* Extended ID */
    CAN_Instance->sTxMailBox[mailbox].TIR = (id & 0x1FFFFFFF) | (1 << 2); /* IDE bit */
  } else { /* Standard ID */
    CAN_Instance->sTxMailBox[mailbox].TIR = (id & 0x7FF) << 21;
  }
  
  /* Setup data length */
  CAN_Instance->sTxMailBox[mailbox].TDTR = length & 0x0F;
  
  /* Setup data */
  CAN_Instance->sTxMailBox[mailbox].TDLR = 
    ((uint32_t)data[0] << 0) |
    ((uint32_t)data[1] << 8) |
    ((uint32_t)data[2] << 16) |
    ((uint32_t)data[3] << 24);
    
  CAN_Instance->sTxMailBox[mailbox].TDHR = 
    ((uint32_t)data[4] << 0) |
    ((uint32_t)data[5] << 8) |
    ((uint32_t)data[6] << 16) |
    ((uint32_t)data[7] << 24);
    
  /* Request transmission */
  CAN_Instance->sTxMailBox[mailbox].TIR |= 0x1; /* TXRQ bit */
}

/* CAN RX interrupt handler */
void CAN1_RX0_IRQHandler(void) {
  /* Check FIFO 0 message pending flag */
  if (CAN_Instance->RF0R & CAN_RF0R_FMP0) {
    /* Get message ID */
    uint32_t id;
    if (CAN_Instance->sFIFOMailBox[0].RIR & (1 << 2)) { /* IDE bit set = Extended ID */
      id = CAN_Instance->sFIFOMailBox[0].RIR & 0x1FFFFFFF;
      id |= 0x80000000; /* Mark as extended ID for software */
    } else { /* Standard ID */
      id = (CAN_Instance->sFIFOMailBox[0].RIR >> 21) & 0x7FF;
    }
    
    /* Get data length */
    uint8_t length = CAN_Instance->sFIFOMailBox[0].RDTR & 0x0F;
    
    /* Get data */
    uint8_t data[8];
    data[0] = (CAN_Instance->sFIFOMailBox[0].RDLR >> 0) & 0xFF;
    data[1] = (CAN_Instance->sFIFOMailBox[0].RDLR >> 8) & 0xFF;
    data[2] = (CAN_Instance->sFIFOMailBox[0].RDLR >> 16) & 0xFF;
    data[3] = (CAN_Instance->sFIFOMailBox[0].RDLR >> 24) & 0xFF;
    data[4] = (CAN_Instance->sFIFOMailBox[0].RDHR >> 0) & 0xFF;
    data[5] = (CAN_Instance->sFIFOMailBox[0].RDHR >> 8) & 0xFF;
    data[6] = (CAN_Instance->sFIFOMailBox[0].RDHR >> 16) & 0xFF;
    data[7] = (CAN_Instance->sFIFOMailBox[0].RDHR >> 24) & 0xFF;
    
    /* Process received message */
    CAN_ProcessReceivedMessage(id, data, length);
    
    /* Release FIFO */
    CAN_Instance->RF0R |= CAN_RF0R_RFOM0;
  }
}`
      };
    
    case 'S32K144':
      return {
        's32k144_can.c': `/* S32K144 CAN driver implementation */
#include "S32K144.h"
#include "can_driver.h"
#include "can_cfg.h"

/* Initialize CAN hardware */
void CAN_HW_Init(void) {
  /* Enable CAN clock */
  PCC->PCCn[PCC_FlexCAN0_INDEX] |= PCC_PCCn_CGC_MASK;
  
  /* Configure CAN pins */
  /* ... */
  
  /* Enter freeze mode */
  CAN0->MCR |= CAN_MCR_HALT_MASK | CAN_MCR_FRZ_MASK;
  while (!(CAN0->MCR & CAN_MCR_FRZACK_MASK));
  
  /* Configure bit timing for 500 kbps */
  CAN0->CTRL1 = 
    (0 << CAN_CTRL1_PRESDIV_SHIFT) | /* Prescaler = 1 */
    (7 << CAN_CTRL1_PSEG1_SHIFT) |   /* Phase Segment 1 = 8 */
    (3 << CAN_CTRL1_PSEG2_SHIFT) |   /* Phase Segment 2 = 4 */
    (3 << CAN_CTRL1_PROPSEG_SHIFT) | /* Propagation Segment = 4 */
    CAN_CTRL1_BOFFMSK_MASK;          /* Bus Off interrupt mask */
  
  /* Configure message buffers */
  for (int i = 0; i < 16; i++) {
    CAN0->MB[i].CS = 0;
    CAN0->MB[i].ID = 0;
    CAN0->MB[i].WORD0 = 0;
    CAN0->MB[i].WORD1 = 0;
  }
  
  /* Configure filters */
  for (int i = 0; i < 16; i++) {
    CAN0->RXIMR[i] = 0x1FFFFFFF; /* Match exact ID */
  }
  
  /* Exit freeze mode */
  CAN0->MCR &= ~(CAN_MCR_HALT_MASK | CAN_MCR_FRZ_MASK);
  while (CAN0->MCR & CAN_MCR_FRZACK_MASK);
  
  /* Enable interrupts */
  CAN0->IMASK1 = 0x00000001; /* Enable MB0 interrupt */
  
  /* Enable CAN interrupts in NVIC */
  NVIC_EnableIRQ(CAN0_ORed_Message_buffer_IRQn);
}

/* Send a CAN message */
void CAN_HW_SendMessage(uint32_t id, uint8_t* data, uint8_t length) {
  /* Wait for a free message buffer */
  while (CAN0->MB[1].CS & CAN_CS_CODE_MASK);
  
  /* Setup message buffer for transmission */
  if (id & 0x80000000) { /* Extended ID */
    CAN0->MB[1].ID = id & 0x1FFFFFFF;
    CAN0->MB[1].CS = (length << CAN_CS_DLC_SHIFT) | CAN_CS_IDE_MASK | (0xC << CAN_CS_CODE_SHIFT);
  } else { /* Standard ID */
    CAN0->MB[1].ID = (id & 0x7FF) << 18;
    CAN0->MB[1].CS = (length << CAN_CS_DLC_SHIFT) | (0xC << CAN_CS_CODE_SHIFT);
  }
  
  /* Setup data */
  CAN0->MB[1].WORD0 = 
    ((uint32_t)data[0] << 24) |
    ((uint32_t)data[1] << 16) |
    ((uint32_t)data[2] << 8) |
    ((uint32_t)data[3] << 0);
    
  CAN0->MB[1].WORD1 = 
    ((uint32_t)data[4] << 24) |
    ((uint32_t)data[5] << 16) |
    ((uint32_t)data[6] << 8) |
    ((uint32_t)data[7] << 0);
    
  /* Activate transmission */
  CAN0->MB[1].CS = (CAN0->MB[1].CS & ~CAN_CS_CODE_MASK) | (0xC << CAN_CS_CODE_SHIFT);
}

/* CAN interrupt handler */
void CAN0_ORed_Message_buffer_IRQHandler(void) {
  /* Check if MB0 caused the interrupt */
  if (CAN0->IFLAG1 & 0x00000001) {
    /* Get message ID */
    uint32_t id;
    if (CAN0->MB[0].CS & CAN_CS_IDE_MASK) { /* Extended ID */
      id = CAN0->MB[0].ID & 0x1FFFFFFF;
      id |= 0x80000000; /* Mark as extended ID for software */
    } else { /* Standard ID */
      id = (CAN0->MB[0].ID >> 18) & 0x7FF;
    }
    
    /* Get data length */
    uint8_t length = (CAN0->MB[0].CS & CAN_CS_DLC_MASK) >> CAN_CS_DLC_SHIFT;
    
    /* Get data */
    uint8_t data[8];
    data[0] = (CAN0->MB[0].WORD0 >> 24) & 0xFF;
    data[1] = (CAN0->MB[0].WORD0 >> 16) & 0xFF;
    data[2] = (CAN0->MB[0].WORD0 >> 8) & 0xFF;
    data[3] = (CAN0->MB[0].WORD0 >> 0) & 0xFF;
    data[4] = (CAN0->MB[0].WORD1 >> 24) & 0xFF;
    data[5] = (CAN0->MB[0].WORD1 >> 16) & 0xFF;
    data[6] = (CAN0->MB[0].WORD1 >> 8) & 0xFF;
    data[7] = (CAN0->MB[0].WORD1 >> 0) & 0xFF;
    
    /* Process received message */
    CAN_ProcessReceivedMessage(id, data, length);
    
    /* Clear the interrupt flag */
    CAN0->IFLAG1 = 0x00000001;
  }
}`
      };
      
    // Add other MCUs as needed
    
    default:
      return {
        'generic_can.c': `/* Generic CAN driver implementation */
#include "can_driver.h"
#include "can_cfg.h"

/* MCU-specific functions (to be implemented) */
extern void CAN_HW_Init(void);
extern void CAN_HW_SendMessage(uint32_t id, uint8_t* data, uint8_t length);

/* Initialize CAN hardware */
void CAN_Init(void) {
  /* Initialize hardware-specific CAN controller */
  CAN_HW_Init();
  
  /* Initialize callback registry */
  /* ... */
}

/* Send a CAN message */
void CAN_SendMessage(uint32_t id, uint8_t* data, uint8_t length) {
  CAN_HW_SendMessage(id, data, length);
}

/* Process received CAN message */
void CAN_ProcessReceivedMessage(uint32_t id, uint8_t* data, uint8_t length) {
  /* Find registered callback for this ID */
  /* Call the callback if found */
  /* ... */
}`
      };
  }
};

// Generate common code files regardless of configuration
const generateCommonCode = (config) => {
  return {
    'can_driver.h': `/* CAN driver header */
#ifndef CAN_DRIVER_H
#define CAN_DRIVER_H

#include <stdint.h>

/* CAN message callback function type */
typedef void (*CAN_CallbackFunction)(uint8_t* data, uint8_t length);

/* Initialize CAN hardware */
void CAN_Init(void);

/* Register a callback function for a specific CAN ID */
void CAN_RegisterMessageCallback(uint32_t id, CAN_CallbackFunction callback);

/* Process CAN messages (called in main loop or ISR) */
void CAN_ProcessMessages(void);

/* Send a CAN message */
void CAN_SendMessage(uint32_t id, uint8_t* data, uint8_t length);

/* Process a received CAN message (called by hardware-specific code) */
void CAN_ProcessReceivedMessage(uint32_t id, uint8_t* data, uint8_t length);

/* Message handler functions */
${config.messages.map(msg => `void ${msg.name.replace(/\s+/g, '')}Handler(uint8_t* data, uint8_t length);`).join('\n')}

#endif /* CAN_DRIVER_H */`,

    'can_driver.c': `/* CAN driver implementation */
#include "can_driver.h"
#include "can_cfg.h"

/* Callback registry */
#define MAX_CALLBACKS 32
static struct {
  uint32_t id;
  CAN_CallbackFunction callback;
} callbacks[MAX_CALLBACKS];
static uint8_t callbackCount = 0;

/* Register a callback for a specific CAN ID */
void CAN_RegisterMessageCallback(uint32_t id, CAN_CallbackFunction callback) {
  if (callbackCount < MAX_CALLBACKS) {
    callbacks[callbackCount].id = id;
    callbacks[callbackCount].callback = callback;
    callbackCount++;
  }
}

/* Process CAN messages */
void CAN_ProcessMessages(void) {
  /* Hardware-specific polling (if needed) */
  /* Most implementations will use interrupts instead */
}

/* Process a received CAN message */
void CAN_ProcessReceivedMessage(uint32_t id, uint8_t* data, uint8_t length) {
  /* Find and call registered callback */
  for (uint8_t i = 0; i < callbackCount; i++) {
    if (callbacks[i].id == id) {
      callbacks[i].callback(data, length);
      break;
    }
  }
}

/* Message handlers */
${config.messages.map(msg => `
void ${msg.name.replace(/\s+/g, '')}Handler(uint8_t* data, uint8_t length) {
  /* TODO: Implement message handling for ${msg.name} (ID: ${msg.id}) */
}`).join('\n')}`,

    'can_cfg.h': `/* CAN configuration */
#ifndef CAN_CFG_H
#define CAN_CFG_H

/* Target MCU: ${config.mcu} */
/* Operating System: ${config.os} */

/* CAN configuration */
#define CAN_BAUDRATE 500000
#define CAN_FD_ENABLED ${config.canFD ? '1' : '0'}
#define ISO_TP_ENABLED ${config.isoTP ? '1' : '0'}

/* Protocol: ${config.protocol} */

/* Message IDs */
${config.messages.map(msg => `#define ${msg.name.replace(/\s+/g, '').toUpperCase()}_ID ${msg.id}`).join('\n')}

#endif /* CAN_CFG_H */`,

    'README.md': `# CAN Stack for ${config.mcu}

Generated CAN stack for automotive applications.

## Configuration Summary

- **Target MCU:** ${config.mcu}
- **Operating System:** ${config.os}
- **Protocol:** ${config.protocol}
- **CAN FD Support:** ${config.canFD ? 'Enabled' : 'Disabled'}
- **ISO-TP Support:** ${config.isoTP ? 'Enabled' : 'Disabled'}

## Message Definitions

${config.messages.map(msg => `- **${msg.name}** (ID: ${msg.id})`).join('\n')}

## Building the Project

1. Configure your toolchain for the ${config.mcu} microcontroller
2. Add the source files to your build system
3. Compile and flash to your target hardware

## Customization

- Modify \`can_cfg.h\` to change CAN parameters
- Implement message handler functions in \`can_driver.c\`
- Add hardware-specific code if needed

## License

This generated code is provided as-is without warranty.
`
  };
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