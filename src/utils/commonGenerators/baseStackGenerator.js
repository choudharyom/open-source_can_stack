// Generates common code files regardless of specific configuration details

export const generateBaseStackCode = (config) => {
  // Ensure messages array exists, default to empty if not
  const messages = config?.messages || [];
  // Default values for potentially missing config options
  const mcu = config?.mcu || 'Generic';
  const os = config?.os || 'Bare-metal';
  const protocol = config?.protocol || 'None';
  const canFD = config?.canFD || false;
  const isoTP = config?.isoTP || false; // Needed for UDS/other TP protocols

  return {
    'can_driver.h': `/* CAN Driver Interface Header */
#ifndef CAN_DRIVER_H
#define CAN_DRIVER_H

#include <stdint.h> // For uint8_t, uint32_t

/* --- Type Definitions --- */

/* CAN message callback function pointer type */
/* The callback receives the CAN ID, data pointer, and data length */
typedef void (*CAN_CallbackFunction)(uint32_t id, uint8_t* data, uint8_t length);

/* --- Function Prototypes --- */

/* Initialize CAN hardware and driver internals */
/* This function typically calls the MCU-specific CAN_HW_Init */
void CAN_Init(void);

/* Register a callback function for a specific CAN ID */
/* Allows higher layers (protocol, application) to handle specific messages */
/* Returns 0 on success, non-zero on failure (e.g., no more callback slots) */
uint8_t CAN_RegisterMessageCallback(uint32_t id, CAN_CallbackFunction callback);

/* Process CAN messages (Polling Method) */
/* Called periodically in the main loop or a low-priority task if not using interrupts. */
/* Checks for received messages, errors, state changes etc. */
void CAN_ProcessMessages(void);

/* Send a CAN message */
/* This function typically calls the MCU-specific CAN_HW_SendMessage */
/* id: CAN identifier (use 0x80000000 flag for extended ID) */
/* data: Pointer to data buffer */
/* length: Data length code (0-8 for Classic CAN, 0-64 for CAN FD) */
void CAN_SendMessage(uint32_t id, uint8_t* data, uint8_t length);

/* Process a received CAN message (Internal) */
/* Called by hardware-specific code (ISR or polling function) when a message is received. */
/* This function finds and invokes the registered callback for the message ID. */
void CAN_ProcessReceivedMessage(uint32_t id, uint8_t* data, uint8_t length);

/* --- Generated Message Handler Function Prototypes --- */
/* Stubs for handlers defined in can_cfg.h */
${messages.map(msg => `void ${msg.name.replace(/\s+/g, '')}Handler(uint32_t id, uint8_t* data, uint8_t length);`).join('\n')}

#endif /* CAN_DRIVER_H */`,

    'can_driver.c': `/* CAN Driver Implementation */
#include "can_driver.h"
#include "can_cfg.h"    // For configuration defines
#include <stddef.h>     // For NULL

/* --- Callback Registry --- */
#define MAX_CALLBACKS 32 // Maximum number of registered callbacks
static struct {
  uint32_t id;
  CAN_CallbackFunction callback;
} callbackRegistry[MAX_CALLBACKS];
static uint8_t callbackCount = 0;

/* --- Function Implementations --- */

/* Register a callback for a specific CAN ID */
uint8_t CAN_RegisterMessageCallback(uint32_t id, CAN_CallbackFunction callback) {
  if (callbackCount < MAX_CALLBACKS && callback != NULL) {
    // Optional: Check if ID is already registered? Overwrite or return error?
    callbackRegistry[callbackCount].id = id;
    callbackRegistry[callbackCount].callback = callback;
    callbackCount++;
    return 0; // Success
  }
  return 1; // Failure (table full or NULL callback)
}

/* Process a received CAN message (Internal) */
/* Finds and calls the registered callback for the given ID */
void CAN_ProcessReceivedMessage(uint32_t id, uint8_t* data, uint8_t length) {
  for (uint8_t i = 0; i < callbackCount; i++) {
    // Simple ID matching - Add mask/range matching if needed
    if (callbackRegistry[i].id == id) {
      if (callbackRegistry[i].callback != NULL) {
        callbackRegistry[i].callback(id, data, length);
      }
      break; // Assume only one callback per ID for now
    }
  }
  // Optional: Handle messages with no registered callback
}

/* --- Generated Message Handler Function Stubs --- */
/* Implement the actual logic for handling each message here */
${messages.map(msg => `
void ${msg.name.replace(/\s+/g, '')}Handler(uint32_t id, uint8_t* data, uint8_t length) {
  (void)id; // Suppress unused parameter warning if ID is fixed
  (void)data; // Suppress unused parameter warning
  (void)length; // Suppress unused parameter warning
  /* TODO: Implement message handling logic for ${msg.name} (ID: ${msg.id}) */
  /* Example: Decode data bytes, update application state */
}`).join('\n')}

/* --- Helper function for CAN_ProcessReceivedMessage --- */
/* This allows the generic_can.c stub to call the callback logic */
void CAN_CallMatchingCallback(uint32_t id, uint8_t* data, uint8_t length) {
    CAN_ProcessReceivedMessage(id, data, length);
}
`,

    'can_cfg.h': `/* CAN Configuration Header */
#ifndef CAN_CFG_H
#define CAN_CFG_H

/* --- Generated Configuration --- */
/* Target MCU: ${mcu} */
/* Operating System: ${os} */
/* Protocol Layer: ${protocol} */

/* --- CAN Bus Configuration --- */
#define CAN_BAUDRATE 500000 // Example: 500 kbps (Adjust in MCU-specific init)
#define CAN_FD_ENABLED ${canFD ? '1' : '0'} // Set to 1 if CAN FD is used

/* --- Protocol Specific Flags --- */
#define ISO_TP_ENABLED ${isoTP || protocol === 'UDS' ? '1' : '0'} // Enable if ISO-TP is selected or needed by protocol (e.g., UDS)

/* --- Message Definitions --- */
/* Define symbolic names for CAN message IDs used in the application */
${messages.map(msg => `#define CAN_ID_${msg.name.replace(/\s+/g, '').toUpperCase()} ${msg.id}`).join('\n')}

/* --- Callback Function Prototypes (from can_driver.h) --- */
#include <stdint.h> // Ensure types are available
typedef void (*CAN_CallbackFunction)(uint32_t id, uint8_t* data, uint8_t length);

/* Declare message handler functions (defined in can_driver.c) */
${messages.map(msg => `extern void ${msg.name.replace(/\s+/g, '')}Handler(uint32_t id, uint8_t* data, uint8_t length);`).join('\n')}

#endif /* CAN_CFG_H */`,

    'README.md': `# Generated CAN Stack

This directory contains the generated source code for a CAN communication stack based on your configuration.

## Configuration Summary

*   **Target MCU:** ${mcu}
*   **Operating System:** ${os}
*   **Protocol Layer:** ${protocol}
*   **CAN FD Support:** ${canFD ? 'Enabled' : 'Disabled'}
*   **ISO-TP Support:** ${isoTP || protocol === 'UDS' ? 'Enabled' : 'Disabled'}

## File Overview

*   \`can_driver.h\` / \`.c\`: Core CAN driver interface and callback registry. Message handler stubs are here.
*   \`can_cfg.h\`: Configuration parameters and message ID definitions.
*   \`${protocol.toLowerCase()}.h\` / \`.c\` (if protocol selected): Protocol layer implementation (e.g., UDS, CANopen, J1939).
*   \`main.c\` (or OS-specific files like \`Can.c\`): Main application entry point or OS integration code.
*   \`<mcu_driver>.c\` (e.g., \`stm32f4xx_can.c\`, \`s32k144_can.c\`, \`generic_can.c\`): Hardware-specific CAN peripheral driver code. **NOTE:** \`generic_can.c\` requires manual implementation of hardware functions.
*   \`isotp.h\` / \`.c\` (if enabled): ISO-TP (ISO 15765-2) transport protocol implementation (basic version may be provided).

## Message Definitions

${messages.map(msg => `*   **${msg.name}**: ID \`${msg.id}\` (Handler: \`${msg.name.replace(/\s+/g, '')}Handler\`)`).join('\n')}

## Getting Started

1.  **Toolchain Setup:** Ensure you have the correct compiler and development tools installed for the target MCU (${mcu}).
2.  **Hardware Abstraction (if using \`generic_can.c\`):** If you selected a generic MCU target, you MUST implement the functions declared \`extern\` in \`generic_can.c\` (\`CAN_HW_Init\`, \`CAN_HW_SendMessage\`) and the necessary ISRs for your specific hardware.
3.  **Project Integration:** Add all generated \`.c\` and \`.h\` files to your project's build system (e.g., Makefile, CMakeLists.txt, IDE project). Ensure include paths are set correctly.
4.  **Implement Message Handlers:** Fill in the \`TODO\` sections within the message handler functions in \`can_driver.c\` with your application logic for processing received CAN messages.
5.  **Implement Protocol Logic (if applicable):** If you selected a protocol like UDS, CANopen, or J1939, review the protocol-specific files (\`${protocol.toLowerCase()}.c\`) and implement any necessary application-level interactions (e.g., Object Dictionary access for CANopen, DID handling for UDS).
6.  **Build and Flash:** Compile the project and flash it onto your target hardware.
7.  **Debugging:** Use a debugger and a CAN interface tool to monitor bus traffic and verify functionality.

## Customization

*   Modify \`can_cfg.h\` to adjust basic parameters (though significant changes might require regenerating code).
*   Refine the hardware-specific driver code (\`<mcu_driver>.c\`) for optimal performance or specific features.
*   Enhance the protocol layer implementations as needed.

## License

This generated code is provided as-is without warranty. Please review and test thoroughly before use in a production environment.
`
  };
};
