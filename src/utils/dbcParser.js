// Function to parse DBC content
export const parseDBC = (content) => {
    const messages = [];
    const lines = content.split('\n');
  
    let currentMessage = null;
    let inMessageDefinition = false;
  
    for (const line of lines) {
      const trimmedLine = line.trim();
  
      // Parse message definition
      if (trimmedLine.startsWith('BO_ ')) {
        inMessageDefinition = true;
        // Format: BO_ message_id message_name: message_length sender
        const parts = trimmedLine.match(/BO_ (\d+) ([^:]+): (\d+) ([^\s]+)/);
        if (parts) {
          const id = parseInt(parts[1]);
          const name = parts[2].trim();
          const length = parseInt(parts[3]);
  
          currentMessage = {
            id: `0x${id.toString(16).toUpperCase()}`,
            name,
            dlc: length,
            signals: [],
            comments: [],
          };
  
          messages.push(currentMessage);
        }
      }
  
      // End of message definition block
      else if (inMessageDefinition && trimmedLine === '') {
        inMessageDefinition = false;
      }
  
      // Parse signal definition
      else if (trimmedLine.startsWith('SG_ ') && currentMessage) {
        // Updated regex to handle m1M, m2M, and standalone M
        const parts = trimmedLine.match(
          /SG_ ([^\s:]+(?:\s[mM](?:\d+[mM]|[mM]|\d+)?)?) : (\d+)\|(\d+)@([0-9+\-]+) \(([-+]?[\d\.Ee-]*),([-+]?[\d\.Ee-]*)\) \[([-+]?[\d\.]*)\|([-+]?[\d\.]*)\] "([^"]*)" (.*)/
        );
  
        if (parts) {
          const signalName = parts[1].trim();
          const startBit = parseInt(parts[2]);
          const length = parseInt(parts[3]);
  
          // Extract byte order and sign information
          const byteOrderInfo = parts[4];
          const byteOrder = byteOrderInfo.endsWith('0') ? 'little_endian' : 'big_endian';
          const isSigned = byteOrderInfo.includes('-');
  
          // Extract scaling and offset (support scientific notation)
          const factor = parseFloat(parts[5]);
          const offset = parseFloat(parts[6]);
  
          // Extract range information
          const minValue = parseFloat(parts[7]);
          const maxValue = parseFloat(parts[8]);
  
          // Extract unit and receivers
          const unit = parts[9];
          const receivers = parts[10].split(',').map((r) => r.trim()).filter((r) => r);
  
          currentMessage.signals.push({
            name: signalName,
            startBit,
            length,
            byteOrder,
            isSigned,
            factor,
            offset,
            minValue,
            maxValue,
            unit,
            receivers,
          });
          console.debug(`Parsed signal: ${signalName}`);
        } else {
          console.warn(`Failed to parse signal line: ${trimmedLine}`);
        }
      }
  
      // Parse message comments
      else if (trimmedLine.startsWith('CM_ BO_ ')) {
        const parts = trimmedLine.match(/CM_ BO_ (\d+) "([^"]+)";/);
        if (parts) {
          const messageId = parseInt(parts[1]);
          const comment = parts[2];
  
          const targetMessage = messages.find(
            (msg) => parseInt(msg.id.substring(2), 16) === messageId
          );
          if (targetMessage) {
            targetMessage.comments.push(comment);
          }
        }
      }
  
      // Parse signal comments
      else if (trimmedLine.startsWith('CM_ SG_ ')) {
        const parts = trimmedLine.match(/CM_ SG_ (\d+) ([^ ]+) "([^"]+)";/);
        if (parts) {
          const messageId = parseInt(parts[1]);
          const signalName = parts[2];
          const comment = parts[3];
  
          const targetMessage = messages.find(
            (msg) => parseInt(msg.id.substring(2), 16) === messageId
          );
          if (targetMessage) {
            const targetSignal = targetMessage.signals.find(
              (sig) => sig.name === signalName
            );
            if (targetSignal) {
              targetSignal.comment = comment;
            }
          }
        }
      }
  
      // Parse value definitions (enums)
      else if (trimmedLine.startsWith('VAL_ ')) {
        const parts = trimmedLine.match(/VAL_ (\d+) ([^ ]+) (.*);/);
        if (parts) {
          const messageId = parseInt(parts[1]);
          const signalName = parts[2];
          const valueDefText = parts[3];
  
          const valueDefs = [];
          const valParts = valueDefText.match(/(\d+) "([^"]+)"/g);
          if (valParts) {
            valParts.forEach((part) => {
              const [, value, text] = part.match(/(\d+) "([^"]+)"/);
              valueDefs.push({ value: parseInt(value), text });
            });
          }
  
          const targetMessage = messages.find(
            (msg) => parseInt(msg.id.substring(2), 16) === messageId
          );
          if (targetMessage) {
            const targetSignal = targetMessage.signals.find(
              (sig) => sig.name === signalName
            );
            if (targetSignal) {
              targetSignal.valueDefs = valueDefs;
            }
          }
        }
      }
    }
  
    return messages;
  };
  
  // Validate DBC file content
  export const validateDBC = (content) => {
    if (!content.includes('BO_') || !content.includes('SG_')) {
      return { valid: false, error: 'File does not appear to be a valid DBC file' };
    }
  
    try {
      const messages = parseDBC(content);
      const warnings = [];
  
      if (messages.length === 0) {
        return { valid: false, error: 'No valid message definitions found in file' };
      }
  
      const incompleteMessages = messages.filter(
        (msg) => msg.signals.length === 0 && msg.dlc > 0
      );
      if (incompleteMessages.length > 0) {
        warnings.push(
          `${incompleteMessages.length} messages have no signals despite non-zero DLC`
        );
      }
  
      return { valid: true, messages, warnings };
    } catch (error) {
      return { valid: false, error: `Error parsing DBC: ${error.message}` };
    }
  };
  
  export default { parseDBC, validateDBC };