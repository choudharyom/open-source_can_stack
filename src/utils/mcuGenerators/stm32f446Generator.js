// Generates MCU-specific driver code for STM32F446

export const generateStm32f446Code = (config) => {
  // Config parameter might be used in the future for specific settings
  // like clock speed affecting baudrate calculation, pin configuration etc.
  // For now, it uses hardcoded values from the original function.

  // Placeholder for pin configuration - would ideally come from config
  const pinConfigComment = `/* TODO: Configure CAN GPIO pins (e.g., PA11, PA12 or PB8, PB9)
  * Enable GPIO clocks
  * Set Alternate Function mode
  * Configure speed, pull-up etc.
  */`;

  // Placeholder for filter configuration - would ideally come from config
  const filterConfigComment = `/* TODO: Configure CAN filters (e.g., accept all or specific IDs)
  * CAN_Instance->FMR |= CAN_FMR_FINIT; // Enter filter init mode
  * // Configure Filter Scale, Mode, FIFO Assignment, ID list/mask
  * // Example: Accept all into FIFO0
  * CAN_Instance->FS1R |= (1 << 0); // Filter 0 scale = 32-bit
  * CAN_Instance->FM1R &= ~(1 << 0); // Filter 0 mode = Mask mode
  * CAN_Instance->FFA1R &= ~(1 << 0); // Filter 0 FIFO = FIFO0
  * CAN_Instance->sFilterRegister[0].FR1 = 0x00000000; // Mask: Accept all IDs
  * CAN_Instance->sFilterRegister[0].FR2 = 0x00000000; // ID: Accept all IDs
  * CAN_Instance->FA1R |= (1 << 0); // Activate filter 0
  * CAN_Instance->FMR &= ~CAN_FMR_FINIT; // Leave filter init mode
  */`;

  // Example Bit Timing Calculation (needs actual PCLK1 frequency from config)
  // Assuming PCLK1 = 42MHz, Target Baudrate = 500kbps
  // Time Quantum = 1 / (PCLK1 / Prescaler)
  // Baudrate = 1 / ( (SJW + BS1 + BS2) * Time Quantum )
  // 500000 = 1 / ( (1 + 4 + 2) * (1 / (42MHz / 5)) ) -> Check calculation
  // 500000 = 1 / ( 7 * (1 / 8.4MHz) ) = 1 / ( 0.833 us ) = 1.2 MHz -> Incorrect
  // Let's try Prescaler = 6 => TQ = 1 / (42MHz/6) = 1/7MHz = 0.1428 us
  // Baudrate = 1 / ( (1 + BS1 + BS2) * TQ )
  // 500000 = 1 / ( (1 + 11 + 2) * 0.1428us ) = 1 / (14 * 0.1428us) = 1 / 2us = 500kbps -> Correct!
  // So, Prescaler=6, BS1=11, BS2=2, SJW=1
  const btrValue = `( (1-1) << 24) | /* SJW = 1 */
                  ( (11-1) << 16) | /* BS1 = 11 */
                  ( (2-1) << 20) | /* BS2 = 2 */
                  ( (6-1) << 0)`;  /* Prescaler = 6 */


  return {
    'stm32f4xx_hal_conf.h': `/* Minimal HAL Conf for CAN driver example */
#ifndef __STM32F4xx_HAL_CONF_H
#define __STM32F4xx_HAL_CONF_H

#define HAL_MODULE_ENABLED
#define HAL_GPIO_MODULE_ENABLED
#define HAL_RCC_MODULE_ENABLED
#define HAL_CAN_MODULE_ENABLED // Enable CAN module if using HAL functions directly

#include "stm32f4xx_hal_rcc.h"
#include "stm32f4xx_hal_gpio.h"
// Include other HAL modules as needed (e.g., DMA, TIM)
#ifdef HAL_CAN_MODULE_ENABLED
 #include "stm32f4xx_hal_can.h"
#endif /* HAL_CAN_MODULE_ENABLED */

/* Oscillator values - Adjust based on your hardware */
#define HSE_VALUE    ((uint32_t)8000000) /* Value of the External oscillator in Hz */
#define HSE_STARTUP_TIMEOUT    ((uint32_t)100)   /* Time out for HSE start up, in ms */
#define HSI_VALUE    ((uint32_t)16000000) /* Value of the Internal oscillator in Hz*/
#define LSI_VALUE    ((uint32_t)32000)    /* Value of LSI in Hz*/
#define LSE_VALUE    ((uint32_t)32768)    /* Value of LSE in Hz*/
#define LSE_STARTUP_TIMEOUT    ((uint32_t)5000)   /* Time out for LSE start up, in ms */

#define VDD_VALUE                    ((uint32_t)3300) /* Value of VDD in mv */
#define TICK_INT_PRIORITY            ((uint32_t)0x0F) /* Tick interrupt priority */
#define USE_RTOS                     0 // Set to 1 if using FreeRTOS with HAL SysTick

#define USE_HAL_CAN_REGISTER_CALLBACKS 0U // Set to 1 to use HAL callbacks instead of direct ISR

#endif /* __STM32F4xx_HAL_CONF_H */
`,
    'stm32f4xx_can.c': `/* STM32F4xx CAN driver implementation (using direct register access) */
#include "stm32f4xx.h"   // Core MCU header
#include "can_driver.h" // Generic CAN driver interface
#include "can_cfg.h"    // Generated CAN configuration

/* CAN controller instance (Assuming CAN1) */
#define CAN_INSTANCE CAN1

/* Initialize CAN hardware */
void CAN_HW_Init(void) {
  /* 1. Enable CAN and GPIO clocks */
  // Example: Assuming CAN1 uses PA11/PA12 or PB8/PB9
  // Enable GPIOA/GPIOB clock in RCC->AHB1ENR
  // Enable CAN1 clock in RCC->APB1ENR
  RCC->APB1ENR |= RCC_APB1ENR_CAN1EN;
  // Example: RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

  /* 2. Configure CAN pins */
  ${pinConfigComment}

  /* 3. Configure CAN Controller */
  /* Reset CAN peripheral */
  RCC->APB1RSTR |= RCC_APB1RSTR_CAN1RST;
  RCC->APB1RSTR &= ~RCC_APB1RSTR_CAN1RST;

  /* Enter initialization mode */
  CAN_INSTANCE->MCR |= CAN_MCR_INRQ;
  while (!(CAN_INSTANCE->MSR & CAN_MSR_INAK));

  /* Exit sleep mode */
  CAN_INSTANCE->MCR &= ~CAN_MCR_SLEEP;

  /* Set CAN operating modes */
  CAN_INSTANCE->MCR &= ~CAN_MCR_TTCM; // Time Triggered Mode disabled
  CAN_INSTANCE->MCR &= ~CAN_MCR_ABOM; // Automatic Bus-Off Management disabled (can be enabled)
  CAN_INSTANCE->MCR &= ~CAN_MCR_AWUM; // Automatic Wakeup Mode disabled
  CAN_INSTANCE->MCR &= ~CAN_MCR_NART; // No Automatic Retransmission disabled (retransmission enabled)
  CAN_INSTANCE->MCR &= ~CAN_MCR_RFLM; // Receive FIFO Locked Mode disabled (overwrite enabled)
  CAN_INSTANCE->MCR &= ~CAN_MCR_TXFP; // Transmit FIFO Priority disabled (identifier priority)

  /* Configure bit timing (Example for 500kbps @ 42MHz PCLK1) */
  CAN_INSTANCE->BTR = 0; // Reset register
  CAN_INSTANCE->BTR = ${btrValue};

  /* 4. Configure CAN filters */
  ${filterConfigComment}

  /* 5. Exit initialization mode */
  CAN_INSTANCE->MCR &= ~CAN_MCR_INRQ;
  while (CAN_INSTANCE->MSR & CAN_MSR_INAK);

  /* 6. Enable interrupts (FIFO 0 message pending) */
  CAN_INSTANCE->IER |= CAN_IER_FMPIE0;
  // Enable other interrupts as needed (Error, BusOff, FIFO1, TX Mailbox Empty etc.)

  /* 7. Enable CAN interrupts in NVIC */
  // Use CMSIS functions like NVIC_SetPriority and NVIC_EnableIRQ
  NVIC_SetPriority(CAN1_RX0_IRQn, 5); // Example priority
  NVIC_EnableIRQ(CAN1_RX0_IRQn);
  // Enable other relevant NVIC interrupts (CAN1_TX_IRQn, CAN1_SCE_IRQn)
}

/* Send a CAN message using hardware mailbox */
void CAN_HW_SendMessage(uint32_t id, uint8_t* data, uint8_t length) {
  uint8_t mailbox_index;
  uint32_t tsr = CAN_INSTANCE->TSR;

  /* Find an empty mailbox (TME0, TME1, TME2 bits) */
  if (tsr & CAN_TSR_TME0) {
    mailbox_index = 0;
  } else if (tsr & CAN_TSR_TME1) {
    mailbox_index = 1;
  } else if (tsr & CAN_TSR_TME2) {
    mailbox_index = 2;
  } else {
    /* No empty mailbox, handle error (e.g., wait or return error) */
    // For simplicity, we'll just return here. A real driver might queue.
    return;
  }

  /* Clear the mailbox */
  CAN_INSTANCE->sTxMailBox[mailbox_index].TIR = 0;
  CAN_INSTANCE->sTxMailBox[mailbox_index].TDTR = 0;
  CAN_INSTANCE->sTxMailBox[mailbox_index].TDLR = 0;
  CAN_INSTANCE->sTxMailBox[mailbox_index].TDHR = 0;

  /* Setup identifier (Standard or Extended) */
  if (id & 0x80000000) { // Check our custom flag for extended ID
    // Extended ID
    CAN_INSTANCE->sTxMailBox[mailbox_index].TIR = ((id & 0x1FFFFFFF) << 3) | CAN_TI0R_IDE;
  } else {
    // Standard ID
    CAN_INSTANCE->sTxMailBox[mailbox_index].TIR = ((id & 0x7FF) << 21);
  }

  /* Setup data length code (DLC) */
  CAN_INSTANCE->sTxMailBox[mailbox_index].TDTR = (length & 0x0F);

  /* Setup data bytes */
  uint32_t data_low = 0, data_high = 0;
  if (length > 0) data_low |= ((uint32_t)data[0] << 0);
  if (length > 1) data_low |= ((uint32_t)data[1] << 8);
  if (length > 2) data_low |= ((uint32_t)data[2] << 16);
  if (length > 3) data_low |= ((uint32_t)data[3] << 24);
  if (length > 4) data_high |= ((uint32_t)data[4] << 0);
  if (length > 5) data_high |= ((uint32_t)data[5] << 8);
  if (length > 6) data_high |= ((uint32_t)data[6] << 16);
  if (length > 7) data_high |= ((uint32_t)data[7] << 24);

  CAN_INSTANCE->sTxMailBox[mailbox_index].TDLR = data_low;
  CAN_INSTANCE->sTxMailBox[mailbox_index].TDHR = data_high;

  /* Request transmission */
  CAN_INSTANCE->sTxMailBox[mailbox_index].TIR |= CAN_TI0R_TXRQ;
}

/* CAN RX FIFO 0 Interrupt Handler */
void CAN1_RX0_IRQHandler(void) {
  /* Check FIFO 0 message pending flag */
  if (CAN_INSTANCE->RF0R & CAN_RF0R_FMP0_Msk) { // Check number of messages in FIFO0
    uint32_t id;
    uint8_t length;
    uint8_t data[8];
    uint32_t rir = CAN_INSTANCE->sFIFOMailBox[0].RIR;
    uint32_t rdtr = CAN_INSTANCE->sFIFOMailBox[0].RDTR;
    uint32_t rdlr = CAN_INSTANCE->sFIFOMailBox[0].RDLR;
    uint32_t rdhr = CAN_INSTANCE->sFIFOMailBox[0].RDHR;

    /* Get message ID (Standard or Extended) */
    if (rir & CAN_RI0R_IDE) { // IDE bit set = Extended ID
      id = (rir >> 3) & 0x1FFFFFFF;
      id |= 0x80000000; // Set our custom flag for extended ID
    } else { // Standard ID
      id = (rir >> 21) & 0x7FF;
    }

    /* Get data length */
    length = (rdtr & CAN_RDT0R_DLC);

    /* Get data bytes */
    data[0] = (uint8_t)((rdlr >> 0) & 0xFF);
    data[1] = (uint8_t)((rdlr >> 8) & 0xFF);
    data[2] = (uint8_t)((rdlr >> 16) & 0xFF);
    data[3] = (uint8_t)((rdlr >> 24) & 0xFF);
    data[4] = (uint8_t)((rdhr >> 0) & 0xFF);
    data[5] = (uint8_t)((rdhr >> 8) & 0xFF);
    data[6] = (uint8_t)((rdhr >> 16) & 0xFF);
    data[7] = (uint8_t)((rdhr >> 24) & 0xFF);

    /* Process received message using the generic driver function */
    CAN_ProcessReceivedMessage(id, data, length);

    /* Release FIFO 0 output mailbox */
    CAN_INSTANCE->RF0R |= CAN_RF0R_RFOM0;
  }

  /* Check for FIFO 0 overrun */
  if (CAN_INSTANCE->RF0R & CAN_RF0R_FOVR0) {
      // Handle overrun: Clear flag, potentially log error
      CAN_INSTANCE->RF0R |= CAN_RF0R_FOVR0;
  }
  /* Check for FIFO 0 full */
   if (CAN_INSTANCE->RF0R & CAN_RF0R_FULL0) {
      // Handle FIFO full: Clear flag, potentially log warning
      CAN_INSTANCE->RF0R |= CAN_RF0R_FULL0;
   }
}

/* Add other ISRs as needed (TX, SCE for errors/status changes) */
// void CAN1_TX_IRQHandler(void) { ... }
// void CAN1_SCE_IRQHandler(void) { ... }

`
  };
};
