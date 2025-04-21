// Generates OS-specific code for Bare-metal target

export const generateBareMetalCode = (config) => {
  // Determine include path for protocol header, default to empty string if no protocol
  const protocolInclude = config.protocol ? `#include "${config.protocol.toLowerCase()}.h"` : '';
  // Determine protocol init/process calls, default to comments if no protocol
  const protocolInitCall = config.protocol ? `  /* Initialize ${config.protocol} protocol */\n  ${config.protocol}_Init();` : '  /* No protocol selected */';
  const protocolProcessCall = config.protocol ? `  /* Process ${config.protocol} protocol */\n    ${config.protocol}_Process();` : '      /* No protocol processing */';


  return {
    'main.c': `/* Main application for bare-metal implementation */
#include <stdint.h>
#include "can_driver.h"
#include "can_cfg.h"
${protocolInclude}

int main(void) {
  /* Initialize hardware and peripherals */
  SystemInit(); // Assuming a CMSIS standard SystemInit

  /* Initialize CAN driver */
  CAN_Init();

${protocolInitCall}

  /* Main loop */
  while (1) {
    /* Process CAN messages (if polling is used) */
    CAN_ProcessMessages(); // May be empty if interrupt-driven

${protocolProcessCall}

    /* Add other application logic here */

  }

  /* This point should never be reached */
  return 0;
}`
  };
};
