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
  const fileReadQueue = ref([]); // Queue for files to read
  const isProcessingQueue = ref(false); // Flag to track if we're processing the queue
  
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
          // Add to file queue for processing
          addToReadQueue(path, filename, fileType);
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
      // Reset current file
      currentFile.value = {
        name: filename,
        path: path,
        type: fileType,
        content: ''
      };
      
      // Adjust path for storage read command
      let adjustedPath = path;
      if (!adjustedPath.startsWith('/')) {
        adjustedPath = `/${adjustedPath}`;
      }
      console.log(`Reading file content for ${adjustedPath}`);
      
      // Send command to read file
      await writer.value.write(`storage read ${adjustedPath}\r\n`);
      
      // Wait for file content to be processed
      // The content will be processed in the readFromFlipper loop
      // and coordinates extracted in extractCoordinatesFromOutput
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // If we didn't find coordinates, still add the file
      if (!fileList.value.some(f => f.path === path)) {
        console.log(`No coordinates found for ${filename}, adding without coordinates`);
        addFileToList(filename, path, fileType, null, null);
      }
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
  const addFileToList = (name, path, fileType, latitude, longitude) => {
    // Check if file already exists in list
    const existingIndex = fileList.value.findIndex(f => f.path === path);
    
    // Create file object
    const file = {
      name,
      path,
      type: fileType || 'subghz', // Default to subghz if type not specified
      source: 'flipper'
    };
    
    // Add coordinates if available - always use latitude/longitude naming (not lat/lng)
    if (latitude !== null && longitude !== null) {
      file.latitude = latitude;
      file.longitude = longitude;
      
      // Log successful coordinate extraction
      console.log(`Found coordinates for ${name}: ${latitude}, ${longitude}`);
    } else {
      console.log(`No coordinates found for ${name}`);
    }
    
    // Add or update file in list
    if (existingIndex !== -1) {
      fileList.value[existingIndex] = file;
    } else {
      fileList.value.push(file);
    }
  };
  
  // Add file to read queue
  const addToReadQueue = (path, filename, fileType) => {
    // Add to queue
    fileReadQueue.value.push({ path, filename, fileType });
    console.log(`Added to read queue: ${filename} (${fileReadQueue.value.length} files in queue)`);
    
    // Start processing queue if not already processing
    if (!isProcessingQueue.value) {
      processFileQueue();
    }
  };
  
  // Process file read queue
  const processFileQueue = async () => {
    if (isProcessingQueue.value || fileReadQueue.value.length === 0) return;
    
    try {
      isProcessingQueue.value = true;
      
      while (fileReadQueue.value.length > 0) {
        // Get next file from queue
        const { path, filename, fileType } = fileReadQueue.value.shift();
        console.log(`Processing file from queue: ${filename} (${fileReadQueue.value.length} remaining)`);
        
        // Read file content
        await readFileContent(path, filename, fileType);
        
        // Wait between file reads to avoid overwhelming the device
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Error processing file queue:", error);
    } finally {
      isProcessingQueue.value = false;
    }
  };
  
  // List files from Flipper storage
  const listFiles = async () => {
    if (!writer.value || !isConnected.value) return;
    
    try {
      // Clear existing file list and queue
      fileList.value = [];
      fileReadQueue.value = [];
      
      // Process directories sequentially with proper waiting
      const directories = [
        '/ext/subghz',
        '/ext/lfrfid',
        '/ext/nfc'
      ];
      
      // Process each directory
      for (const dir of directories) {
        console.log(`Listing files from '${dir}'`);
        currentDirectory.value = dir;
        
        // Send command to list files
        await writer.value.write(`storage list ${dir}\r\n`);
        
        // Wait longer to ensure all files are listed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the files we've found so far
        const filesFound = fileList.value.filter(file => file.path.includes(dir));
        console.log(`Found ${filesFound.length} files in ${dir}`);
      }
      
      console.log(`Total files found: ${fileList.value.length}`);
      console.log(`Files in read queue: ${fileReadQueue.value.length}`);
      
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
