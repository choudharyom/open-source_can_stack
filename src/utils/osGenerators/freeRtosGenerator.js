// Generates OS-specific code for FreeRTOS target

export const generateFreeRtosCode = (config) => {
  // Determine include path for protocol header, default to empty string if no protocol
  const protocolInclude = config.protocol ? `#include "${config.protocol.toLowerCase()}.h"` : '';
  // Determine protocol init/process calls, default to comments if no protocol
  const protocolInitCall = config.protocol ? `  ${config.protocol}_Init();` : '  /* No protocol selected */';
  const protocolProcessCall = config.protocol ? `    /* Process ${config.protocol} protocol */\n    ${config.protocol}_Process();` : '      /* No protocol processing */';

  // Basic CAN_Message_t definition placeholder - adjust if needed based on actual driver
  const canMessageStruct = `
/* Basic structure for CAN messages (adjust based on actual driver) */
typedef struct {
  uint32_t id;
  uint8_t data[8];
  uint8_t dlc;
} CAN_Message_t;
`;

  return {
    'main.c': `/* Main application for FreeRTOS implementation */
#include <stdint.h>
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include "can_driver.h"
#include "can_cfg.h"
${protocolInclude}

${canMessageStruct}

/* Task handles */
TaskHandle_t canRxTaskHandle = NULL;
TaskHandle_t canTxTaskHandle = NULL;
TaskHandle_t appTaskHandle = NULL;

/* Queue for CAN messages */
QueueHandle_t canTxQueue = NULL;
#define CAN_TX_QUEUE_LENGTH 10 // Define queue length

/* CAN receive task */
void canRxTask(void *pvParameters) {
  (void)pvParameters; // Unused parameter

  while (1) {
    /* Process incoming CAN messages */
    /* This might involve waiting on a semaphore signaled by CAN RX ISR */
    /* or directly calling a polling function like CAN_ProcessMessages */
    CAN_ProcessMessages(); // Adapt based on driver implementation

    /* Small delay or yield */
    vTaskDelay(pdMS_TO_TICKS(1));
  }
}

/* CAN transmit task */
void canTxTask(void *pvParameters) {
  (void)pvParameters; // Unused parameter
  CAN_Message_t message;

  while (1) {
    /* Wait for a message to be queued for transmission */
    if (xQueueReceive(canTxQueue, &message, portMAX_DELAY) == pdTRUE) {
      /* Transmit the message using the CAN driver */
      CAN_SendMessage(message.id, message.data, message.dlc);
    }
  }
}

/* Application task */
void appTask(void *pvParameters) {
  (void)pvParameters; // Unused parameter

  /* Initialize protocol layer */
${protocolInitCall}

  while (1) {
    /* Application-specific logic */

${protocolProcessCall}

    /* Periodic operations or other application logic */

    /* Task delay */
    vTaskDelay(pdMS_TO_TICKS(10)); // Example delay
  }
}

int main(void) {
  /* Initialize hardware and peripherals */
  SystemInit(); // Assuming a CMSIS standard SystemInit

  /* Initialize CAN driver */
  CAN_Init();

  /* Create queues */
  canTxQueue = xQueueCreate(CAN_TX_QUEUE_LENGTH, sizeof(CAN_Message_t));
  if (canTxQueue == NULL) {
      // Handle queue creation error
      while(1);
  }

  /* Create tasks */
  BaseType_t status;
  status = xTaskCreate(canRxTask, "CAN_RX", configMINIMAL_STACK_SIZE, NULL, 3, &canRxTaskHandle);
  if (status != pdPASS) { /* Handle task creation error */ while(1); }

  status = xTaskCreate(canTxTask, "CAN_TX", configMINIMAL_STACK_SIZE, NULL, 3, &canTxTaskHandle);
  if (status != pdPASS) { /* Handle task creation error */ while(1); }

  // Allocate more stack for app task if needed
  status = xTaskCreate(appTask, "APP", configMINIMAL_STACK_SIZE * 2, NULL, 2, &appTaskHandle);
   if (status != pdPASS) { /* Handle task creation error */ while(1); }


  /* Start the scheduler */
  vTaskStartScheduler();

  /* This point should never be reached */
  for (;;);
  return 0;
}`
  };
};
