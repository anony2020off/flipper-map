import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFlipperStore = defineStore('flipper', () => {
  // State
  const port = ref(null);
  const reader = ref(null);
  const writer = ref(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const connectionError = ref(null);
  const fileList = ref([]);
  
  // Actions
  const connectFlipper = async () => {
    if (!navigator.serial) {
      connectionError.value = "Web Serial API is not supported in your browser";
      return false;
    }
    
    try {
      isConnecting.value = true;
      connectionError.value = null;
      
      // Request a port and open it
      port.value = await navigator.serial.requestPort();
      await port.value.open({ baudRate: 230400 });
      
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
      
      // Start reading loop
      readFromFlipper();
      
      // List files
      await listFiles();
      
      return true;
    } catch (error) {
      console.error("Error connecting to Flipper:", error);
      connectionError.value = error.message || "Failed to connect to Flipper";
      isConnecting.value = false;
      
      // Close port if it was opened
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
    }
  };
  
  const disconnectFlipper = async () => {
    if (!isConnected.value || !port.value) return;
    
    try {
      // Release reader and writer
      if (reader.value) {
        await reader.value.cancel();
        reader.value = null;
      }
      
      if (writer.value) {
        await writer.value.close();
        writer.value = null;
      }
      
      // Close the port
      if (port.value) {
        await port.value.close();
        port.value = null;
      }
      
      isConnected.value = false;
    } catch (error) {
      console.error("Error disconnecting from Flipper:", error);
    }
  };
  
  // Read continuously from Flipper
  const readFromFlipper = async () => {
    if (!reader.value) return;
    
    try {
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.value.read();
        if (done) {
          // Reader has been canceled
          break;
        }
        
        // Append to buffer and process
        buffer += value;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
        
        // Process complete lines
        for (const line of lines) {
          processFlipperOutput(line.trim());
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
  
  // Process output from Flipper
  const processFlipperOutput = (line) => {
    console.log("Flipper output:", line);
    
    // Check for file listing entries in different formats
    if (line.includes('type: file') || line.match(/^\s*[F]\s+[\d]+\s+[\w\d\-\.]+$/)) {
      try {
        let filename = '';
        let path = '';
        
        // Try to extract filename from JSON-like format
        const nameMatch = line.match(/name: "([^"]+)"/); 
        if (nameMatch && nameMatch[1]) {
          filename = nameMatch[1];
          const pathMatch = line.match(/path: "([^"]+)"/);  
          if (pathMatch && pathMatch[1]) {
            path = pathMatch[1];
          }
        } else {
          // Try alternative format: F 1234 filename.sub
          const altMatch = line.match(/^\s*[F]\s+[\d]+\s+([\w\d\-\.]+)$/);
          if (altMatch && altMatch[1]) {
            filename = altMatch[1];
            // For this format, construct the path
            path = `subghz/${filename}`;
          }
        }
        
        // Only add .sub files to our list
        if (filename && filename.endsWith('.sub')) {
          // Extract coordinates from filename if possible
          // Format could be something like: signal_lat_42.123_lng_-71.456.sub
          let latitude = null;
          let longitude = null;
          
          // Try to extract from filename
          const coordsMatch = filename.match(/lat_([\d.-]+)_lng_([\d.-]+)/i);
          if (coordsMatch) {
            latitude = parseFloat(coordsMatch[1]);
            longitude = parseFloat(coordsMatch[2]);
          }
          
          // Add to file list if not already there
          if (!fileList.value.some(file => file.path === path)) {
            fileList.value.push({
              name: filename,
              path: path,
              type: 'subghz',
              source: 'flipper',
              // Use consistent coordinate naming (latitude/longitude) as used in file service
              latitude: latitude,
              longitude: longitude
            });
          }
        }
      } catch (error) {
        console.error("Error parsing Flipper file entry:", error);
      }
    }
  };
  
  // List files from Flipper storage
  const listFiles = async () => {
    if (!writer.value || !isConnected.value) return;
    
    try {
      // Clear existing file list
      fileList.value = [];
      
      // Try different path formats
      console.log("Trying to list files with 'storage list subghz'");
      await writer.value.write("storage list subghz\r\n");
      
      // Wait a bit and check if we got any files
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If no files found, try with /ext prefix
      if (fileList.value.length === 0) {
        console.log("No files found, trying 'storage list /ext/subghz'");
        await writer.value.write("storage list /ext/subghz\r\n");
      }
      
      // Wait for response to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return fileList.value;
    } catch (error) {
      console.error("Error listing files:", error);
      return [];
    }
  };
  
  return {
    isConnected,
    isConnecting,
    connectionError,
    fileList,
    connectFlipper,
    disconnectFlipper,
    listFiles
  };
});
