// Generates CANopen protocol specific code files

export const generateCanopenCode = (canopenConfig) => {
  // Use default Node ID if not provided in config
  const nodeId = canopenConfig?.nodeId || 1; // Default to Node ID 1

  // Placeholder for getting system time - needs platform-specific implementation
  const getSystemTimePlaceholder = '/* Get system time (platform specific) */';

  return {
    'canopen.h': `/* CANopen Protocol Implementation */
#ifndef CANOPEN_H
#define CANOPEN_H

#include "can_driver.h"

/* CANopen NMT states */
typedef enum {
  NMT_STATE_INITIALIZING = 0,
  NMT_STATE_STOPPED      = 4, // Value according to CiA 301
  NMT_STATE_OPERATIONAL  = 5, // Value according to CiA 301
  NMT_STATE_PRE_OPERATIONAL = 127 // Value according to CiA 301
} NMT_State_t;

/* Initialize the CANopen stack */
void CANopen_Init(uint8_t nodeId);

/* Process CANopen communication */
void CANopen_Process(void);

/* Transmit a PDO */
// Note: PDO configuration (mapping, COB-ID) is usually done via Object Dictionary
// This function assumes fixed TPDO COB-IDs for simplicity
void CANopen_TransmitPDO(uint8_t pdoNum, uint8_t* data, uint8_t length);

/* Set the NMT state (usually done internally based on NMT commands) */
void CANopen_SetNMTState(NMT_State_t state);

/* Get the current NMT state */
NMT_State_t CANopen_GetNMTState(void);

/* --- Object Dictionary Access (Example) --- */
// These would typically be generated based on an OD file (e.g., EDS/DCF)
// For now, just placeholders
#define OD_INDEX_DEVICE_TYPE      0x1000
#define OD_INDEX_HEARTBEAT_PRODUCER 0x1017

// Function to read from Object Dictionary (simplified)
uint32_t CANopen_ReadOD(uint16_t index, uint8_t subIndex);

// Function to write to Object Dictionary (simplified)
uint8_t CANopen_WriteOD(uint16_t index, uint8_t subIndex, uint32_t value);


#endif /* CANOPEN_H */`,
    'canopen.c': `/* CANopen Protocol Implementation */
#include "canopen.h"
#include "can_cfg.h" // For CAN driver access
#include "can_driver.h" // For CAN functions

/* CANopen node ID */
static uint8_t canopenNodeId = 0;

/* Current NMT state */
static NMT_State_t currentNmtState = NMT_STATE_INITIALIZING;

/* Heartbeat producer time (Object Dictionary 0x1017) */
static uint16_t heartbeatTimeMs = 1000; // Default 1 second
static uint32_t lastHeartbeatTimestamp = 0;

/* Forward declarations for internal handlers */
static void NMTCommandHandler(uint8_t* data, uint8_t length);
static void SDOServerHandler(uint8_t* data, uint8_t length);
// Add declarations for PDO handlers if needed based on OD config

/* Initialize the CANopen stack */
void CANopen_Init(uint8_t _nodeId) {
  canopenNodeId = _nodeId;
  if (canopenNodeId == 0 || canopenNodeId > 127) {
      // Handle invalid Node ID error
      // For now, default to 1 if invalid
      canopenNodeId = 1;
  }

  /* Initialize Object Dictionary (if dynamic) */
  // OD_Init(); // Placeholder

  /* Read initial configuration from OD (e.g., Heartbeat time) */
  // heartbeatTimeMs = (uint16_t)CANopen_ReadOD(OD_INDEX_HEARTBEAT_PRODUCER, 0);

  /* Register CANopen message handlers */
  CAN_RegisterMessageCallback(0x000, NMTCommandHandler); // NMT Command
  CAN_RegisterMessageCallback(0x600 + canopenNodeId, SDOServerHandler); // SDO Request from Master
  // RPDOs would be registered here based on OD configuration (0x200+NodeID, 0x300+NodeID, etc.)
  // Example: CAN_RegisterMessageCallback(0x200 + canopenNodeId, RPDO1_Handler);

  /* Set initial state */
  CANopen_SetNMTState(NMT_STATE_PRE_OPERATIONAL);

  /* Send Boot-up message */
  uint8_t bootupData[1] = {0}; // NMT state 0 = Boot-up
  CAN_SendMessage(0x700 + canopenNodeId, bootupData, 1);
  lastHeartbeatTimestamp = ${getSystemTimePlaceholder}; // Initialize timestamp
}

/* Process CANopen communication */
void CANopen_Process(void) {
  /* This is called periodically */

  /* Process incoming CAN messages (if not interrupt driven) */
  // CAN_ProcessMessages(); // Assumes CAN driver handles reception

  /* Handle Heartbeat Protocol */
  if (heartbeatTimeMs > 0 && currentNmtState != NMT_STATE_INITIALIZING) {
    uint32_t currentTime = ${getSystemTimePlaceholder};
    if (currentTime - lastHeartbeatTimestamp >= heartbeatTimeMs) {
      uint8_t heartbeatData = currentNmtState;
      CAN_SendMessage(0x700 + canopenNodeId, &heartbeatData, 1);
      lastHeartbeatTimestamp = currentTime;
    }
  }

  /* Handle other periodic tasks (e.g., TPDO event timers) */
}

/* Transmit a PDO */
void CANopen_TransmitPDO(uint8_t pdoNum, uint8_t* data, uint8_t length) {
  if (currentNmtState != NMT_STATE_OPERATIONAL) {
    return; /* PDOs are only transmitted in OPERATIONAL state (usually) */
  }

  /* Determine PDO COB-ID based on pdoNum and OD configuration */
  /* This is highly simplified - real OD lookup is needed */
  uint32_t pdoCobId = 0;
  switch (pdoNum) {
    case 1: pdoCobId = 0x180 + canopenNodeId; break; // TPDO1
    case 2: pdoCobId = 0x280 + canopenNodeId; break; // TPDO2
    case 3: pdoCobId = 0x380 + canopenNodeId; break; // TPDO3
    case 4: pdoCobId = 0x480 + canopenNodeId; break; // TPDO4
    default: return; /* Invalid or unconfigured PDO number */
  }

  if (pdoCobId != 0) {
      CAN_SendMessage(pdoCobId, data, length);
  }
}

/* Set the NMT state */
void CANopen_SetNMTState(NMT_State_t state) {
    // Add logic here to handle transitions if needed (e.g., stop PDOs when entering STOPPED)
    currentNmtState = state;
    // Optionally send heartbeat immediately on state change
    // uint8_t heartbeatData = currentNmtState;
    // CAN_SendMessage(0x700 + canopenNodeId, &heartbeatData, 1);
    // lastHeartbeatTimestamp = ${getSystemTimePlaceholder};
}

/* Get the current NMT state */
NMT_State_t CANopen_GetNMTState(void) {
    return currentNmtState;
}


/* --- Internal Handlers --- */

static void NMTCommandHandler(uint8_t* data, uint8_t length) {
    if (length != 2) return; // NMT command format: [CS | NodeID]

    uint8_t commandSpecifier = data[0];
    uint8_t targetNodeId = data[1];

    // Check if the command is for this node or broadcast
    if (targetNodeId == 0 || targetNodeId == canopenNodeId) {
        switch (commandSpecifier) {
            case 1:   // Start Remote Node
                CANopen_SetNMTState(NMT_STATE_OPERATIONAL);
                break;
            case 2:   // Stop Remote Node
                CANopen_SetNMTState(NMT_STATE_STOPPED);
                break;
            case 128: // Enter Pre-Operational
                CANopen_SetNMTState(NMT_STATE_PRE_OPERATIONAL);
                break;
            case 129: // Reset Node
                // Trigger a software reset (platform specific)
                // NVIC_SystemReset(); // Example for ARM Cortex-M
                break;
            case 130: // Reset Communication
                CANopen_Init(canopenNodeId); // Re-initialize CANopen stack
                break;
            default:
                // Unknown command
                break;
        }
    }
}

static void SDOServerHandler(uint8_t* data, uint8_t length) {
    // Placeholder for SDO Server implementation
    // This involves parsing the SDO command specifier (ccs), index, subIndex,
    // interacting with the Object Dictionary, and sending SDO responses.
    // This is a complex state machine.
    // Example: Send "Abort - Service not implemented"
    uint8_t abortResponse[8] = {0x80, 0x00, 0x00, 0x00, 0x01, 0x06, 0x00, 0x05}; // Abort code for "Unsupported access"
    // Need to extract Index and SubIndex from request to put in response
    // CAN_SendMessage(0x580 + canopenNodeId, abortResponse, 8);
}

/* --- Object Dictionary Access (Simplified Example) --- */

// Example OD storage (replace with proper implementation)
static uint32_t od_device_type = 0x00010192; // Example: IO Module profile
static uint16_t od_heartbeat_time = 1000;

uint32_t CANopen_ReadOD(uint16_t index, uint8_t subIndex) {
    switch (index) {
        case OD_INDEX_DEVICE_TYPE:
            if (subIndex == 0) return od_device_type;
            break;
        case OD_INDEX_HEARTBEAT_PRODUCER:
            if (subIndex == 0) return od_heartbeat_time;
            break;
        // Add other OD entries
    }
    return 0; // Or indicate error
}

uint8_t CANopen_WriteOD(uint16_t index, uint8_t subIndex, uint32_t value) {
    switch (index) {
        case OD_INDEX_HEARTBEAT_PRODUCER:
            if (subIndex == 0) {
                od_heartbeat_time = (uint16_t)value;
                heartbeatTimeMs = od_heartbeat_time; // Update internal variable
                return 0; // Success
            }
            break;
        // Add other writable OD entries
    }
    return 1; // Indicate error (e.g., read-only, subindex invalid)
}

`
  };
};
