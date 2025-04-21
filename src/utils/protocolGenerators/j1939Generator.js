// Generates SAE J1939 protocol specific code files
export const generateJ1939Code = (j1939Config = {}) => { // Add default empty object for safety
    // Extract configuration or use defaults (keep existing ones for j1939.c/h)
    const preferredAddress = j1939Config?.preferredAddress || 128; // Default used in config file

    // Define the callback type needed by the config struct
    const pgnHandlerTypeDefinition = `
/* Callback function type for handling specific PGNs based on config */
/* Parameters: data buffer, data length */
typedef void (*J1939_DataHandlerCallback)(uint8_t* data, uint8_t length);
`;

    const codeFiles = {};

    // --- Generate j1939.h (Updated to include config) ---
    codeFiles['j1939.h'] = `/* SAE J1939 Protocol Implementation */
#ifndef J1939_H
#define J1939_H

#include "can_driver.h" // For CAN types and functions
#include <stdint.h>    // For standard integer types
#include "j1939_config.h" // Include config for NAME, address etc.

/* J1939 Address Defines */
#define J1939_GLOBAL_ADDRESS      255
#define J1939_NULL_ADDRESS        254

/* Common J1939 PGNs */
#define J1939_PGN_REQUEST         0x00EA00
#define J1939_PGN_ADDRESS_CLAIMED 0x00EE00
#define J1939_PGN_COMMANDED_ADDRESS 0x00FED8
#define J1939_PGN_TP_CM           0x00EC00 // Connection Management
#define J1939_PGN_TP_DT           0x00EB00 // Data Transfer
// Add other relevant PGNs as needed

/* J1939 NAME structure (64-bit) */
typedef uint64_t J1939_NAME_T;

/* Initialize the J1939 stack */
// Uses configuration from j1939_config.h
void J1939_Init(void);

/* Process J1939 communication (Address Claiming, Transport Protocol, etc.) */
// Should be called periodically from the main loop or a task
void J1939_Process(void);

/* Transmit a J1939 message (single frame) */
// Handles PDU Format (PF) and PDU Specific (PS) fields based on PGN
// Returns 0 on success, non-zero on failure (e.g., no address claimed)
uint8_t J1939_TransmitMessage(uint32_t pgn, uint8_t priority, uint8_t destAddr, uint8_t* data, uint8_t length);

/* Get the current J1939 source address */
// Returns the claimed address or J1939_NULL_ADDRESS if not claimed
uint8_t J1939_GetAddress(void);

/* --- Optional: Dynamic PGN Callback Registration (if needed alongside static config) --- */
/* Callback function type for received J1939 messages (full context) */
typedef void (*J1939_FullMessageCallback)(uint32_t pgn, uint8_t priority, uint8_t srcAddr, uint8_t destAddr, uint8_t* data, uint8_t length);

/* Register a callback for a specific PGN (dynamic registration) */
// Note: Consider using the static configuration in j1939_config.h primarily
void J1939_RegisterPgnCallback(uint32_t pgn, J1939_FullMessageCallback callback);


#endif /* J1939_H */`;

    // --- Generate j1939.c (Updated to use config) ---
    codeFiles['j1939.c'] = `/* SAE J1939 Protocol Implementation */
#include "j1939.h"
#include "j1939_config.h" // Include generated config
#include "can_driver.h" // For CAN_SendMessage, CAN_RegisterMessageCallback
#include <string.h> // For memcpy if needed for TP
#include <stddef.h> // For NULL

/* J1939 node address */
static uint8_t currentJ1939Address = J1939_NULL_ADDRESS;

/* NAME fields for address claiming (from config) */
static const J1939_NAME_T j1939EcuName = J1939_CONSTRUCT_NAME(); // Use macro from config

/* Address Claiming State */
typedef enum {
    AC_STATE_IDLE,
    AC_STATE_WAIT_FOR_CLAIM_RESPONSE, // Waiting for response to our Request for Address Claim
    AC_STATE_WAIT_FOR_CLAIM_TIMEOUT,  // Waiting for timeout after sending our Address Claim
    AC_STATE_ADDRESS_CLAIMED,
    AC_STATE_CANNOT_CLAIM
} AddressClaimState_t;
static AddressClaimState_t addressClaimState = AC_STATE_IDLE;
static uint32_t addressClaimTimer = 0; // Timer for AC process

/* --- Optional: Dynamic Callback registry --- */
#define MAX_DYNAMIC_PGN_CALLBACKS 8 // Adjust as needed
static struct {
    uint32_t pgn;
    J1939_FullMessageCallback callback;
} dynamicPgnCallbacks[MAX_DYNAMIC_PGN_CALLBACKS];
static uint8_t dynamicPgnCallbackCount = 0;
/* --- End Optional --- */


/* Forward declarations */
static void J1939_StartAddressClaim(void);
static void J1939_ProcessAddressClaiming(void);
static void J1939_HandleAddressClaimMessage(uint32_t canId, uint8_t* data, uint8_t length);
static void J1939_HandleRequestMessage(uint32_t canId, uint8_t* data, uint8_t length);
// static void J1939_HandleTpCmMessage(uint32_t canId, uint8_t* data, uint8_t length); // If TP implemented
// static void J1939_HandleTpDtMessage(uint32_t canId, uint8_t* data, uint8_t length); // If TP implemented
static void J1939_ProcessIncomingMessage(uint32_t canId, uint8_t* data, uint8_t length);
static uint32_t J1939_GetSystemTime(void); // Placeholder for system time function


/* Initialize the J1939 stack */
void J1939_Init(void) {
  currentJ1939Address = J1939_NULL_ADDRESS; // Start with no address
  addressClaimState = AC_STATE_IDLE;
  dynamicPgnCallbackCount = 0; // Reset dynamic callbacks

  /* Initialize CAN driver (assuming it's not already done elsewhere) */
  // CAN_Init(); // Usually done in main or OS init

  /* Register J1939 message handlers with the CAN driver */
  /* Listen for messages relevant to J1939 management */
  /* Note: CAN_RegisterMessageCallback might need adjustment based on how it handles IDs/Masks */
  /*       It might be better to use a single general callback (CAN_RegisterGeneralCallback) */
  /*       and filter within J1939_ProcessIncomingMessage. */
  // Example using specific PGNs (assumes driver can handle exact extended ID match or range)
  // CAN_RegisterMessageCallback(J1939_PGN_ADDRESS_CLAIMED, J1939_HandleAddressClaimMessage); // Address Claimed PGN (target FF)
  // CAN_RegisterMessageCallback(J1939_PGN_REQUEST, J1939_HandleRequestMessage);    // Request PGN (target FF)
  // CAN_RegisterMessageCallback(J1939_PGN_TP_CM, J1939_HandleTpCmMessage); // If TP implemented
  // CAN_RegisterMessageCallback(J1939_PGN_TP_DT, J1939_HandleTpDtMessage); // If TP implemented

  /* Register a general handler for all other extended ID messages */
  /* This handler will dispatch to configured PGN handlers */
  CAN_RegisterGeneralCallback(J1939_ProcessIncomingMessage); // Assumes CAN driver has a general callback

#if J1939_ADDRESS_CLAIMING_ENABLED
  J1939_StartAddressClaim(); // Initiate the address claim process
#else
  // If AC disabled, directly use the preferred address (potentially unsafe)
  currentJ1939Address = J1939_PREFERRED_ADDRESS;
  addressClaimState = AC_STATE_ADDRESS_CLAIMED; // Assume claimed
#endif
}

/* Process J1939 communication */
void J1939_Process(void) {
  /* This is called periodically */

  /* Process incoming CAN messages (if not interrupt driven) */
  // CAN_ProcessMessages(); // Assumes CAN driver handles reception

#if J1939_ADDRESS_CLAIMING_ENABLED
  /* Handle Address Claiming state machine */
  J1939_ProcessAddressClaiming();
#endif

  /* Handle Transport Protocol (TP) state machines if implemented */
  // J1939_TP_Process();

  /* Handle periodic transmission based on config */
  // TODO: Implement periodic PGN transmission based on J1939_PGN_Configs rate and J1939_GetSystemTime()
}

/* Transmit a J1939 message */
uint8_t J1939_TransmitMessage(uint32_t pgn, uint8_t priority, uint8_t destAddr, uint8_t* data, uint8_t length) {
#if J1939_ADDRESS_CLAIMING_ENABLED
  if (addressClaimState != AC_STATE_ADDRESS_CLAIMED) {
      // Allow sending Address Claim / Cannot Claim even if not fully claimed yet
      if (pgn != J1939_PGN_ADDRESS_CLAIMED) {
         return 1; // Cannot transmit regular PGNs without a claimed address
      }
      // If sending Address Claim, use the address being claimed or NULL
      if (currentJ1939Address == J1939_NULL_ADDRESS && addressClaimState != AC_STATE_CANNOT_CLAIM) {
          // Trying to claim preferred address
          currentJ1939Address = J1939_PREFERRED_ADDRESS;
      } else if (addressClaimState == AC_STATE_CANNOT_CLAIM) {
          // Sending "Cannot Claim"
          currentJ1939Address = J1939_NULL_ADDRESS;
      } // else currentJ1939Address should be set correctly
  }
#else
  // If AC disabled, we assume the address is fixed, but check if it's valid
  if (currentJ1939Address == J1939_NULL_ADDRESS || currentJ1939Address > 253) {
      return 1; // Cannot transmit with invalid address
  }
#endif

  if (length > 8) {
      // Need Transport Protocol (TP) for multi-packet messages
      // return J1939_TP_Transmit(pgn, priority, destAddr, data, length); // Placeholder
      return 2; // Error: TP not implemented or length invalid for single frame
  }

  /* Construct J1939 29-bit ID */
  uint32_t canId = 0;
  uint8_t pf = (pgn >> 8) & 0xFF; // PDU Format

  // J1939 ID Structure: Prio(3) + PGN(18) + SA(8)
  // PGN(18): R(1)+DP(1)+PF(8)+PS(8)
  uint32_t pgn_field = (pgn & 0x3FFFF); // Extract PGN part (18 bits: R+DP+PF+PS/GE)

  canId = ((uint32_t)(priority & 0x7) << 26) | // Priority (3 bits)
          (pgn_field << 8) |                  // PGN (18 bits) shifted
          currentJ1939Address;                // Source Address (8 bits)

  // Determine PDU1 (destination specific) or PDU2 (broadcast) format
  if (pf < 240) { // PDU1 Format (Destination Address replaces PS field)
     canId &= 0xFFFF00FF; // Clear the PS field (bits 8-15)
     canId |= ((uint32_t)destAddr << 8); // Insert Destination Address
  } else { // PDU2 Format (PS field contains Group Extension from PGN)
     // 'destAddr' parameter is ignored for PDU2 ID construction (always broadcast)
     // The PS field from pgn_field is already included correctly.
  }

  // Ensure Extended ID bit is set (Bit 31 for many drivers, or use driver specific flag)
  // Assuming CAN_SendMessage expects the ID format directly
  uint32_t extendedCanId = canId | 0x80000000; // Example for setting extended bit

  CAN_SendMessage(extendedCanId, data, length);
  return 0; // Success
}

/* Get the current J1939 address */
uint8_t J1939_GetAddress(void) {
  return currentJ1939Address;
}

/* --- Optional: Dynamic PGN Callback Registration --- */
void J1939_RegisterPgnCallback(uint32_t pgn, J1939_FullMessageCallback callback) {
    if (dynamicPgnCallbackCount < MAX_DYNAMIC_PGN_CALLBACKS) {
        dynamicPgnCallbacks[dynamicPgnCallbackCount].pgn = pgn;
        dynamicPgnCallbacks[dynamicPgnCallbackCount].callback = callback;
        dynamicPgnCallbackCount++;
    }
    // Else: Handle error - too many callbacks registered
}
/* --- End Optional --- */


/* --- Internal Functions --- */

// Placeholder for getting system time in milliseconds
static uint32_t J1939_GetSystemTime(void) {
    // This needs to be implemented based on the target hardware/OS
    // Example: return HAL_GetTick(); // For STM32 HAL
    // Example: return xTaskGetTickCount() * portTICK_PERIOD_MS; // For FreeRTOS
    return 0; // Replace with actual implementation
}

#if J1939_ADDRESS_CLAIMING_ENABLED
static void J1939_StartAddressClaim(void) {
    // Send "Request for Address Claimed" (PGN EA00, requesting EE00)
    uint8_t requestData[3] = {
        (J1939_PGN_ADDRESS_CLAIMED & 0xFF),
        ((J1939_PGN_ADDRESS_CLAIMED >> 8) & 0xFF),
        ((J1939_PGN_ADDRESS_CLAIMED >> 16) & 0xFF)
    };
    // Send request with NULL source address, priority 6, dest Global
    // Construct ID manually for NULL source:
     uint32_t pgn_field = (J1939_PGN_REQUEST & 0x3FFFF);
     uint32_t canId = ((uint32_t)(6 & 0x7) << 26) | // Priority
                      (pgn_field << 8) |           // PGN shifted
                      J1939_NULL_ADDRESS;          // Source Address
     // Overwrite PS field with DA (Global) for PDU1 format PGN EA00
     canId = (canId & 0xFFFF00FF) | ((uint32_t)J1939_GLOBAL_ADDRESS << 8);
     uint32_t extendedCanId = canId | 0x80000000;
     CAN_SendMessage(extendedCanId, requestData, 3);

    addressClaimState = AC_STATE_WAIT_FOR_CLAIM_RESPONSE;
    addressClaimTimer = J1939_GetSystemTime(); // Start timer
}

// Address Claiming state machine logic
static void J1939_ProcessAddressClaiming(void) {
    uint32_t currentTime = J1939_GetSystemTime();
    // J1939 specifies a random delay between 0-153ms (T4) before sending Address Claim
    // and a 250ms timeout (T2) for conflicting claims.
    // This implementation uses fixed timeouts for simplicity.
    const uint32_t ADDRESS_CLAIM_RESPONSE_TIMEOUT_MS = 250; // Time to wait for others' claims (T2)
    const uint32_t ADDRESS_CLAIM_CONFIRM_TIMEOUT_MS = 250; // Time to wait after sending our claim (T2)

    switch (addressClaimState) {
        case AC_STATE_IDLE:
            // Should have been started in Init
            J1939_StartAddressClaim();
            break;

        case AC_STATE_WAIT_FOR_CLAIM_RESPONSE:
            // Waiting for others to claim after sending Request for Address Claim
            if (currentTime - addressClaimTimer >= ADDRESS_CLAIM_RESPONSE_TIMEOUT_MS) {
                // Timeout expired, no conflicting claims heard yet (or handled in RX)
                // Send our Address Claim message for the preferred address
                uint8_t claimData[8];
                for(int i=0; i<8; i++) {
                    claimData[i] = (uint8_t)((j1939EcuName >> (i*8)) & 0xFF);
                }
                // Use preferred address tentatively when sending the claim
                currentJ1939Address = J1939_PREFERRED_ADDRESS;
                J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
                addressClaimState = AC_STATE_WAIT_FOR_CLAIM_TIMEOUT;
                addressClaimTimer = currentTime; // Restart timer
            }
            // Conflicting claims received during this period are handled by J1939_HandleAddressClaimMessage
            break;

        case AC_STATE_WAIT_FOR_CLAIM_TIMEOUT:
             // Waiting after sending our claim
             if (currentTime - addressClaimTimer >= ADDRESS_CLAIM_CONFIRM_TIMEOUT_MS) {
                 // Timeout expired, claim successful (assuming no conflict received)
                 addressClaimState = AC_STATE_ADDRESS_CLAIMED;
                 // currentJ1939Address is already set to J1939_PREFERRED_ADDRESS
                 // Application can now operate with this address
             }
             // Conflicting claims received during this period are handled by J1939_HandleAddressClaimMessage
             break;

        case AC_STATE_ADDRESS_CLAIMED:
            // Address successfully claimed, monitor for external claims/commands
            break;

        case AC_STATE_CANNOT_CLAIM:
            // Could not claim preferred address.
            // Standard says: Use NULL address (254) and send "Cannot Claim"
            if (currentJ1939Address != J1939_NULL_ADDRESS) { // Send only once
                 currentJ1939Address = J1939_NULL_ADDRESS;
                 uint8_t claimData[8];
                 for(int i=0; i<8; i++) { claimData[i] = (uint8_t)((j1939EcuName >> (i*8)) & 0xFF); }
                 // Send with NULL source address
                 J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
            }
            // Stay in this state. Application cannot transmit PGNs requiring a source address.
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

    // Ignore claims from NULL address (like our Cannot Claim message)
    if (sourceAddr == J1939_NULL_ADDRESS) {
        return;
    }

    // --- Address Claim Logic ---
    if (addressClaimState == AC_STATE_WAIT_FOR_CLAIM_RESPONSE || addressClaimState == AC_STATE_WAIT_FOR_CLAIM_TIMEOUT) {
        // We are in the process of claiming J1939_PREFERRED_ADDRESS
        if (sourceAddr == J1939_PREFERRED_ADDRESS) {
            // Someone else claimed or is claiming the address we want
            if (receivedName < j1939EcuName) {
                // Our NAME is higher priority, contender must yield. We continue waiting.
                // If we were in WAIT_FOR_CLAIM_TIMEOUT, we can potentially move to ADDRESS_CLAIMED faster.
            } else if (receivedName > j1939EcuName) {
                // Our NAME is lower priority, we must yield. Move to Cannot Claim.
                addressClaimState = AC_STATE_CANNOT_CLAIM;
                currentJ1939Address = J1939_NULL_ADDRESS; // Give up the address
            } else {
                // Identical NAME - Error condition! Both move to Cannot Claim.
                addressClaimState = AC_STATE_CANNOT_CLAIM;
                currentJ1939Address = J1939_NULL_ADDRESS;
            }
        }
        // If sourceAddr is different from our preferred, it doesn't conflict *yet*.
    } else if (addressClaimState == AC_STATE_ADDRESS_CLAIMED) {
         // We have already claimed an address (currentJ1939Address)
         if (sourceAddr == currentJ1939Address) {
             // Someone else is claiming our already claimed address!
             if (receivedName < j1939EcuName) {
                 // Our NAME is higher priority. Defend our address by re-sending our claim.
                 uint8_t claimData[8];
                 for(int i=0; i<8; i++) { claimData[i] = (uint8_t)((j1939EcuName >> (i*8)) & 0xFF); }
                 J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
             } else {
                 // Contender has higher or equal NAME priority. We must yield.
                 addressClaimState = AC_STATE_CANNOT_CLAIM;
                 // Send Cannot Claim message (will be done by state machine setting currentAddress to NULL)
             }
         }
         // If sourceAddr is different, it's just another ECU claiming its address - no conflict.
    }
    // If we are in AC_STATE_CANNOT_CLAIM or AC_STATE_IDLE, we generally ignore claims from others,
    // unless specific logic for address arbitration retries is implemented.
}
#endif // J1939_ADDRESS_CLAIMING_ENABLED

// Handler for received Request messages (PGN 0xEA00)
static void J1939_HandleRequestMessage(uint32_t canId, uint8_t* data, uint8_t length) {
    if (length != 3) return; // Request message is 3 bytes (PGN requested)

    uint8_t requesterAddr = canId & 0xFF;
    uint8_t destAddr = (canId >> 8) & 0xFF; // Destination of the request

    // Check if the request is for us (specific address or global)
    if (currentJ1939Address != J1939_NULL_ADDRESS &&
        (destAddr == currentJ1939Address || destAddr == J1939_GLOBAL_ADDRESS))
    {
        uint32_t requestedPgn = ((uint32_t)data[0]) |
                                ((uint32_t)data[1] << 8) |
                                ((uint32_t)data[2] << 16);

#if J1939_ADDRESS_CLAIMING_ENABLED
        if (requestedPgn == J1939_PGN_ADDRESS_CLAIMED) {
            // Request for Address Claimed (RQ_ADDR_CLAIM)
            if (addressClaimState == AC_STATE_ADDRESS_CLAIMED) {
                // Respond with our Address Claimed message
                uint8_t claimData[8];
                for(int i=0; i<8; i++) { claimData[i] = (uint8_t)((j1939EcuName >> (i*8)) & 0xFF); }
                J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
            } else if (addressClaimState == AC_STATE_CANNOT_CLAIM) {
                 // Respond with Cannot Claim Address message
                 uint8_t claimData[8];
                 for(int i=0; i<8; i++) { claimData[i] = (uint8_t)((j1939EcuName >> (i*8)) & 0xFF); }
                 // Send with NULL source address
                 currentJ1939Address = J1939_NULL_ADDRESS; // Ensure SA is NULL for this TX
                 J1939_TransmitMessage(J1939_PGN_ADDRESS_CLAIMED, 6, J1939_GLOBAL_ADDRESS, claimData, 8);
                 // Restore state if needed (though CANNOT_CLAIM is persistent)
                 // currentJ1939Address = J1939_NULL_ADDRESS;
            }
            // If still claiming, standard says not to respond.
            return; // Handled Address Claim request
        }
#endif // J1939_ADDRESS_CLAIMING_ENABLED

        // Handle request for other PGNs based on static config
        for (int i = 0; i < J1939_PGN_COUNT; i++) {
            if (J1939_PGN_Configs[i].pgn == requestedPgn) {
                // Found the PGN in our config.
                // We need application data to respond.
                // This requires a mechanism to get current data for the PGN.
                // Example placeholder:
                uint8_t responseData[8]; // Max single frame size
                uint8_t responseLength = J1939_PGN_Configs[i].length;
                if (responseLength <= 8) {
                    // bool dataAvailable = GetApplicationDataForPgn(requestedPgn, responseData, responseLength);
                    bool dataAvailable = false; // <<< Replace with actual data retrieval function call
                    if (dataAvailable) {
                         J1939_TransmitMessage(requestedPgn, J1939_PGN_Configs[i].priority, requesterAddr, responseData, responseLength);
                    } else {
                         // Optional: Send NACK (TP.CM_Abort with reason 'Access Denied' or similar)
                    }
                } else {
                    // Optional: Initiate TP transfer if data available and TP supported
                    // Optional: Send NACK if TP not supported or data unavailable
                }
                return; // Request handled (or NACKed)
            }
        }

        // If PGN not found in config, optionally send NACK
        // J1939_SendNack(requesterAddr, requestedPgn, NACK_REASON_PGN_NOT_SUPPORTED);
    }
}

// General handler for processing other incoming messages based on PGN
static void J1939_ProcessIncomingMessage(uint32_t canId, uint8_t* data, uint8_t length) {
    // Ignore non-extended frames if driver doesn't filter
    if (!(canId & 0x80000000)) {
        return;
    }
    uint32_t baseCanId = canId & 0x1FFFFFFF; // Mask off extended ID flag bit

    // Extract J1939 parameters from CAN ID
    uint8_t priority = (baseCanId >> 26) & 0x7;
    uint32_t pgn = (baseCanId >> 8) & 0x3FFFF; // Includes PF and PS/GE (18 bits)
    uint8_t sourceAddr = baseCanId & 0xFF;
    uint8_t destAddr = J1939_GLOBAL_ADDRESS; // Default for PDU2

    uint8_t pf = (pgn >> 8) & 0xFF;
    if (pf < 240) { // PDU1 format, destination is in PS field
        destAddr = (baseCanId >> 8) & 0xFF; // Extract DA from where PS would be
        pgn &= 0x3FF00; // Mask out PS field to get the base PGN for PDU1 matching
    }

    // Check specific PGNs first (these should ideally be handled by specific callbacks
    // registered in Init if the CAN driver supports it well, otherwise handle here)
    if (pgn == J1939_PGN_ADDRESS_CLAIMED) {
#if J1939_ADDRESS_CLAIMING_ENABLED
        J1939_HandleAddressClaimMessage(baseCanId, data, length);
#endif
        return;
    }
    if (pgn == J1939_PGN_REQUEST) {
        J1939_HandleRequestMessage(baseCanId, data, length);
        return;
    }
    // Add checks for TP PGNs if implemented

    // Check if message is for us (or broadcast) and we have a valid address
    if (currentJ1939Address != J1939_NULL_ADDRESS &&
        (destAddr == currentJ1939Address || destAddr == J1939_GLOBAL_ADDRESS))
    {
        bool handled = false;

        // 1. Check static configuration table
        for (int i = 0; i < J1939_PGN_COUNT; i++) {
            uint32_t configPgn = J1939_PGN_Configs[i].pgn;
            uint8_t configPf = (configPgn >> 8) & 0xFF;
            uint32_t matchPgn = pgn; // Use the PGN extracted/adjusted from the ID

            // Adjust config PGN for matching if it's PDU1
            if (configPf < 240) {
                configPgn &= 0x3FF00; // Use base PGN from config for matching
            }
            // Now matchPgn (from ID) and configPgn (from config) are comparable base PGNs if PDU1

            if (configPgn == matchPgn) {
                if (J1939_PGN_Configs[i].callback != NULL) {
                    // Call the simple data handler from the config
                    J1939_PGN_Configs[i].callback(data, length);
                    handled = true;
                    break; // Found and called static handler
                }
            }
        }

        // 2. Check dynamic callbacks (optional)
        if (!handled) {
             for (uint8_t i = 0; i < dynamicPgnCallbackCount; i++) {
                 uint32_t dynamicPgn = dynamicPgnCallbacks[i].pgn;
                 uint8_t dynamicPf = (dynamicPgn >> 8) & 0xFF;
                 uint32_t matchPgn = pgn; // Use PGN extracted/adjusted from ID

                 // Adjust dynamic PGN for matching if it's PDU1
                 if (dynamicPf < 240) {
                     dynamicPgn &= 0x3FF00;
                 }

                 if (dynamicPgn == matchPgn) {
                     if (dynamicPgnCallbacks[i].callback != NULL) {
                         // Call the full context handler
                         // Reconstruct full PGN if it was PDU1
                         uint32_t originalPgn = (pf < 240) ? (pgn | destAddr) : pgn;
                         dynamicPgnCallbacks[i].callback(originalPgn, priority, sourceAddr, destAddr, data, length);
                         handled = true;
                         break; // Found and called dynamic handler
                     }
                 }
             }
        }

        // Optional: Handle un-registered PGNs if necessary (e.g., log, ignore)
    }
}

`;

    // --- Generate j1939_config.h (New) ---
    codeFiles['j1939_config.h'] = `/* J1939 Configuration */
#ifndef J1939_CONFIG_H
#define J1939_CONFIG_H

#include <stdint.h> // For standard integer types
#include <stdbool.h> // For bool type

/* J1939 node configuration */
#define J1939_PREFERRED_ADDRESS ${j1939Config.preferredAddress || 128}
#define J1939_ADDRESS_CLAIMING_ENABLED ${j1939Config.enableAddressClaiming ? 1 : 0}

/* J1939 NAME fields (ensure values are treated as unsigned 64-bit literals) */
#define J1939_NAME_IDENTITY_NUMBER (${BigInt(j1939Config.identityNumber || 0).toString()}ULL & 0x1FFFFFULL)
#define J1939_NAME_MANUFACTURER_CODE (${BigInt(j1939Config.manufacturerCode || 0).toString()}ULL & 0x7FFULL)
#define J1939_NAME_ECU_INSTANCE (${BigInt(j1939Config.ecuInstance || 0).toString()}ULL & 0x7ULL)
#define J1939_NAME_FUNCTION_INSTANCE (${BigInt(j1939Config.functionInstance || 0).toString()}ULL & 0x1FULL)
#define J1939_NAME_FUNCTION (${BigInt(j1939Config.function || 0).toString()}ULL & 0xFFULL)
/* Reserved bit is 0 */
#define J1939_NAME_VEHICLE_SYSTEM (${BigInt(j1939Config.vehicleSystem || 0).toString()}ULL & 0x7FULL)
#define J1939_NAME_VEHICLE_SYSTEM_INSTANCE (${BigInt(j1939Config.vehicleSystemInstance || 0).toString()}ULL & 0xFULL)
#define J1939_NAME_INDUSTRY_GROUP (${BigInt(j1939Config.industryGroup || 0).toString()}ULL & 0x7ULL)
#define J1939_NAME_ARBITRARY_ADDRESS_CAPABLE 1 /* Assuming true if configured */

/* Macro to construct the 64-bit NAME */
#define J1939_CONSTRUCT_NAME() ( \\
    ((uint64_t)J1939_NAME_IDENTITY_NUMBER) | \\
    ((uint64_t)J1939_NAME_MANUFACTURER_CODE << 21) | \\
    ((uint64_t)J1939_NAME_ECU_INSTANCE << 32) | \\
    ((uint64_t)J1939_NAME_FUNCTION_INSTANCE << 35) | \\
    ((uint64_t)J1939_NAME_FUNCTION << 40) | \\
    /* Reserved bit 48 is 0 */ \\
    ((uint64_t)J1939_NAME_VEHICLE_SYSTEM << 49) | \\
    ((uint64_t)J1939_NAME_VEHICLE_SYSTEM_INSTANCE << 56) | \\
    ((uint64_t)J1939_NAME_INDUSTRY_GROUP << 60) | \\
    ((uint64_t)J1939_NAME_ARBITRARY_ADDRESS_CAPABLE << 63) \\
)

/* J1939 Transport Protocol configuration (Example - Add if TP is implemented) */
// #define J1939_TP_ENABLED ${j1939Config.enableTp ? 1 : 0}
// #define J1939_TP_MAX_PACKETS ${j1939Config.tpMaxPackets || 10}
// #define J1939_TP_RTS_TIMEOUT ${j1939Config.tpRtsTimeout || 1000} /* ms */
// #define J1939_TP_CTS_TIMEOUT ${j1939Config.tpCtsTimeout || 1000} /* ms */
// #define J1939_TP_DATA_TIMEOUT ${j1939Config.tpDataTimeout || 250} /* ms */
// #define J1939_TP_BAM_ENABLED ${j1939Config.enableBam ? 1 : 0}

/* Parameter Group Number (PGN) definitions */
#define J1939_PGN_COUNT ${j1939Config.pgns ? j1939Config.pgns.length : 0}

${pgnHandlerTypeDefinition}

/* PGN configuration structure */
typedef struct {
    uint32_t pgn;           /* Full PGN (including GE for PDU2) */
    uint8_t length;         /* Expected data length */
    uint16_t transmitRate;  /* Transmit rate in ms (0 for on-request/event) */
    uint8_t priority;       /* Default transmission priority */
    J1939_DataHandlerCallback callback; /* Function pointer to handle received data */
} J1939_PGN_Config_t;

/* SPN configuration structure (Optional - used by handlers) */
typedef struct {
    uint32_t spn;         /* SPN number */
    uint8_t startBit;     /* Starting bit position (0-63 within data field, LSB=0) */
    uint8_t length;       /* Length in bits */
    float resolution;     /* Resolution (factor) per bit */
    float offset;         /* Offset */
    // bool isSigned;     // Optional: Add if signed interpretation needed
} J1939_SPN_Config_t;


/* PGN and SPN Definitions from Configuration */
${(j1939Config.pgns || []).map(pgn => {
  const pgnNameUpper = pgn.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
  return `/* --- ${pgn.name} (PGN ${pgn.pgn}) --- */
#define PGN_${pgnNameUpper} ${pgn.pgn}
#define PGN_${pgnNameUpper}_LENGTH ${pgn.length}
#define PGN_${pgnNameUpper}_RATE ${pgn.transmitRate || 0}
#define PGN_${pgnNameUpper}_PRIORITY ${pgn.priority || 6} /* Default priority 6 */

${(pgn.spns || []).map(spn => {
  const spnNameUpper = spn.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
  // Basic validation/defaults for SPN config
  const startBit = parseInt(spn.startBit || '0');
  const bitLength = parseInt(spn.length || '1');
  const resolution = parseFloat(spn.resolution || '1');
  const offset = parseFloat(spn.offset || '0');
  return `/* ${spn.name} (SPN ${spn.spn}) */
#define SPN_${spnNameUpper} ${spn.spn}
#define SPN_${spnNameUpper}_START_BIT ${startBit}
#define SPN_${spnNameUpper}_LENGTH ${bitLength}
#define SPN_${spnNameUpper}_RESOLUTION ${resolution}f
#define SPN_${spnNameUpper}_OFFSET ${offset}f`;
}).join('\n')}
`;
}).join('\n')}

/* Function prototypes for PGN handlers */
${(j1939Config.pgns || []).map(pgn => {
  // Only generate prototype if a handler is expected (e.g., for received PGNs)
  // We assume all configured PGNs might be received and need a handler stub.
  return `void ${pgn.name.replace(/[^A-Za-z0-9_]/g, '_')}_Handler(uint8_t* data, uint8_t length);`;
}).join('\n')}

/* External declarations of the configuration tables */
extern const J1939_PGN_Config_t J1939_PGN_Configs[J1939_PGN_COUNT];

/* Optional: Declare SPN config table if needed globally */
/* extern const J1939_SPN_Config_t J1939_SPN_Configs[]; */
/* extern const uint32_t J1939_SPN_CONFIG_COUNT; */


#endif /* J1939_CONFIG_H */`;


    // --- Generate j1939_config.c (New) ---
    // Helper function to determine C type for SPN extraction
    const getSpnCType = (bitLength) => {
        if (bitLength <= 8) return 'uint8_t';
        if (bitLength <= 16) return 'uint16_t';
        if (bitLength <= 32) return 'uint32_t';
        return 'uint64_t'; // Support up to 64 bits
    };
    const getSpnMask = (bitLength) => {
        if (bitLength >= 64) return '0xFFFFFFFFFFFFFFFFULL'; // Full 64-bit mask
        return `(1ULL << ${bitLength}) - 1ULL`; // Use ULL suffix for shifts/literals
    };

    codeFiles['j1939_config.c'] = `/* J1939 Configuration Implementation */
#include "j1939_config.h"
#include <stddef.h> // For NULL
#include <stdio.h>  // For printf in examples

/* PGN Configuration Table */
const J1939_PGN_Config_t J1939_PGN_Configs[J1939_PGN_COUNT] = {
${(j1939Config.pgns || []).map(pgn => {
  const handlerName = `${pgn.name.replace(/[^A-Za-z0-9_]/g, '_')}_Handler`;
  return `    /* ${pgn.name} */
    {
        .pgn = PGN_${pgn.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()}, /* PGN */
        .length = PGN_${pgn.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()}_LENGTH, /* Length */
        .transmitRate = PGN_${pgn.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()}_RATE, /* Transmit Rate (ms) */
        .priority = PGN_${pgn.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()}_PRIORITY, /* Priority */
        .callback = ${handlerName}      /* Callback */
    }`;
}).join(',\n')}
};

/* Optional: SPN Configuration Table (Example - not strictly needed by core stack) */
/* This could be used by handler implementations if desired */
/*
const J1939_SPN_Config_t J1939_SPN_Configs[] = {
${(j1939Config.pgns || []).flatMap(pgn =>
  (pgn.spns || []).map(spn => {
    const spnNameUpper = spn.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
    return `    / * ${spn.name} (${pgn.name}) * /
    {
        .spn = SPN_${spnNameUpper},         / * SPN * /
        .startBit = SPN_${spnNameUpper}_START_BIT,   / * Start Bit * /
        .length = SPN_${spnNameUpper}_LENGTH,    / * Length (bits) * /
        .resolution = SPN_${spnNameUpper}_RESOLUTION, / * Resolution * /
        .offset = SPN_${spnNameUpper}_OFFSET       / * Offset * /
        // .isSigned = false // Example
    }`;
  })
).join(',\n')}
};
const uint32_t J1939_SPN_CONFIG_COUNT = sizeof(J1939_SPN_Configs) / sizeof(J1939_SPN_Configs[0]);
*/


/* PGN Handler Function Stubs */
${(j1939Config.pgns || []).map(pgn => {
  const handlerName = `${pgn.name.replace(/[^A-Za-z0-9_]/g, '_')}_Handler`;
  const pgnNameUpper = pgn.name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
  return `
/* Handler for ${pgn.name} (PGN ${pgn.pgn}) */
void ${handlerName}(uint8_t* data, uint8_t length) {
    if (data == NULL) {
        // Optional: Handle error - null data pointer
        printf("Error: NULL data received for PGN ${pgn.pgn}\\n");
        return;
    }
    // Optional: Check if length matches expected length from config
    // if (length < PGN_${pgnNameUpper}_LENGTH) {
    //     printf("Warning: Received data length (%u) shorter than expected (%u) for PGN ${pgn.pgn}\\n",
    //            length, PGN_${pgnNameUpper}_LENGTH);
    //     // Decide whether to proceed or return
    // }

    /* TODO: Implement application logic for received ${pgn.name} data */
    // Example: Log reception
    // printf("Received PGN ${pgn.pgn} (${pgn.name}) with length %u\\n", length);

${(pgn.spns || []).length > 0 ? `
    /* Example SPN Extraction: */
${(pgn.spns || []).map(spn => {
  const spnNameClean = spn.name.replace(/[^A-Za-z0-9_]/g, '_');
  const spnNameUpper = spnNameClean.toUpperCase();
  const startBit = parseInt(spn.startBit || '0');
  const bitLength = parseInt(spn.length || '1');
  const resolution = parseFloat(spn.resolution || '1');
  const offset = parseFloat(spn.offset || '0');
  const varType = getSpnCType(bitLength);
  const mask = getSpnMask(bitLength);

  // Calculate byte boundaries (using integer division)
  const startByte = Math.floor(startBit / 8);
  const endByte = Math.floor((startBit + bitLength - 1) / 8);
  const startBitInByte = startBit % 8;
  const bytesToRead = endByte - startByte + 1;

  // Check if SPN fits within the *expected* PGN length from config
  if (endByte >= pgn.length) {
      return `    /* SPN ${spn.spn} (${spn.name}) - Error: Configured SPN exceeds configured PGN length ${pgn.length} */`;
  }

  return `
    /* --- Extract ${spn.name} (SPN ${spn.spn}) --- */
    ${varType} raw_${spnNameClean} = 0;
    float physical_${spnNameClean} = 0.0f;
    { // Scope for extraction variables
        uint8_t byteIndex;
        // Check if the *received* data buffer is long enough for this SPN
        if (length > ${endByte}) { // Check if last byte needed is within received length
             // Read the relevant bytes in Little Endian order
             for (byteIndex = 0; byteIndex < ${bytesToRead}; byteIndex++) {
                 // Check index bounds again just in case (should be covered by length > endByte)
                 if ((${startByte} + byteIndex) < length) {
                    raw_${spnNameClean} |= (${varType})(data[${startByte} + byteIndex]) << (byteIndex * 8);
                 } else {
                    // This case should ideally not be reached if length > endByte check passes
                    printf("Error: Unexpected short data during SPN ${spn.spn} extraction.\\n");
                    raw_${spnNameClean} = 0; // Indicate error
                    break;
                 }
             }

             /* Shift to align the start bit */
             raw_${spnNameClean} >>= ${startBitInByte};

             /* Apply mask for the signal length */
             raw_${spnNameClean} &= ${mask};

             /* Convert to physical value */
             /* TODO: Handle signed vs unsigned based on SPN definition if needed */
             /* TODO: Handle special values (e.g., 0xFF... = Not Available/Error) if applicable */
             physical_${spnNameClean} = (float)raw_${spnNameClean} * ${resolution}f + ${offset}f;

             /* Use physical_${spnNameClean} in application logic */
             // Example: printf("  SPN ${spn.spn} (${spn.name}): Raw=0x%llX, Physical=%f\\n", (unsigned long long)raw_${spnNameClean}, physical_${spnNameClean});
        } else {
             /* Optional: Handle error - received data too short for this SPN */
             // printf("Warning: Received data length (%u) too short for SPN ${spn.spn} (needs %u bytes)\\n", length, ${endByte + 1});
        }
    } // End scope for ${spn.name}
`;
}).join('')}` : '    /* No SPNs defined in config for this PGN */'}
}`;
}).join('\n')}
`;

    return codeFiles;
};
