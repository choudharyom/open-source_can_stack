// Generates UDS (ISO 14229) specific code files

export const generateUdsCode = (udsConfig) => {
  if (!udsConfig) {
    console.warn("UDS configuration is missing.");
    return {}; // Return empty object if no UDS config provided
  }

  const codeFiles = {};

  // Generate uds_config.h based on the provided configuration
  codeFiles['uds_config.h'] = `/* UDS Configuration */
#ifndef UDS_CONFIG_H
#define UDS_CONFIG_H

/* UDS Diagnostic IDs */
#define UDS_RX_ID ${udsConfig.rxId || '0x7E0'}
#define UDS_TX_ID ${udsConfig.txId || '0x7E8'}

/* Address type */
#define UDS_ADDRESSING_TYPE_${(udsConfig.addressType || 'physical').toUpperCase()}

/* Supported diagnostic sessions */
${(udsConfig.supportedSessions || ['default']).map(session =>
  `#define UDS_SUPPORT_${session.toUpperCase()}_SESSION 1`
).join('\n')}

/* Security level */
#define UDS_MAX_SECURITY_LEVEL ${udsConfig.securityLevel || 0}

/* Pre-defined diagnostic requests */
${(udsConfig.requests || []).map((req, idx) => {
  const bytes = [req.service];
  if (req.subfunction) bytes.push(req.subfunction);
  if (req.dataBytes && req.dataBytes.length > 0) {
    // Ensure dataBytes are treated as hex strings and converted properly
    bytes.push(...req.dataBytes.map(b => String(b).startsWith('0x') ? String(b).substring(2) : Number(b).toString(16).padStart(2, '0')));
  }

  return `/* ${req.description || `Request ${idx + 1}`} */
#define UDS_REQ_${idx + 1}_DATA {${bytes.map(b => '0x' + String(b).toUpperCase()).join(', ')}}
#define UDS_REQ_${idx + 1}_SIZE ${bytes.length}`;
}).join('\n\n')}

#endif /* UDS_CONFIG_H */`;

  // Add the basic uds.h and uds.c files (similar to the original structure)
  // Note: These might need further updates later based on the advanced config
  codeFiles['uds.h'] = `/* UDS (ISO 14229) Protocol Implementation */
#ifndef UDS_H
#define UDS_H

#include "can_driver.h"
#include "uds_config.h" // Include the generated config

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
#define UDS_RESPONSE_POSITIVE                  0x00 // Actually means no code, positive response uses 0x40 + SID
#define UDS_NRC_GENERAL_REJECT                 0x10
#define UDS_NRC_SERVICE_NOT_SUPPORTED          0x11
#define UDS_NRC_SUBFUNCTION_NOT_SUPPORTED      0x12
#define UDS_NRC_INCORRECT_MESSAGE_LENGTH       0x13
#define UDS_NRC_BUSY_REPEAT_REQUEST            0x21
#define UDS_NRC_CONDITIONS_NOT_CORRECT         0x22
#define UDS_NRC_REQUEST_SEQUENCE_ERROR         0x24
#define UDS_NRC_REQUEST_OUT_OF_RANGE           0x31
#define UDS_NRC_SECURITY_ACCESS_DENIED         0x33
#define UDS_NRC_INVALID_KEY                    0x35
#define UDS_NRC_EXCEEDED_NUMBER_OF_ATTEMPTS    0x36
#define UDS_NRC_REQUIRED_TIME_DELAY_NOT_EXPIRED 0x37
#define UDS_NRC_UPLOAD_DOWNLOAD_NOT_ACCEPTED   0x70
#define UDS_NRC_TRANSFER_DATA_SUSPENDED        0x71
#define UDS_NRC_GENERAL_PROGRAMMING_FAILURE    0x72
#define UDS_NRC_WRONG_BLOCK_SEQUENCE_COUNTER   0x73
#define UDS_NRC_REQUEST_CORRECTLY_RECEIVED_RESPONSE_PENDING 0x78
#define UDS_NRC_SUBFUNCTION_NOT_SUPPORTED_IN_ACTIVE_SESSION 0x7E
#define UDS_NRC_SERVICE_NOT_SUPPORTED_IN_ACTIVE_SESSION 0x7F

/* Initialize the UDS stack */
void UDS_Init(void);

/* Process UDS communication */
void UDS_Process(void);

/* Process a complete UDS message received from transport layer */
void UDS_ProcessMessage(uint8_t* data, uint16_t length);

/* Send a positive response */
void UDS_SendPositiveResponse(uint8_t serviceId, uint8_t* data, uint16_t length);

/* Send a negative response */
void UDS_SendNegativeResponse(uint8_t serviceId, uint8_t responseCode);

#endif /* UDS_H */`;

  codeFiles['uds.c'] = `/* UDS (ISO 14229) Protocol Implementation */
#include "uds.h"
#include "can_cfg.h" // For ISO_TP_ENABLED flag
#include "can_driver.h" // For CAN_SendMessage

#if ISO_TP_ENABLED
#include "isotp.h" /* ISO-TP transport layer for segmented messages */
#endif

/* Current session and security level */
static uint8_t currentSession = 1; /* Default session */
static uint8_t securityLevel = 0;  /* Not authenticated */

/* Forward declarations for service handlers */
static void UDS_HandleSessionControl(uint8_t* data, uint16_t length);
static void UDS_HandleEcuReset(uint8_t* data, uint16_t length);
static void UDS_HandleSecurityAccess(uint8_t* data, uint16_t length);
static void UDS_HandleTesterPresent(uint8_t* data, uint16_t length);
// Add forward declarations for other service handlers (ReadDataById, WriteDataById, etc.)

/* Initialize the UDS stack */
void UDS_Init(void) {
  #if ISO_TP_ENABLED
    /* Initialize ISO-TP layer using IDs from uds_config.h */
    ISOTP_Init(UDS_RX_ID, UDS_TX_ID);
    /* Register ISO-TP callback for complete messages */
    ISOTP_RegisterCallback(UDS_ProcessMessage);
  #else
    /* If ISO-TP is not enabled, register directly with CAN driver */
    /* Note: This only works for single-frame messages */
    CAN_RegisterMessageCallback(UDS_RX_ID, UDS_ProcessMessage); // Assuming direct CAN callback matches ISOTP callback signature
  #endif

  currentSession = 1; // Reset to default session
  securityLevel = 0;  // Reset security level
}

/* Process UDS communication */
void UDS_Process(void) {
  /* This is called periodically */
  #if ISO_TP_ENABLED
    /* Handle any pending ISO-TP segmented messages */
    ISOTP_Process();
  #else
    /* If not using ISO-TP, CAN messages are processed directly via callback */
    /* Potentially add periodic tasks like TesterPresent timeout check here */
  #endif
}

/* Process a complete UDS message */
void UDS_ProcessMessage(uint8_t* data, uint16_t length) {
  if (length < 1) {
    return; /* Invalid message */
  }

  uint8_t serviceId = data[0];

  // Handle TesterPresent with suppressPositiveResponse bit
  if (serviceId == UDS_SID_TESTER_PRESENT && length >= 2 && (data[1] & 0x80)) {
      // Suppress positive response requested, just handle internally (e.g., reset timeout)
      // UDS_HandleTesterPresent(data, length); // Call handler if internal logic needed
      return; // Do not send a response
  }


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
       UDS_HandleTesterPresent(data, length); // Handle even if response isn't suppressed
      break;

    /* Add other service handlers here */
    // case UDS_SID_READ_DATA_BY_IDENTIFIER:
    //   UDS_HandleReadDataByIdentifier(data, length);
    //   break;
    // case UDS_SID_WRITE_DATA_BY_IDENTIFIER:
    //   UDS_HandleWriteDataByIdentifier(data, length);
    //   break;
    // case UDS_SID_ROUTINE_CONTROL:
    //   UDS_HandleRoutineControl(data, length);
    //   break;

    default:
      /* Service not supported */
      UDS_SendNegativeResponse(serviceId, UDS_NRC_SERVICE_NOT_SUPPORTED);
      break;
  }
}

/* Send a positive response */
void UDS_SendPositiveResponse(uint8_t serviceId, uint8_t* data, uint16_t length) {
  uint8_t responseBuffer[4095]; // Max ISO-TP size
  responseBuffer[0] = serviceId + 0x40; // Positive response SID

  if (data != NULL && length > 0) {
    // Check buffer overflow potential
    if (length > sizeof(responseBuffer) - 1) {
        // Handle error: response too long
        // Maybe send General Reject? Or log error.
        UDS_SendNegativeResponse(serviceId, UDS_NRC_GENERAL_REJECT); // Example error handling
        return;
    }
    memcpy(&responseBuffer[1], data, length);
  }

  #if ISO_TP_ENABLED
    ISOTP_SendData(responseBuffer, length + 1);
  #else
    // Check if message fits in a single CAN frame
    if (length + 1 <= 8) {
        CAN_SendMessage(UDS_TX_ID, responseBuffer, length + 1);
    } else {
        // Handle error: Cannot send multi-frame without ISO-TP
        // Log error or potentially send NRC (though sending NRC might also fail)
    }
  #endif
}

/* Send a negative response */
void UDS_SendNegativeResponse(uint8_t serviceId, uint8_t responseCode) {
  uint8_t responseBuffer[3];
  responseBuffer[0] = 0x7F; // Negative response frame ID
  responseBuffer[1] = serviceId;
  responseBuffer[2] = responseCode;

  #if ISO_TP_ENABLED
    ISOTP_SendData(responseBuffer, 3);
  #else
    CAN_SendMessage(UDS_TX_ID, responseBuffer, 3);
  #endif
}

// --- Service Handler Implementations ---

static void UDS_HandleSessionControl(uint8_t* data, uint16_t length) {
  if (length != 2) {
    UDS_SendNegativeResponse(UDS_SID_DIAGNOSTIC_SESSION_CONTROL, UDS_NRC_INCORRECT_MESSAGE_LENGTH);
    return;
  }
  uint8_t requestedSession = data[1];

  // Basic session support check (replace with config check)
  #ifdef UDS_SUPPORT_DEFAULT_SESSION
  if (requestedSession == 0x01) { /* Default Session */
      currentSession = requestedSession;
      securityLevel = 0; // Security typically resets on session change
      // Send positive response (no extra data)
      UDS_SendPositiveResponse(UDS_SID_DIAGNOSTIC_SESSION_CONTROL, &requestedSession, 1);
      return;
  }
  #endif
  #ifdef UDS_SUPPORT_PROGRAMMING_SESSION
  if (requestedSession == 0x02) { /* Programming Session */
      // Add conditions check if necessary (e.g., vehicle speed)
      currentSession = requestedSession;
      securityLevel = 0;
      UDS_SendPositiveResponse(UDS_SID_DIAGNOSTIC_SESSION_CONTROL, &requestedSession, 1);
      return;
  }
  #endif
   #ifdef UDS_SUPPORT_EXTENDED_DIAGNOSTIC_SESSION
  if (requestedSession == 0x03) { /* Extended Diagnostic Session */
      currentSession = requestedSession;
      securityLevel = 0;
      UDS_SendPositiveResponse(UDS_SID_DIAGNOSTIC_SESSION_CONTROL, &requestedSession, 1);
      return;
  }
  #endif
  // Add checks for other supported sessions based on uds_config.h

  // If session is not supported
  UDS_SendNegativeResponse(UDS_SID_DIAGNOSTIC_SESSION_CONTROL, UDS_NRC_SUBFUNCTION_NOT_SUPPORTED);
}

static void UDS_HandleEcuReset(uint8_t* data, uint16_t length) {
  if (length != 2) {
    UDS_SendNegativeResponse(UDS_SID_ECU_RESET, UDS_NRC_INCORRECT_MESSAGE_LENGTH);
    return;
  }
  uint8_t resetType = data[1];

  if (resetType == 0x01) { /* Hard Reset */
    // Check conditions (e.g., security level if required)
    UDS_SendPositiveResponse(UDS_SID_ECU_RESET, &resetType, 1);
    // !!! Trigger ECU reset here !!!
    // This part is highly hardware-dependent (e.g., call a watchdog reset function)
    // while(1); // Ensure no further code executes before reset
  } else {
    UDS_SendNegativeResponse(UDS_SID_ECU_RESET, UDS_NRC_SUBFUNCTION_NOT_SUPPORTED);
  }
}

static void UDS_HandleSecurityAccess(uint8_t* data, uint16_t length) {
    // Placeholder - Complex logic involving seed/key exchange
    // Needs state machine, random number generation, key comparison etc.
    // Depends heavily on UDS_MAX_SECURITY_LEVEL and specific algorithm
    UDS_SendNegativeResponse(UDS_SID_SECURITY_ACCESS, UDS_NRC_SERVICE_NOT_SUPPORTED); // Default: Not supported
}

static void UDS_HandleTesterPresent(uint8_t* data, uint16_t length) {
    if (length != 2) {
        UDS_SendNegativeResponse(UDS_SID_TESTER_PRESENT, UDS_NRC_INCORRECT_MESSAGE_LENGTH);
        return;
    }
    uint8_t subFunction = data[1];

    // Check if sub-function is 0x00 (zeroSubFunction)
    if ((subFunction & 0x7F) == 0x00) { // Ignore suppressPositiveResponse bit for check
        // Reset communication timeout or perform other keep-alive actions
        // If suppressPositiveResponse bit (0x80) is NOT set, send response
        if (!(subFunction & 0x80)) {
             UDS_SendPositiveResponse(UDS_SID_TESTER_PRESENT, &subFunction, 1); // Echo sub-function
        }
    } else {
        UDS_SendNegativeResponse(UDS_SID_TESTER_PRESENT, UDS_NRC_SUBFUNCTION_NOT_SUPPORTED);
    }
}

// Implement other service handlers (ReadDataByIdentifier, WriteDataByIdentifier, etc.)
// These will need to interact with application data based on DID definitions.
`;

  // Check if ISO-TP is needed and add basic files if enabled in config
  // We assume isoTP might be a top-level config flag or part of udsConfig
  // Let's check a potential top-level config.isoTP flag first
  // const isoTpEnabled = config?.isoTP || udsConfig?.isoTP; // Check both possibilities
  // For now, we'll rely on the #if ISO_TP_ENABLED in the C code,
  // which reads from can_cfg.h (generated later)

  // Placeholder for ISO-TP files - generation logic would go here if needed
  // if (isoTpEnabled) {
  //   codeFiles['isotp.h'] = '/* Basic ISO-TP Header */ ...';
  //   codeFiles['isotp.c'] = '/* Basic ISO-TP Implementation */ ...';
  // }


  return codeFiles;
};
