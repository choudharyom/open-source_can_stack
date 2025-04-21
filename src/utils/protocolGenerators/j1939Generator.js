// Generates SAE J1939 protocol specific code files

export const generateJ1939Code = (j1939Config) => {
  // Extract configuration or use defaults
  const preferredAddress = j1939Config?.preferredAddress || 254; // Default to NULL_ADDRESS if not specified
  const deviceName = j1939Config?.deviceName || '0x0'; // Default NAME if not specified

  return {
    'j1939.h': `/* SAE J1939 Protocol Implementation */
#ifndef J1939_H
#define J1939_H

#include "can_driver.h" // For CAN types and functions
#include <stdint.h>    // For standard integer types

/* J1939 Address Defines */
#define J1939_GLOBAL_ADDRESS      255
#define J1939_NULL_ADDRESS        254

/* Common J1939 PGNs */
#define J1939_PGN_REQUEST         0x00EA00
#define J1939_PGN_ADDRESS_CLAIMED 0x00EE00
#define J1939_PGN_COMMANDED_ADDRESS 0x00FED8
// Add other relevant PGNs as needed

/* J1939 NAME structure (64-bit) */
typedef uint64_t J1939_NAME_T;

/* Initialize the J1939 stack */
// Takes the preferred address and the 64-bit NAME of the ECU
void J1939_Init(uint8_t preferredAddress, J1939_NAME_T ecuName);

/* Process J1939 communication (Address Claiming, Transport Protocol, etc.) */
// Should be called periodically from the main loop or a task
void J1939_Process(void);

/* Transmit a J1939 message */
// Handles PDU Format (PF) and PDU Specific (PS) fields based on PGN
// Returns 0 on success, non-zero on failure (e.g., no address claimed)
uint8_t J1939_TransmitMessage(uint32_t pgn, uint8_t priority, uint8_t destAddr, uint8_t* data, uint8_t length);

/* Get the current J1939 source address */
// Returns the claimed address or J1939_NULL_ADDRESS if not claimed
uint8_t J1939_GetAddress(void);

/* Callback function type for received J1939 messages */
// User application should implement this to handle specific PGNs
typedef void (*J1939_MessageCallback)(uint32_t pgn, uint8_t priority, uint8_t srcAddr, uint8_t destAddr, uint8_t* data, uint8_t length);

/* Register a callback for a specific PGN */
void J1939_RegisterPgnCallback(uint32_t pgn, J1939_MessageCallback callback);


#endif /* J1939_H */`,
    'j1939.c': `/* SAE J1939 Protocol Implementation */
#include "j1939.h"
#include "can_cfg.h"    // For CAN driver access if needed directly
#include "can_driver.h" // For CAN_SendMessage, CAN_RegisterMessageCallback

/* J1939 node address */
static uint8_t currentJ1939Address = J1939_NULL_ADDRESS;
static uint8_t j1939PreferredAddress = J1939_NULL_ADDRESS;

/* NAME fields for address claiming */
static J1939_NAME_T j1939EcuName = 0;

/* Address Claiming State */
typedef enum {
    AC_STATE_IDLE,
    AC_STATE_WAIT_FOR_CLAIM,
    AC_STATE_ADDRESS_CLAIMED,
    AC_STATE_CANNOT_CLAIM
} AddressClaimState_t;
static AddressClaimState_t addressClaimState = AC_STATE_IDLE;

/* Callback registry for PGNs */
#define MAX_PGN_CALLBACKS 16 // Adjust as needed
static struct {
    uint32_t pgn;
    J1939_MessageCallback callback;
} pgnCallbacks[MAX_PGN_CALLBACKS];
static uint8_t pgnCallbackCount = 0;

/* Forward declarations */
static void J1939_ProcessAddressClaim(void);
static void J1939_HandleAddressClaimMessage(uint32_t canId, uint8_t* data, uint8_t length);
static void J1939_HandleRequestMessage(uint32_t canId, uint8_t* data, uint8_t length);
static void J1939_ProcessIncomingMessage(uint32_t canId, uint8_t* data, uint8_t length);


/* Initialize the J1939 stack */
void J1939_Init(uint8_t preferredAddr, J1939_NAME_T ecuName) {
  j1939PreferredAddress = preferredAddr;
  j1939EcuName = ecuName;
  currentJ1939Address = J1939_NULL_ADDRESS; // Start with no address
  addressClaimState = AC_STATE_IDLE;
  pgnCallbackCount = 0; // Reset callbacks

  /* Initialize CAN driver (assuming it's not already done elsewhere) */
  // CAN_Init(); // Usually done in main or OS init

  /* Register J1939 message handlers with the CAN driver */
  /* We need to listen for specific J1939 messages like Address Claimed and Request */
  /* Since J1939 uses extended IDs, register for the relevant range or specific IDs */
  // This is simplified; a real implementation might use hardware filtering
  // or register a single callback for all extended IDs.
  CAN_RegisterMessageCallback(0x00EE00, J1939_HandleAddressClaimMessage); // Address Claimed PGN (target FF)
  CAN_RegisterMessageCallback(0x00EA00, J1939_HandleRequestMessage);    // Request PGN (target FF)
  // Register a general handler for other messages if needed, or rely on PGN callbacks
  // CAN_RegisterMessageCallback(0x18000000, J1939_ProcessIncomingMessage); // Example: Catch all extended IDs


  /* Start address claim procedure */
  J1939_ProcessAddressClaim(); // Initiate the process
}

/* Process J1939 communication */
void J1939_Process(void) {
  /* This is called periodically */

  /* Process incoming CAN messages (if not interrupt driven) */
  // CAN_ProcessMessages(); // Assumes CAN driver handles reception

  /* Handle Address Claiming state machine */
  J1939_ProcessAddressClaim();

  /* Handle Transport Protocol (TP) state machines if implemented */
  // J1939_TP_Process();
}

/* Transmit a J1939 message */
uint8_t J1939_TransmitMessage(uint32_t pgn, uint8_t priority, uint8_t destAddr, uint8_t* data, uint8_t length) {
  if (currentJ1939Address == J1939_NULL_ADDRESS || currentJ1939Address > 253) {
    return 1; /* Cannot transmit without a valid source address */
  }
  if (length > 8) {
      // Need Transport Protocol (TP) for multi-packet messages
      // return J1939_TP_Transmit(pgn, priority, destAddr, data, length); // Placeholder
      return 2; // Error: TP not implemented or length invalid for single frame
  }

  /* Construct J1939 29-bit ID */
  uint32_t canId = 0;
  uint8_t pf = (pgn >> 8) & 0xFF; // PDU Format
  uint8_t ps = pgn & 0xFF;        // PDU Specific

  // Determine PDU1 (destination specific) or PDU2 (broadcast) format
  if (pf < 240) { // PDU1 Format (includes destination address)
    canId = ((uint32_t)(priority & 0x7) << 26) | // Priority
            (pgn << 8) |                         // PGN (includes PF and PS)
            ((uint32_t)destAddr << 8) |          // Destination Address (in PS field for PDU1)
            currentJ1939Address;                 // Source Address
  } else { // PDU2 Format (destination is Global Address 255, encoded in PS)
    canId = ((uint32_t)(priority & 0x7) << 26) | // Priority
            (pgn << 8) |                         // PGN (includes PF and PS/GroupExt)
            currentJ1939Address;                 // Source Address
     // Note: For PDU2, the 'destAddr' parameter is effectively ignored in ID construction
     // but might be needed for TP. The PS field contains the Group Extension.
  }

  CAN_SendMessage(canId | 0x80000000, data, length); // Set bit 31 for Extended ID
  return 0; // Success
}

/* Get the current J1939 address */
uint8_t J1939_GetAddress(void) {
  return currentJ1939Address;
}

/* Register a callback for a specific PGN */
void J1939_RegisterPgnCallback(uint32_t pgn, J1939_MessageCallback callback) {
    if (pgnCallbackCount < MAX_PGN_CALLBACKS) {
        pgnCallbacks[pgnCallbackCount].pgn = pgn;
        pgnCallbacks[pgnCallbackCount].callback = callback;
        pgnCallbackCount++;
    }
    // Else: Handle error - too many callbacks registered
}

/* --- Internal Functions --- */

// Simplified Address Claiming state machine
static void J1939_ProcessAddressClaim(void) {
    static uint32_t claimWaitTimestamp = 0;
    const uint32_t ADDRESS_CLAIM_TIMEOUT_MS = 250; // ~250ms wait time

    switch (addressClaimState) {
        case AC_STATE_IDLE:
            // Send Address Claim message for preferred address
            uint8_t claimData[8];
            // Pack NAME into data bytes (LSB first)
            for(int i=0; i<8; i++) {
                claimData[i] = (j1939EcuName >> (i*8)) & 0xFF;
            }
            J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
            currentJ1939Address = j1939PreferredAddress; // Tentatively claim
            addressClaimState = AC_STATE_WAIT_FOR_CLAIM;
            claimWaitTimestamp = /* Get system time */; // Start timer
            break;

        case AC_STATE_WAIT_FOR_CLAIM:
            // Wait for timeout or conflicting claim
            if (/* Get system time */ - claimWaitTimestamp >= ADDRESS_CLAIM_TIMEOUT_MS) {
                // Timeout expired, claim successful (assuming no conflict received)
                addressClaimState = AC_STATE_ADDRESS_CLAIMED;
                // Send Address Claimed again to confirm (optional but good practice)
                 for(int i=0; i<8; i++) { claimData[i] = (j1939EcuName >> (i*8)) & 0xFF; }
                 J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
            }
            // Conflicting claims are handled in J1939_HandleAddressClaimMessage
            break;

        case AC_STATE_ADDRESS_CLAIMED:
            // Address successfully claimed, do nothing here
            // Monitor for Address Commanded messages if needed
            break;

        case AC_STATE_CANNOT_CLAIM:
            // Could not claim preferred address, potentially try another or use NULL
             currentJ1939Address = J1939_NULL_ADDRESS; // Fallback to NULL address
            // Send Cannot Claim Address message
             for(int i=0; i<8; i++) { claimData[i] = (j1939EcuName >> (i*8)) & 0xFF; }
             J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
            // Stay in this state or implement retry logic
            break;
    }
}

// Handler for received Address Claimed messages (PGN 0xEE00)
static void J1939_HandleAddressClaimMessage(uint32_t canId, uint8_t* data, uint8_t length) {
    if (length != 8) return; // Address Claim message must be 8 bytes (NAME)

    uint8_t sourceAddr = canId & 0xFF; // Extract source address from CAN ID
    J1939_NAME_T receivedName = 0;
    for(int i=0; i<8; i++) {
        receivedName |= ((J1939_NAME_T)data[i] << (i*8));
    }

    if (addressClaimState == AC_STATE_WAIT_FOR_CLAIM && sourceAddr == currentJ1939Address) {
        // Received a claim for the address we are trying to claim
        if (receivedName < j1939EcuName) {
            // Our NAME is higher priority, contender must yield
            // We can proceed to AC_STATE_ADDRESS_CLAIMED (will happen on timeout)
        } else if (receivedName > j1939EcuName) {
            // Our NAME is lower priority, we must yield
            addressClaimState = AC_STATE_CANNOT_CLAIM;
            currentJ1939Address = J1939_NULL_ADDRESS; // Give up the address
            // Optionally try claiming a different address
        } else {
            // Identical NAME - This is an error condition!
            // Both ECUs should probably move to Cannot Claim
            addressClaimState = AC_STATE_CANNOT_CLAIM;
            currentJ1939Address = J1939_NULL_ADDRESS;
        }
    } else if (addressClaimState == AC_STATE_ADDRESS_CLAIMED && sourceAddr == currentJ1939Address) {
         // Someone else is claiming our already claimed address!
         // Defend our address by re-sending our claim
         if (receivedName > j1939EcuName) { // Only defend if our NAME is higher priority
             uint8_t claimData[8];
             for(int i=0; i<8; i++) { claimData[i] = (j1939EcuName >> (i*8)) & 0xFF; }
             J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
         } else {
             // Lower or equal priority contender - they should yield or it's an error
         }
    }
}

// Handler for received Request messages (PGN 0xEA00)
static void J1939_HandleRequestMessage(uint32_t canId, uint8_t* data, uint8_t length) {
    if (length != 3) return; // Request message is 3 bytes (PGN requested)

    uint8_t destAddr = (canId >> 8) & 0xFF; // Destination of the request

    // Check if the request is for us (specific address or global)
    if (currentJ1939Address != J1939_NULL_ADDRESS &&
        (destAddr == currentJ1939Address || destAddr == J1939_GLOBAL_ADDRESS))
    {
        uint32_t requestedPgn = ((uint32_t)data[0]) |
                                ((uint32_t)data[1] << 8) |
                                ((uint32_t)data[2] << 16);

        if (requestedPgn == J1939_PGN_ADDRESS_CLAIMED) {
            // Request for Address Claimed (RQ_ADDR_CLAIM)
            if (currentJ1939Address != J1939_NULL_ADDRESS) {
                // Respond with our Address Claimed message
                uint8_t claimData[8];
                for(int i=0; i<8; i++) { claimData[i] = (j1939EcuName >> (i*8)) & 0xFF; }
                J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
            }
        } else {
            // Handle request for other PGNs
            // Look up the PGN, get the data, and transmit it
            // This requires application-level logic to provide the data
            // Example:
            // uint8_t responseData[8];
            // uint8_t responseLength = Get_Data_For_PGN(requestedPgn, responseData);
            // if (responseLength > 0) {
            //    J1939_TransmitMessage(requestedPgn, 6, canId & 0xFF, responseData, responseLength); // Respond to requester
            // } else {
            //    // Send NACK (TP.CM_Abort with reason) if PGN not supported
            // }
        }
    }
}

// General handler for processing other incoming messages based on registered PGN callbacks
static void J1939_ProcessIncomingMessage(uint32_t canId, uint8_t* data, uint8_t length) {
    // Extract J1939 parameters from CAN ID
    uint8_t priority = (canId >> 26) & 0x7;
    uint32_t pgn = (canId >> 8) & 0x3FFFF; // Includes PF and PS/GE
    uint8_t sourceAddr = canId & 0xFF;
    uint8_t destAddr = J1939_GLOBAL_ADDRESS; // Default for PDU2

    uint8_t pf = (pgn >> 8) & 0xFF;
    if (pf < 240) { // PDU1 format, destination is in PS field
        destAddr = (canId >> 8) & 0xFF; // Extract DA from where PS would be
        pgn &= 0x3FF00; // Mask out PS field to get the base PGN for PDU1
    }

    // Check if message is for us (or broadcast)
    if (currentJ1939Address != J1939_NULL_ADDRESS &&
        (destAddr == currentJ1939Address || destAddr == J1939_GLOBAL_ADDRESS))
    {
        // Find registered callback for this PGN
        for (uint8_t i = 0; i < pgnCallbackCount; i++) {
            // Need careful PGN matching (consider PDU1 vs PDU2)
            // This simple check might need refinement based on how PGNs are registered
            if (pgnCallbacks[i].pgn == pgn) {
                pgnCallbacks[i].callback(pgn, priority, sourceAddr, destAddr, data, length);
                return; // Found and called callback
            }
        }
        // Optional: Handle un-registered PGNs if necessary
    }
}

`
  };
};
