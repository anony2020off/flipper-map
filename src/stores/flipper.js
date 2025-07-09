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
  const isProcessingFiles = ref(false);
  const isProcessingDirectories = ref(false);
  const currentFile = ref({
    name: '',
    path: '',
    type: '',
    content: '',
    latitude: 0,
    longitude: 0,
    key: '',
  });

  const directories = [
    '/ext/subghz',
    '/ext/nfc',
    '/ext/lfrfid',
  ];
  
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

      readLoop(); // Start infinite reading loop
      await syncFiles();

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
  };

  const syncFiles = async () => {
    if (!reader.value) return;
    
    try {
      isSyncing.value = true;
      isProcessingFiles.value = false;
      isProcessingDirectories.value = true;
      
      fileList.value = [];
      fileReadQueue.value = [];

      for (const directory of directories) {
        console.log(`Processing ${directory}`);
        await writer.value.write(`storage tree "${directory.replace(/\/\/+/g, '/')}"\r\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      isProcessingDirectories.value = false;
      isProcessingFiles.value = true;

      while (fileReadQueue.value.length) {
        const file = fileReadQueue.value.shift();
        console.log(`Processing ${file}`);
        currentFile.value = {
          name: file.split('/').pop(),
          path: file,
          type: {sub: 'subghz', nfc: 'nfc', rfid: 'rfid'}[file.split('.').pop()],
          content: '',
          latitude: 0,
          longitude: 0,
          key: '',
        };
        await writer.value.write(`storage read "${file.replace(/\/\/+/g, '/')}"\r\n`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        fileList.value.push(currentFile.value);
      }

    } catch (error) {
      console.error("Error syncing files:", error);
    } finally {
      isSyncing.value = false;
      isProcessingFiles.value = false;
      isProcessingDirectories.value = false;
    }
  };

  const processLine = (line) => {
    if (isSyncing.value && isProcessingDirectories.value && !isProcessingFiles.value) {
      const matches = line.match(/\s+\[F\]\s+(\/ext\/(subghz|nfc|lfrfid)\/[A-Za-z\d\s_\-\./\(\)]+\.(sub|nfc|rfid))\s\d+b/)

      if (matches && matches[1]) {
        console.log(matches[1])
        const filePath = matches[1];
        if (filePath && !filePath.contains('/.') && !filePath.contains('/assets/')) {
          console.log(`Found file: ${filePath}`);
          fileReadQueue.value.push(filePath);
        }
      } else {
        console.log('Skipping line: ' + line)
      }
    }

    if (isSyncing.value && !isProcessingDirectories.value && isProcessingFiles.value) {
      currentFile.value.content += line + '\n';

      if (line.toLowerCase().startsWith('latitude:')) {
        currentFile.value.latitude = parseFloat(line.split(':').pop());
      }

      if (line.toLowerCase().startsWith('longitude:')) {
        currentFile.value.longitude = parseFloat(line.split(':').pop());
      }

      if (line.toLowerCase().startsWith('key:')) {
        currentFile.value.key = line.split(':').pop().trim();
      }

      if (line.toLowerCase().startsWith('raw:')) {
        currentFile.value.key = 'RAW';
      }
    }
  }

  const readLoop = async () => {
    if (!reader.value) return;
    
    try {
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.value.read();
        if (done) {
          break; // Reader has been canceled
        }
        
        buffer += value; // Append to buffer and process
        const lines = buffer.split('\n'); // Process complete lines
        buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
        
        for (const line of lines) {
          processLine(line.trim());
        }
      }
    } catch (error) {
      console.error("Error reading from Flipper:", error);
      if (isConnected.value) {
        // Try to reconnect or handle the error
        connectionError.value = "Connection lost: " + (error.message || "Unknown error");
        isConnected.value = false;
      }
    }
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
    isProcessingFiles,
    isProcessingDirectories,
    connect,
    disconnect,
    syncFiles
  };
});
