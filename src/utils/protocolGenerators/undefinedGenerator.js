// Generates placeholder code when no specific protocol is defined

export const generateUndefinedCode = (config) => {
  // This function doesn't rely on specific protocol config
  return {
    'protocol_undefined.h': `/* Protocol Layer Undefined */
#ifndef PROTOCOL_UNDEFINED_H
#define PROTOCOL_UNDEFINED_H

#include "can_driver.h" // Include base driver header

/* Initialize the protocol layer (placeholder) */
void Protocol_Init(void);

/* Process protocol communication (placeholder) */
void Protocol_Process(void);

#endif /* PROTOCOL_UNDEFINED_H */`,
    'protocol_undefined.c': `/* Protocol Layer Undefined */
#include "protocol_undefined.h"

/* Initialize the protocol layer */
void Protocol_Init(void) {
  /* No protocol selected or protocol not recognized. */
  /* Add default initialization if needed, or leave empty. */
}

/* Process protocol communication */
void Protocol_Process(void) {
  /* No protocol selected or protocol not recognized. */
  /* Add default processing if needed, or leave empty. */
}`
  };
};
