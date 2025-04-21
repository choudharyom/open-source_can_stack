// Generates basic CAN protocol specific code files

export const generateCanCode = (config) => {
  // Check if messages array exists, default to empty if not
  const messages = config?.messages || [];

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
#include "can_cfg.h" // For message IDs
#include "can_driver.h" // For CAN_RegisterMessageCallback, CAN_SendMessage, CAN_ProcessMessages

/* Initialize the CAN protocol layer */
void CAN_Protocol_Init(void) {
  /* Register message handlers based on config */
${messages.map(msg => `  CAN_RegisterMessageCallback(${msg.id}, ${msg.name.replace(/\s+/g, '')}Handler);`).join('\n')}
}

/* Send a CAN message */
void CAN_Protocol_SendMessage(uint32_t id, uint8_t* data, uint8_t length) {
  CAN_SendMessage(id, data, length);
}

/* Process received CAN messages */
void CAN_Protocol_ProcessMessages(void) {
  /* This is called periodically to process incoming messages */
  /* In many driver implementations (like interrupt-driven ones),
     this might be empty or handle polling tasks if needed. */
  CAN_ProcessMessages();
}`
  };
};
