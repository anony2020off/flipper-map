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
  const currentDirectory = ref('/ext/subghz'); // Track current directory
  
  // Current file being processed
  const currentFile = ref({
    name: '',
    path: '',
    content: ''
  });
  
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
    if (line.includes('type: file') || line.match(/^\s*\[F\]/) || line.match(/^\s*\[D\]/)) {
      try {
        // Skip directory entries
        if (line.match(/^\s*\[D\]/)) {
          console.log("Skipping directory entry:", line);
          return;
        }
        
        let filename = '';
        let path = '';
        let currentDir = '';
        
        // Try to extract filename from JSON-like format
        const nameMatch = line.match(/name: "([^"]+)"/); 
        if (nameMatch && nameMatch[1]) {
          filename = nameMatch[1];
          const pathMatch = line.match(/path: "([^"]+)"/);  
          if (pathMatch && pathMatch[1]) {
            path = pathMatch[1];
          }
        } else {
          // Parse format: [F] filename.sub 123b
          const fileMatch = line.match(/^\s*\[F\]\s+([^\s]+)\s+\d+b$/);
          if (fileMatch && fileMatch[1]) {
            filename = fileMatch[1];
            
            // Use the tracked current directory
            // Construct the path
            path = `${currentDirectory.value}/${filename}`;
          }
        }
        
        // Ignore files that start with a dot (.)
        if (filename && filename.startsWith('.')) {
          console.log(`Ignoring hidden file: ${filename}`);
          return;
        }
        
        // Determine file type based on path and extension
        let fileType = 'unknown';
        if (path.includes('/ext/subghz') || path.includes('subghz')) {
          fileType = 'subghz';
        } else if (path.includes('/ext/lfrfid') || path.includes('lfrfid')) {
          fileType = 'rfid';
        } else if (path.includes('/ext/nfc') || path.includes('nfc')) {
          fileType = 'nfc';
        }
        
        // Check file extension
        if (filename.endsWith('.sub')) {
          fileType = 'subghz';
        } else if (filename.endsWith('.rfid')) {
          fileType = 'rfid';
        } else if (filename.endsWith('.nfc')) {
          fileType = 'nfc';
        }
        
        // Only process files with supported extensions
        if (filename.endsWith('.sub') || filename.endsWith('.rfid') || filename.endsWith('.nfc')) {
          // Read the file content to extract coordinates
          readFileContent(path, filename, fileType);
        }
      } catch (error) {
        console.error("Error parsing Flipper file entry:", error);
      }
    } else if (line.includes('Latitude:') || line.includes('Longitude:')) {
      // This might be file content with coordinates
      extractCoordinatesFromOutput(line);
    }
  };
  
  // Read file content from Flipper
  const readFileContent = async (path, filename, fileType) => {
    if (!writer.value || !isConnected.value) return;
    
    try {
      // Store current file info
      currentFile.value = {
        name: filename,
        path: path,
        content: '',
        type: fileType
      };
      
      // Make sure path starts with /ext/ for consistency
      let adjustedPath = path;
      if (!adjustedPath.startsWith('/ext/')) {
        adjustedPath = `/ext/${adjustedPath.replace(/^\//, '')}`;
      }
      console.log(`Reading file content for ${adjustedPath}`);
      
      // Send command to read file
      await writer.value.write(`storage read ${adjustedPath}\r\n`);
      
      // Wait for file content to be processed
      // The content will be processed in the readFromFlipper loop
      // and coordinates extracted in extractCoordinatesFromOutput
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error reading file ${path}:`, error);
      
      // Still add the file without coordinates
      addFileToList(filename, path, fileType, null, null);
    }
  };
  
  // Extract coordinates from file output
  const extractCoordinatesFromOutput = (line) => {
    // Append to current file content
    currentFile.value.content += line + '\n';
    
    // Check if we have both latitude and longitude
    const content = currentFile.value.content;
    const latitudeMatch = content.match(/Latitude:\s*(-?\d+\.\d+)/);
    const longitudeMatch = content.match(/Longitude:\s*(-?\d+\.\d+)/);
    
    if (latitudeMatch && longitudeMatch) {
      const latitude = parseFloat(latitudeMatch[1]);
      const longitude = parseFloat(longitudeMatch[1]);
      
      // Add file to list with coordinates
      addFileToList(
        currentFile.value.name,
        currentFile.value.path,
        currentFile.value.type,
        latitude,
        longitude
      );
      
      // Reset current file
      currentFile.value = {
        name: '',
        path: '',
        content: '',
        type: ''
      };
    }
  };
  
  // Add file to list if not already there
  const addFileToList = (filename, path, fileType, latitude, longitude) => {
    // If file already exists in the list, update it
    const existingIndex = fileList.value.findIndex(file => file.path === path);
    
    if (existingIndex >= 0) {
      // Update existing file
      if (latitude !== null && longitude !== null) {
        fileList.value[existingIndex].latitude = latitude;
        fileList.value[existingIndex].longitude = longitude;
      }
    } else {
      // Add new file
      fileList.value.push({
        name: filename,
        path: path,
        type: fileType || 'subghz', // Default to subghz if type not specified
        source: 'flipper',
        // Use consistent coordinate naming (latitude/longitude) as used in file service
        latitude: latitude,
        longitude: longitude
      });
    }
  };
  
  // List files from Flipper storage
  const listFiles = async () => {
    if (!writer.value || !isConnected.value) return;
    
    try {
      // Clear existing file list
      fileList.value = [];
      
      // List files from /ext/subghz directory
      console.log("Listing files from '/ext/subghz'");
      currentDirectory.value = '/ext/subghz';
      await writer.value.write("storage list /ext/subghz\r\n");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // List files from /ext/lfrfid directory
      console.log("Listing files from '/ext/lfrfid'");
      currentDirectory.value = '/ext/lfrfid';
      await writer.value.write("storage list /ext/lfrfid\r\n");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // List files from /ext/nfc directory
      console.log("Listing files from '/ext/nfc'");
      currentDirectory.value = '/ext/nfc';
      await writer.value.write("storage list /ext/nfc\r\n");
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
