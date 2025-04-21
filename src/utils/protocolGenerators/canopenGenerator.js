// Generates CANopen protocol specific code files

export const generateCanopenCode = (canopenConfig) => {
  // Use default Node ID if not provided in config
  const nodeId = canopenConfig?.nodeId || 1; // Default to Node ID 1

  // Placeholder for getting system time - needs platform-specific implementation
  const getSystemTimePlaceholder = '/* Get system time (platform specific) */';

  // Initialize the object to hold the generated files
  const codeFiles = {};

  // --- Generate canopen.h ---
  codeFiles['canopen.h'] = `/* CANopen Protocol Implementation */
#ifndef CANOPEN_H
#define CANOPEN_H

#include "can_driver.h"
#include <stdint.h> // For standard integer types
#include <stdbool.h> // For bool type

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
// For now, just placeholders - Real access uses OD functions below
#define OD_INDEX_DEVICE_TYPE      0x1000
#define OD_INDEX_HEARTBEAT_PRODUCER 0x1017

// Function to read from Object Dictionary (simplified)
// Returns true on success, false on error (e.g., not found)
// 'value' is an output parameter, 'size' is input/output (max size/actual size)
bool CANopen_ReadOD(uint16_t index, uint8_t subIndex, void* value, uint32_t* size);

// Function to write to Object Dictionary (simplified)
// Returns true on success, false on error (e.g., read-only, not found)
bool CANopen_WriteOD(uint16_t index, uint8_t subIndex, const void* value, uint32_t size);


#endif /* CANOPEN_H */`;

  // --- Generate canopen.c ---
  codeFiles['canopen.c'] = `/* CANopen Protocol Implementation */
#include "canopen.h"
#include "canopen_od.h" // Include Object Dictionary definitions
#include "can_cfg.h" // For CAN driver access
#include "can_driver.h" // For CAN functions
#include <string.h> // For memcpy, memcmp

/* CANopen node ID */
static uint8_t canopenNodeId = 0;

/* Current NMT state */
static NMT_State_t currentNmtState = NMT_STATE_INITIALIZING;

/* Heartbeat producer time (read from OD) */
static uint16_t heartbeatTimeMs = 0; // Initialized from OD
static uint32_t lastHeartbeatTimestamp = 0;

/* Forward declarations for internal handlers */
static void NMTCommandHandler(uint32_t canId, uint8_t* data, uint8_t length);
static void SDOServerHandler(uint32_t canId, uint8_t* data, uint8_t length);
// Add declarations for PDO handlers if needed based on OD config

/* Initialize the CANopen stack */
void CANopen_Init(uint8_t _nodeId) {
  canopenNodeId = _nodeId;
  if (canopenNodeId == 0 || canopenNodeId > 127) {
      // Handle invalid Node ID error - Use ID from OD or default
      canopenNodeId = CANOPEN_NODE_ID;
  }

  /* Initialize Object Dictionary */
  OD_Init(); // Initialize OD variables if needed (usually done statically)

  /* Read initial configuration from OD */
  uint32_t size = sizeof(heartbeatTimeMs);
  if (!CANopen_ReadOD(OD_INDEX_HEARTBEAT_PRODUCER, 0, &heartbeatTimeMs, &size)) {
      // Error reading heartbeat time, use default from config header
      heartbeatTimeMs = CANOPEN_HEARTBEAT_TIME;
  }

  /* Register CANopen message handlers */
  CAN_RegisterMessageCallback(0x000, NMTCommandHandler); // NMT Command (COB-ID 0)
  CAN_RegisterMessageCallback(0x600 + canopenNodeId, SDOServerHandler); // SDO Request from Master

  // TODO: Register RPDO handlers based on OD configuration
  // Example:
  // #if CANOPEN_RPDO1_ENABLED
  // CAN_RegisterMessageCallback(0x200 + canopenNodeId, RPDO1_Handler);
  // #endif
  // #if CANOPEN_RPDO2_ENABLED
  // CAN_RegisterMessageCallback(0x300 + canopenNodeId, RPDO2_Handler);
  // #endif
  // ... etc.

  /* Set initial state */
  #if CANOPEN_AUTO_START
    CANopen_SetNMTState(NMT_STATE_OPERATIONAL);
  #else
    CANopen_SetNMTState(NMT_STATE_PRE_OPERATIONAL);
  #endif

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

  /* Handle other periodic tasks (e.g., TPDO event timers, SDO timeouts) */
}

/* Transmit a PDO */
void CANopen_TransmitPDO(uint8_t pdoNum, uint8_t* data, uint8_t length) {
  // TODO: Check OD TPDO Communication Parameter (Transmission Type)
  // For now, only allow transmission in OPERATIONAL state
  if (currentNmtState != NMT_STATE_OPERATIONAL) {
    return; /* PDOs are only transmitted in OPERATIONAL state (usually) */
  }

  /* Determine PDO COB-ID based on pdoNum and OD configuration */
  // TODO: Read COB-ID from OD (e.g., Index 0x1800 + pdoNum - 1, Subindex 1)
  uint32_t pdoCobId = 0;
  switch (pdoNum) {
    #if CANOPEN_TPDO1_ENABLED
    case 1: pdoCobId = 0x180 + canopenNodeId; break; // Default TPDO1 COB-ID
    #endif
    #if CANOPEN_TPDO2_ENABLED
    case 2: pdoCobId = 0x280 + canopenNodeId; break; // Default TPDO2 COB-ID
    #endif
    #if CANOPEN_TPDO3_ENABLED
    case 3: pdoCobId = 0x380 + canopenNodeId; break; // Default TPDO3 COB-ID
    #endif
    #if CANOPEN_TPDO4_ENABLED
    case 4: pdoCobId = 0x480 + canopenNodeId; break; // Default TPDO4 COB-ID
    #endif
    default: return; /* Invalid or unconfigured PDO number */
  }

  if (pdoCobId != 0) {
      // TODO: Check PDO length against OD configuration (Index 0x1A00 + pdoNum - 1)
      CAN_SendMessage(pdoCobId, data, length);
  }
}

/* Set the NMT state */
void CANopen_SetNMTState(NMT_State_t state) {
    // Add logic here to handle transitions if needed (e.g., stop PDOs when entering STOPPED)
    if (currentNmtState != state) {
        currentNmtState = state;
        // Optionally send heartbeat immediately on state change
        uint8_t heartbeatData = currentNmtState;
        CAN_SendMessage(0x700 + canopenNodeId, &heartbeatData, 1);
        lastHeartbeatTimestamp = ${getSystemTimePlaceholder};
    }
}

/* Get the current NMT state */
NMT_State_t CANopen_GetNMTState(void) {
    return currentNmtState;
}

/* Find OD entry */
static const OD_Entry_t* FindODEntry(uint16_t index, uint8_t subIndex) {
    // Use the generated OD_Entries array
    for (int i = 0; i < OD_ENTRY_COUNT; i++) {
        // Convert index/subindex from FindODEntry call to hex for comparison if needed,
        // or ensure OD_Entries stores them consistently (e.g., always decimal or always hex)
        // Assuming OD_Entries stores index/subIndex as parsed (likely decimal from config)
        if (OD_Entries[i].index == index && OD_Entries[i].subIndex == subIndex) {
            return &OD_Entries[i];
        }
    }
    return NULL; // Not found
}


/* Get size of OD data type from OD_Entry_t */
// This function is now less necessary if size is stored in OD_Entry_t
// static uint32_t GetDataTypeSize(uint8_t dataType) { ... }
// Instead, use entry->length directly


/* --- Object Dictionary Access Implementation --- */

bool CANopen_ReadOD(uint16_t index, uint8_t subIndex, void* value, uint32_t* size) {
    const OD_Entry_t* entry = FindODEntry(index, subIndex);
    if (!entry || !entry->dataPtr || !value || !size) {
        return false; // Not found or invalid arguments
    }

    // Check access rights (using simplified defines from canopen_od.h)
    if (!(entry->accessType == CANOPEN_ACCESS_RO || entry->accessType == CANOPEN_ACCESS_RW ||
          entry->accessType == CANOPEN_ACCESS_CONST /* Add RWR/RWW if used */ )) {
        // Note: CiA 301 access types are more complex (bit fields)
        return false; // Write-only or invalid access
    }

    uint32_t dataSize = entry->length; // Use length from OD entry

    // Special handling for strings if needed (e.g., actual length vs max length)
    if (entry->dataType == CANOPEN_DATA_TYPE_VISIBLE_STRING) {
       // Option 1: Return actual string length (excluding null terminator)
       // dataSize = strlen((char*)entry->dataPtr);
       // Option 2: Return max length (already stored in entry->length) - safer for buffer checks
       dataSize = entry->length; // Assuming entry->length is max buffer size
    }
    // OCTET_STRING usually uses the full length field

    if (*size < dataSize) {
         *size = dataSize; // Return required size
         return false; // Buffer too small
    }

    memcpy(value, entry->dataPtr, dataSize);
    *size = dataSize; // Return actual size copied (or max size for strings)
    return true;
}

bool CANopen_WriteOD(uint16_t index, uint8_t subIndex, const void* value, uint32_t size) {
    const OD_Entry_t* entry = FindODEntry(index, subIndex);
    if (!entry || !entry->dataPtr || !value) {
        return false; // Not found or invalid arguments
    }

    // Check access rights (using simplified defines)
    if (!(entry->accessType == CANOPEN_ACCESS_WO || entry->accessType == CANOPEN_ACCESS_RW /* Add RWW if used */)) {
        return false; // Read-only, const, or invalid access
    }

    uint32_t expectedSize = entry->length; // Use length from OD entry

    // Handle variable size types (strings, domains)
    if (entry->dataType == CANOPEN_DATA_TYPE_VISIBLE_STRING || entry->dataType == CANOPEN_DATA_TYPE_OCTET_STRING || entry->dataType == CANOPEN_DATA_TYPE_DOMAIN ) {
        if (size > expectedSize) { // Check against max length defined in OD
             return false; // Data too large for buffer
        }
        memcpy(entry->dataPtr, value, size);
        // Null-terminate VISIBLE_STRING if space allows and size < max length
        if (entry->dataType == CANOPEN_DATA_TYPE_VISIBLE_STRING && size < expectedSize) {
            ((char*)entry->dataPtr)[size] = '\\0';
        }
        // No size check needed here as we already verified size <= expectedSize
    } else {
        // Fixed size types
        if (size != expectedSize) {
            return false; // Incorrect data size
        }
        memcpy(entry->dataPtr, value, size);
    }


    // Optional: Add range checks or value validation here based on OD info if available

    // Prevent writing to heartbeat time if it's currently running (optional safety)
    // if (index == OD_INDEX_HEARTBEAT_PRODUCER && subIndex == 0 && currentNmtState != NMT_STATE_PRE_OPERATIONAL) {
    //     return false; // Example: Disallow changing heartbeat time while operational
    // }


    // If heartbeat time was written, update the internal variable
    if (index == OD_INDEX_HEARTBEAT_PRODUCER && subIndex == 0) {
        // Ensure the write was successful before updating
        heartbeatTimeMs = *(uint16_t*)entry->dataPtr;
    }

    // TODO: Trigger PDO update if a mapped object changed (based on OD mapping parameters)
    // This requires checking TPDO mapping objects (0x1A00 - 0x1A03, etc.)

    return true;
}


/* --- Internal Handlers --- */

static void NMTCommandHandler(uint32_t canId, uint8_t* data, uint8_t length) {
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
                // Example: NVIC_SystemReset();
                // Ensure response is sent before reset if required by application
                break;
            case 130: // Reset Communication
                // Re-initialize CANopen stack parameters from OD
                CANopen_Init(canopenNodeId); // Re-run init
                break;
            default:
                // Unknown command
                break;
        }
    }
}

// SDO Abort Codes (CiA 301) - Keep these defines
#define SDO_ABORT_TOGGLE_BIT_NOT_ALTERNATED        0x05030000
#define SDO_ABORT_TIMEOUT                          0x05040000
#define SDO_ABORT_INVALID_COMMAND_SPECIFIER        0x05040001
#define SDO_ABORT_INVALID_BLOCK_SIZE               0x05040002
#define SDO_ABORT_INVALID_SEQUENCE_NUMBER          0x05040003
#define SDO_ABORT_CRC_ERROR                        0x05040004
#define SDO_ABORT_OUT_OF_MEMORY                    0x05040005
#define SDO_ABORT_UNSUPPORTED_ACCESS               0x06010000
#define SDO_ABORT_READ_WRITE_ONLY                  0x06010001 // Attempt to read write-only / write read-only
#define SDO_ABORT_OBJECT_NOT_FOUND                 0x06020000
#define SDO_ABORT_OBJECT_CANT_BE_MAPPED            0x06040041
#define SDO_ABORT_PDO_LENGTH_EXCEEDED              0x06040042
#define SDO_ABORT_GENERAL_PARAMETER_INCOMPATIBILITY 0x06040043
#define SDO_ABORT_GENERAL_INTERNAL_INCOMPATIBILITY 0x06040047
#define SDO_ABORT_HARDWARE_ERROR                   0x06060000
#define SDO_ABORT_DATA_TYPE_MISMATCH_LENGTH        0x06070010
#define SDO_ABORT_DATA_TYPE_MISMATCH_HI_LO         0x06070012 // Data type mismatch, service parameter too high/low
#define SDO_ABORT_SUBINDEX_NOT_FOUND               0x06090011
#define SDO_ABORT_INVALID_VALUE_FOR_PARAM          0x06090030 // Written value out of range
#define SDO_ABORT_VALUE_TOO_HIGH                   0x06090031
#define SDO_ABORT_VALUE_TOO_LOW                    0x06090032
#define SDO_ABORT_MAX_VALUE_LESS_THAN_MIN          0x06090036
#define SDO_ABORT_GENERAL_ERROR                    0x08000000
#define SDO_ABORT_DATA_CANNOT_BE_TRANSFERRED       0x08000020 // Data cannot be transferred or stored
#define SDO_ABORT_DATA_STATE_MISMATCH              0x08000021 // Data cannot be transferred or stored due to local control/device state
#define SDO_ABORT_OD_MISSING                       0x08000022 // Data cannot be transferred - OD missing


static void SendSDOAbort(uint16_t index, uint8_t subIndex, uint32_t abortCode) {
    uint8_t response[8] = {0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
    response[1] = index & 0xFF;
    response[2] = (index >> 8) & 0xFF;
    response[3] = subIndex;
    response[4] = abortCode & 0xFF;
    response[5] = (abortCode >> 8) & 0xFF;
    response[6] = (abortCode >> 16) & 0xFF;
    response[7] = (abortCode >> 24) & 0xFF;
    CAN_SendMessage(0x580 + canopenNodeId, response, 8);
}


static void SDOServerHandler(uint32_t canId, uint8_t* data, uint8_t length) {
    if (length != 8) return; // SDO messages are always 8 bytes

    uint8_t commandSpecifier = data[0];
    uint16_t index = (uint16_t)data[1] | ((uint16_t)data[2] << 8);
    uint8_t subIndex = data[3];

    // --- Expedited SDO Download (Write Request) ---
    // ccs = 1 (0b001xxxxx)
    if ((commandSpecifier & 0xE0) == 0x20) {
        bool n_bit = (commandSpecifier >> 1) & 1; // Indicates size is specified
        bool e_bit = (commandSpecifier >> 0) & 1; // Indicates expedited transfer
        uint8_t size_indicator = (commandSpecifier >> 2) & 0x03; // Number of bytes NOT containing data

        if (!e_bit) { // Segmented or block transfer not supported in this basic example
             SendSDOAbort(index, subIndex, SDO_ABORT_INVALID_COMMAND_SPECIFIER); // Or SDO_ABORT_UNSUPPORTED_ACCESS
             return;
        }

        uint32_t dataSize = 0;
        uint8_t dataOffset = 4;
        if (n_bit) { // Size specified in byte 0 (s bit must be 1)
            dataSize = 4 - size_indicator;
             if (!((commandSpecifier >> 1) & 1)) { // Check s bit (must be 1 if n=1)
                SendSDOAbort(index, subIndex, SDO_ABORT_INVALID_COMMAND_SPECIFIER);
                return;
             }
        } else { // Data contained in bytes 4-7 (s bit must be 0)
            dataSize = 4 - size_indicator;
            if (((commandSpecifier >> 1) & 1)) { // Check s bit (must be 0 if n=0)
                SendSDOAbort(index, subIndex, SDO_ABORT_INVALID_COMMAND_SPECIFIER);
                return;
             }
        }


        if (dataSize > 4) { // Should not happen for expedited if parsed correctly
             SendSDOAbort(index, subIndex, SDO_ABORT_INVALID_COMMAND_SPECIFIER);
             return;
        }

        // Find OD entry
        const OD_Entry_t* entry = FindODEntry(index, subIndex);
        if (!entry) {
            // Distinguish between SubIndex not found and Object not found if possible
            // This requires checking if the index exists with other subindices.
            // Simple approach:
            SendSDOAbort(index, subIndex, SDO_ABORT_OBJECT_NOT_FOUND); // Or SDO_ABORT_SUBINDEX_NOT_FOUND
            return;
        }
         if (!(entry->accessType == CANOPEN_ACCESS_WO || entry->accessType == CANOPEN_ACCESS_RW /* || RWW */)) {
            SendSDOAbort(index, subIndex, SDO_ABORT_READ_WRITE_ONLY);
            return;
        }

        // Check data size consistency for non-string/domain types
        if (entry->dataType != CANOPEN_DATA_TYPE_VISIBLE_STRING &&
            entry->dataType != CANOPEN_DATA_TYPE_OCTET_STRING &&
            entry->dataType != CANOPEN_DATA_TYPE_DOMAIN)
        {
            if (dataSize != entry->length) {
                 SendSDOAbort(index, subIndex, SDO_ABORT_DATA_TYPE_MISMATCH_LENGTH);
                 return;
            }
        } else {
             // For strings/domains, check if received size exceeds max length
             if (dataSize > entry->length) {
                 SendSDOAbort(index, subIndex, SDO_ABORT_DATA_TYPE_MISMATCH_LENGTH); // Or potentially 0x06090030 Invalid Value
                 return;
             }
        }


        // Write the data using the updated WriteOD function
        if (CANopen_WriteOD(index, subIndex, &data[dataOffset], dataSize)) {
            // Send positive response: scs = 3 (0b01100000)
            uint8_t response[8] = {0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
            response[1] = index & 0xFF;
            response[2] = (index >> 8) & 0xFF;
            response[3] = subIndex;
            CAN_SendMessage(0x580 + canopenNodeId, response, 8);
        } else {
            // Write failed (e.g., value out of range, internal error, length mismatch handled above)
            // Determine appropriate abort code based on WriteOD failure reason (needs more detailed error reporting from WriteOD if possible)
            // Common reasons: value out of range, conditions not correct
            SendSDOAbort(index, subIndex, SDO_ABORT_GENERAL_ERROR); // Generic error for now, refine if possible
        }

    }
    // --- SDO Upload (Read Request) ---
    // ccs = 2 (0b010xxxxx)
    else if ((commandSpecifier & 0xE0) == 0x40) {
         // Find OD entry
        const OD_Entry_t* entry = FindODEntry(index, subIndex);
        if (!entry) {
            SendSDOAbort(index, subIndex, SDO_ABORT_OBJECT_NOT_FOUND); // Or SDO_ABORT_SUBINDEX_NOT_FOUND
            return;
        }
         if (!(entry->accessType == CANOPEN_ACCESS_RO || entry->accessType == CANOPEN_ACCESS_RW ||
               entry->accessType == CANOPEN_ACCESS_CONST /* || RWR || RWW */)) {
            SendSDOAbort(index, subIndex, SDO_ABORT_READ_WRITE_ONLY);
            return;
        }

        uint8_t response[8] = {0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
        response[1] = index & 0xFF;
        response[2] = (index >> 8) & 0xFF;
        response[3] = subIndex;

        uint32_t dataSize = entry->length; // Get expected size from OD

        if (dataSize <= 4) { // Expedited response possible
            uint32_t readSize = 4; // Provide buffer size for ReadOD
            if (CANopen_ReadOD(index, subIndex, &response[4], &readSize)) {
                 // Ensure readSize matches expected dataSize from OD
                 if (readSize != dataSize) {
                     // This indicates an internal inconsistency
                     SendSDOAbort(index, subIndex, SDO_ABORT_GENERAL_INTERNAL_INCOMPATIBILITY);
                     return;
                 }
                // Set scs bits: e=1 (expedited), s=1 (size indicated), n = 4 - dataSize
                uint8_t n_indicator = 4 - dataSize;
                response[0] = 0x40 | (n_indicator << 2) | (1 << 1) | (1 << 0); // Set e=1, s=1
                CAN_SendMessage(0x580 + canopenNodeId, response, 8);
            } else {
                 // Read failed (e.g., internal error, should be rare if entry found)
                 SendSDOAbort(index, subIndex, SDO_ABORT_GENERAL_ERROR);
            }
        } else {
            // Segmented transfer required - not supported in this basic example
            // Send SDO Abort - Data cannot be transferred this way
             SendSDOAbort(index, subIndex, SDO_ABORT_DATA_CANNOT_BE_TRANSFERRED); // Or GENERAL_ERROR
        }

    }
    // --- Other command specifiers (Abort, Block transfer) ---
    else {
        // Abort or unsupported command
        SendSDOAbort(index, subIndex, SDO_ABORT_INVALID_COMMAND_SPECIFIER);
    }
}

`;

  // --- Generate canopen_od.h ---
  codeFiles['canopen_od.h'] = `/* CANopen Object Dictionary Header */
#ifndef CANOPEN_OD_H
#define CANOPEN_OD_H

#include "canopen.h" // Includes stdint.h, stdbool.h

/* Node configuration from Config */
#define CANOPEN_NODE_ID ${canopenConfig?.nodeId || 1}
#define CANOPEN_HEARTBEAT_TIME ${canopenConfig?.heartbeatTime || 1000} /* Default producer time in ms */
#define CANOPEN_LSS_ENABLED ${canopenConfig?.enableLSS ? 1 : 0}
#define CANOPEN_AUTO_START ${canopenConfig?.autoStart ? 1 : 0} /* Start in Operational state? */

/* PDO configuration from Config */
${(canopenConfig?.tpdos || []).map(pdoNum =>
  `#define CANOPEN_TPDO${pdoNum}_ENABLED 1`
).join('\n')}
${(canopenConfig?.rpdos || []).map(pdoNum =>
  `#define CANOPEN_RPDO${pdoNum}_ENABLED 1`
).join('\n')}

/* SDO Server Timeout */
#define CANOPEN_SDO_TIMEOUT ${canopenConfig?.sdoTimeout || 1000} /* Timeout in ms */

/* Object Dictionary Entries */
/* Number of entries in the Object Dictionary */
#define OD_ENTRY_COUNT ${canopenConfig?.objects ? canopenConfig.objects.length : 0}

/* Object Dictionary Structure */
typedef struct {
    uint16_t index;
    uint8_t subIndex;
    uint8_t objectType;  /* CANOPEN_OBJECT_TYPE_* */
    uint8_t dataType;    /* CANOPEN_DATA_TYPE_* */
    uint8_t accessType;  /* CANOPEN_ACCESS_* */
    uint32_t length;     /* Data length in bytes (for strings/domains, max length) */
    void* dataPtr;       /* Pointer to the actual data */
    // void* defaultValuePtr; /* Optional: Pointer to default value */
} OD_Entry_t;

/* Object types (CiA 301) */
#define CANOPEN_OBJECT_TYPE_NULL      0
#define CANOPEN_OBJECT_TYPE_DOMAIN    2
#define CANOPEN_OBJECT_TYPE_DEFTYPE   5
#define CANOPEN_OBJECT_TYPE_DEFSTRUCT 6
#define CANOPEN_OBJECT_TYPE_VAR       7
#define CANOPEN_OBJECT_TYPE_ARRAY     8
#define CANOPEN_OBJECT_TYPE_RECORD    9

/* Data types (CiA 301) */
#define CANOPEN_DATA_TYPE_BOOLEAN         0x01
#define CANOPEN_DATA_TYPE_INTEGER8        0x02
#define CANOPEN_DATA_TYPE_INTEGER16       0x03
#define CANOPEN_DATA_TYPE_INTEGER32       0x04
#define CANOPEN_DATA_TYPE_UNSIGNED8       0x05
#define CANOPEN_DATA_TYPE_UNSIGNED16      0x06
#define CANOPEN_DATA_TYPE_UNSIGNED32      0x07
#define CANOPEN_DATA_TYPE_REAL32          0x08
#define CANOPEN_DATA_TYPE_VISIBLE_STRING  0x09
#define CANOPEN_DATA_TYPE_OCTET_STRING    0x0A
#define CANOPEN_DATA_TYPE_UNICODE_STRING  0x0B
#define CANOPEN_DATA_TYPE_TIME_OF_DAY     0x0C
#define CANOPEN_DATA_TYPE_TIME_DIFFERENCE 0x0D
#define CANOPEN_DATA_TYPE_DOMAIN          0x0F
#define CANOPEN_DATA_TYPE_INTEGER24       0x10
#define CANOPEN_DATA_TYPE_REAL64          0x11
#define CANOPEN_DATA_TYPE_INTEGER40       0x12
#define CANOPEN_DATA_TYPE_INTEGER48       0x13
#define CANOPEN_DATA_TYPE_INTEGER56       0x14
#define CANOPEN_DATA_TYPE_INTEGER64       0x15
#define CANOPEN_DATA_TYPE_UNSIGNED24      0x16
#define CANOPEN_DATA_TYPE_UNSIGNED40      0x18
#define CANOPEN_DATA_TYPE_UNSIGNED48      0x19
#define CANOPEN_DATA_TYPE_UNSIGNED56      0x1A
#define CANOPEN_DATA_TYPE_UNSIGNED64      0x1B

/* Access types (Simplified - see CiA 301 for full bit definitions) */
#define CANOPEN_ACCESS_RO    0x01  /* Read Only */
#define CANOPEN_ACCESS_WO    0x02  /* Write Only */
#define CANOPEN_ACCESS_RW    0x03  /* Read/Write */
#define CANOPEN_ACCESS_CONST 0x04  /* Constant value (read-only) */
// Note: Real CiA 301 access types combine read/write/map bits.
// Example: RW mappable = 7 (0b111)

/* Initialize Object Dictionary (if needed, e.g., load from NVM) */
void OD_Init(void);

/* Object Dictionary declaration */
extern const OD_Entry_t OD_Entries[OD_ENTRY_COUNT];

#endif /* CANOPEN_OD_H *`;

  // --- Generate canopen_od.c ---
  codeFiles['canopen_od.c'] = `/* CANopen Object Dictionary Implementation */
#include "canopen_od.h"
#include <string.h> // For strlen, potentially memcpy if defaults were dynamic

/* Object Dictionary Storage - Define static variables for OD entries */
${canopenConfig?.objects ? canopenConfig.objects.map(obj => {
  let cType = 'uint8_t'; // Default C type
  let cSize = 1;
  let initializer = obj.defaultValue || '0'; // Default initializer

  // Determine C type and size based on CANopen dataType
  switch (obj.dataType?.toUpperCase()) {
    case 'BOOLEAN': cType = 'bool'; cSize = sizeof(bool); initializer = (obj.defaultValue?.toLowerCase() === 'true' || obj.defaultValue === '1') ? 'true' : 'false'; break;
    case 'INTEGER8': cType = 'int8_t'; cSize = sizeof(int8_t); initializer = parseInt(obj.defaultValue || '0').toString(); break;
    case 'INTEGER16': cType = 'int16_t'; cSize = sizeof(int16_t); initializer = parseInt(obj.defaultValue || '0').toString(); break;
    case 'INTEGER32': cType = 'int32_t'; cSize = sizeof(int32_t); initializer = parseInt(obj.defaultValue || '0').toString(); break;
    case 'UNSIGNED8': cType = 'uint8_t'; cSize = sizeof(uint8_t); initializer = parseInt(obj.defaultValue || '0').toString(); break;
    case 'UNSIGNED16': cType = 'uint16_t'; cSize = sizeof(uint16_t); initializer = parseInt(obj.defaultValue || '0').toString(); break;
    case 'UNSIGNED32': cType = 'uint32_t'; cSize = sizeof(uint32_t); initializer = parseInt(obj.defaultValue || '0').toString(); break;
    case 'REAL32': cType = 'float'; cSize = sizeof(float); initializer = parseFloat(obj.defaultValue || '0.0').toString(); break;
    // Add cases for other fixed-size types (INTEGER64, UNSIGNED64, REAL64, etc.) if needed
    // ...

    case 'VISIBLE_STRING':
    case 'OCTET_STRING':
    case 'UNICODE_STRING': // Note: UNICODE often needs wchar_t or specific handling
    case 'DOMAIN': 
      cType = 'uint8_t'; // Store byte arrays as uint8_t arrays
      cSize = parseInt(obj.length || '32'); // Use specified length or default
      if (obj.dataType?.toUpperCase() === 'VISIBLE_STRING') {
         // Ensure initializer is a valid C string literal, escape backslashes and quotes
         initializer = `"${(obj.defaultValue || '')
                            .replace(/\\/g, '\\\\') // Escape backslashes first
                            .replace(/"/g, '\\"')   // Then escape double quotes
                          }"`;
         // For string types, the C array needs space for the null terminator if initialized with a string literal
         // However, CANopen VISIBLE_STRING doesn't mandate null termination in the OD storage itself.
         // Let's define the array size based on 'length' and initialize carefully.
         // If initializing with a string literal that's shorter than 'length', it will be null-terminated by C.
         // If the literal is exactly 'length', it won't be null-terminated in the array.
         return `static ${cType} OD_${obj.index}_${obj.subIndex}[${cSize}] = ${initializer};`;
      } else {
         // For OCTET_STRING, DOMAIN, UNICODE_STRING, initialize as byte array if defaultValue exists
         // This part needs refinement based on how defaultValue is provided for these types (e.g., hex string?)
         // Placeholder: Initialize with zeros or handle specific formats
         initializer = '{0}'; // Default to zero-initialized array
         if (obj.defaultValue) {
            // Example: Handle hex string like "01AABB..."
            if (/^(0x|)[0-9A-Fa-f]+$/.test(obj.defaultValue.replace(/\s/g, ''))) {
                let hex = obj.defaultValue.replace(/\s/g, '').replace(/^0x/, '');
                if (hex.length % 2 !== 0) hex = '0' + hex; // Pad if odd length
                let bytes = [];
                for (let i = 0; i < hex.length; i += 2) {
                    bytes.push(`0x${hex.substring(i, i + 2)}`);
                }
                if (bytes.length <= cSize) {
                   initializer = `{${bytes.join(', ')}}`;
                } // else: default value too long, stick with {0} or error
            }
            // Add other defaultValue formats if needed
         }
         return `static ${cType} OD_${obj.index}_${obj.subIndex}[${cSize}] = ${initializer};`;
      }
    default: cType = 'uint8_t'; cSize = 1; initializer = parseInt(obj.defaultValue || '0').toString(); // Default to uint8_t
  }

  // Handle hex initializers for numeric types
  if (typeof initializer === 'string' && initializer.startsWith('0x')) {
     // Keep hex format for C code (e.g., 0x1A)
  } else if (cType !== 'float' && cType !== 'bool') {
     // Ensure integer types are parsed correctly if not already hex
     initializer = parseInt(initializer).toString(); // Convert potential strings like "1000" to numbers
  }


  return `static ${cType} OD_${obj.index}_${obj.subIndex} = ${initializer};`;
}).join('\n') : '/* No objects defined in configuration */'}

/* Object Dictionary Entries Array */
const OD_Entry_t OD_Entries[OD_ENTRY_COUNT] = {
${canopenConfig?.objects ? canopenConfig.objects.map(obj => {
  let objTypeDefine = 'CANOPEN_OBJECT_TYPE_VAR'; // Default
  switch (obj.objectType?.toUpperCase()) {
    case 'NULL': objTypeDefine = 'CANOPEN_OBJECT_TYPE_NULL'; break;
    case 'DOMAIN': objTypeDefine = 'CANOPEN_OBJECT_TYPE_DOMAIN'; break;
    case 'DEFTYPE': objTypeDefine = 'CANOPEN_OBJECT_TYPE_DEFTYPE'; break;
    case 'DEFSTRUCT': objTypeDefine = 'CANOPEN_OBJECT_TYPE_DEFSTRUCT'; break;
    case 'VAR': objTypeDefine = 'CANOPEN_OBJECT_TYPE_VAR'; break;
    case 'ARRAY': objTypeDefine = 'CANOPEN_OBJECT_TYPE_ARRAY'; break;
    case 'RECORD': objTypeDefine = 'CANOPEN_OBJECT_TYPE_RECORD'; break;
  }

  let dataTypeDefine = 'CANOPEN_DATA_TYPE_UNSIGNED8'; // Default
  let dataLength = 1;
   // Determine CANopen data type define and length
   switch (obj.dataType?.toUpperCase()) {
    case 'BOOLEAN': dataTypeDefine = 'CANOPEN_DATA_TYPE_BOOLEAN'; dataLength = sizeof(bool); break;
    case 'INTEGER8': dataTypeDefine = 'CANOPEN_DATA_TYPE_INTEGER8'; dataLength = sizeof(int8_t); break;
    case 'INTEGER16': dataTypeDefine = 'CANOPEN_DATA_TYPE_INTEGER16'; dataLength = sizeof(int16_t); break;
    case 'INTEGER32': dataTypeDefine = 'CANOPEN_DATA_TYPE_INTEGER32'; dataLength = sizeof(int32_t); break;
    case 'UNSIGNED8': dataTypeDefine = 'CANOPEN_DATA_TYPE_UNSIGNED8'; dataLength = sizeof(uint8_t); break;
    case 'UNSIGNED16': dataTypeDefine = 'CANOPEN_DATA_TYPE_UNSIGNED16'; dataLength = sizeof(uint16_t); break;
    case 'UNSIGNED32': dataTypeDefine = 'CANOPEN_DATA_TYPE_UNSIGNED32'; dataLength = sizeof(uint32_t); break;
    case 'REAL32': dataTypeDefine = 'CANOPEN_DATA_TYPE_REAL32'; dataLength = sizeof(float); break;
    case 'VISIBLE_STRING': dataTypeDefine = 'CANOPEN_DATA_TYPE_VISIBLE_STRING'; dataLength = parseInt(obj.length || '32'); break;
    case 'OCTET_STRING': dataTypeDefine = 'CANOPEN_DATA_TYPE_OCTET_STRING'; dataLength = parseInt(obj.length || '32'); break;
    case 'UNICODE_STRING': dataTypeDefine = 'CANOPEN_DATA_TYPE_UNICODE_STRING'; dataLength = parseInt(obj.length || '32'); break; // Length in OD is max chars, not bytes usually
    case 'TIME_OF_DAY': dataTypeDefine = 'CANOPEN_DATA_TYPE_TIME_OF_DAY'; dataLength = 6; break; // Size per CiA 301
    case 'TIME_DIFFERENCE': dataTypeDefine = 'CANOPEN_DATA_TYPE_TIME_DIFFERENCE'; dataLength = 6; break; // Size per CiA 301
    case 'DOMAIN': dataTypeDefine = 'CANOPEN_DATA_TYPE_DOMAIN'; dataLength = parseInt(obj.length || '256'); break; // Domain size needs definition
    // Add other types as needed (UNSIGNED64, INTEGER64, REAL64 etc.)
    case 'UNSIGNED64': dataTypeDefine = 'CANOPEN_DATA_TYPE_UNSIGNED64'; dataLength = sizeof(uint64_t); break;
    case 'INTEGER64': dataTypeDefine = 'CANOPEN_DATA_TYPE_INTEGER64'; dataLength = sizeof(int64_t); break;
    // ... other types
  }

  let accessTypeDefine = 'CANOPEN_ACCESS_RW'; // Default
  switch (obj.accessType?.toLowerCase()) {
    case 'ro': accessTypeDefine = 'CANOPEN_ACCESS_RO'; break;
    case 'wo': accessTypeDefine = 'CANOPEN_ACCESS_WO'; break;
    case 'rw': accessTypeDefine = 'CANOPEN_ACCESS_RW'; break;
    case 'const': accessTypeDefine = 'CANOPEN_ACCESS_CONST'; break;
    // Add RWR, RWW if needed, mapping them appropriately using the simplified defines
  }

  const varName = `OD_${obj.index}_${obj.subIndex}`;

  // Format index/subindex as hex for readability in the C code
  const indexHex = `0x${parseInt(obj.index).toString(16).toUpperCase()}`;
  const subIndexHex = `0x${parseInt(obj.subIndex).toString(16).toUpperCase()}`;


  return `    /* ${obj.name || 'Unnamed Object'} (${indexHex}:${subIndexHex}) */
    {${indexHex}, ${subIndexHex}, ${objTypeDefine}, ${dataTypeDefine}, ${accessTypeDefine}, ${dataLength}, (void*)&${varName}}`; // Cast dataPtr to void*
}).join(',\n') : '    /* No objects defined in configuration */'}
};

/* Initialize Object Dictionary */
void OD_Init(void) {
    /* This function could be used to:
       - Load OD values from Non-Volatile Memory (NVM) after static init
       - Perform consistency checks between related OD entries
       - Initialize complex data structures not handled by static init
       Currently, variables are initialized statically based on defaultValue.
    */
    // Example: Load heartbeat time from NVM if available, overwriting static default
    // uint16_t stored_heartbeat;
    // if (NVM_Read(NVM_ADDR_HEARTBEAT, &stored_heartbeat, sizeof(stored_heartbeat))) {
    //    // Find the entry and update the variable it points to
    //    const OD_Entry_t* hbEntry = FindODEntry(0x1017, 0);
    //    if (hbEntry && hbEntry->dataPtr) {
    //        *(uint16_t*)hbEntry->dataPtr = stored_heartbeat;
    //    }
    // }
}`;

  // Return the object containing all generated files
  return codeFiles;
};
