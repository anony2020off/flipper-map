import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useFlipperStore = defineStore('flipper', () => {
  const port = ref(null);
  const reader = ref(null);
  const writer = ref(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const isSyncing = ref(false);
  const connectionError = ref(null);
  const fileList = ref([]);
  const fileReadQueue = ref([]);
  const isProcessingQueue = ref(false);
  
  const connect = async () => {
    if (!navigator.serial) {
      connectionError.value = "Web Serial API is not supported in your browser";
      return false;
    }

    try {
      isConnecting.value = true;
      port.value = await navigator.serial.requestPort();
      await port.value.open({ baudRate: 230400 });
      isConnected.value = true;

      // Create reader and writer
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.value.readable.pipeTo(textDecoder.writable);
      reader.value = textDecoder.readable.getReader();
      
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(port.value.writable);
      writer.value = textEncoder.writable.getWriter();
      
      // Send initial command to ensure we're in CLI mode
      await writer.value.write("\r\n");
      
      // Wait a bit for the device to respond
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set connected state
      isConnected.value = true;
      isConnecting.value = false;

      // TODO: Read files

      return true;
    } catch (error) {
      console.error("Error connecting to Flipper:", error);
      connectionError.value = error.message || "Failed to connect to Flipper";
      if (port.value && port.value.readable) {
        try {
          await port.value.close();
        } catch (closeError) {
          console.error("Error closing port:", closeError);
        }
      }
      port.value = null;
      reader.value = null;
      writer.value = null;

      return false;
    } finally {
      isConnecting.value = false;
    }
x
  };
  
  const disconnect = async () => {
    if (!isConnected.value || !port.value) return;
    
    try {
      if (reader.value) {
        await reader.value.cancel();
        reader.value = null;
      }
      
      if (writer.value) {
        await writer.value.close();
        writer.value = null;
      }
      
      if (port.value) {
        await port.value.close();
        port.value = null;
      }
      
      isConnected.value = false;
    } catch (error) {
      console.error("Error disconnecting from Flipper:", error);
    }
  };
  
  return {
    port,
    reader,
    writer,
    isConnected,
    isConnecting,
    isSyncing,
    connectionError,
    fileList,
    connect,
    disconnect
  };
});
