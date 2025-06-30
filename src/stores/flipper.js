import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFlipperStore = defineStore('flipper', () => {
  // State
  const port = ref(null);
  const reader = ref(null);
  const writer = ref(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const isSyncing = ref(false); // Track when files are being synced
  const connectionError = ref(null);
  const fileList = ref([]);
  const currentDirectory = ref('/ext/subghz'); // Track current directory
  const fileReadQueue = ref([]); // Queue for files to read
  const directoryQueue = ref([]); // Queue for directories to list
  const isProcessingQueue = ref(false); // Flag to track if we're processing the queue
  const isProcessingDirectories = ref(false); // Flag to track if we're processing directories
  
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
    console.log("Current directory:", currentDirectory.value);
    
    // Check if this is a directory entry [D]
    if (line.match(/^\s*\[D\]/)) {
      try {
        // Parse format: [D] directoryname
        const dirMatch = line.match(/^\s*\[D\]\s+(.+?)\s*$/);
        if (dirMatch && dirMatch[1]) {
          const dirName = dirMatch[1];
          // Skip if directory name contains a slash (shouldn't happen in normal listings)
          if (dirName.includes('/')) {
            console.log(`Skipping directory with slash in name: ${dirName}`);
            return;
          }
          
          // Construct the full directory path
          const dirPath = `${currentDirectory.value}/${dirName}`;
          console.log(`Found directory: ${dirPath}`);
          
          // Queue this directory for listing
          addDirectoryToQueue(dirPath);
        }
        return;
      } catch (error) {
        console.error("Error processing directory entry:", error);
      }
    }
    
    // Check if this is a file entry [F]
    if (line.match(/^\s*\[F\]/)) {
      try {
        // Parse format: [F] filename.sub 123b or [F] File With Spaces.sub 123b
        const fileMatch = line.match(/^\s*\[F\]\s+(.+?)\s+\d+b$/);
        if (fileMatch && fileMatch[1]) {
          const filename = fileMatch[1];
          
          // Skip if filename contains a slash (shouldn't happen in normal listings)
          if (filename.includes('/')) {
            console.log(`Skipping file with slash in name: ${filename}`);
            return;
          }
          
          // Construct the full file path
          const path = `${currentDirectory.value}/${filename}`;
          console.log(`Found file: ${path}`);
          
          // Determine file type based on path and extension
          let fileType = 'unknown';
          if (path.includes('/ext/subghz') || path.includes('subghz') || filename.endsWith('.sub')) {
            fileType = 'subghz';
          } else if (path.includes('/ext/lfrfid') || path.includes('lfrfid') || filename.endsWith('.rfid')) {
            fileType = 'rfid';
          } else if (path.includes('/ext/nfc') || path.includes('nfc') || filename.endsWith('.nfc')) {
            fileType = 'nfc';
          } else if (filename.endsWith('.ir')) {
            fileType = 'ir';
          }
          
          // Ignore files that start with a dot (.)
          if (filename.startsWith('.')) {
            console.log(`Ignoring hidden file: ${filename}`);
            return;
          }
          
          // Add to read queue
          addToReadQueue(path, filename, fileType);
        }
        return;
      } catch (error) {
        console.error("Error processing file entry:", error);
      }
    }
    
    // Check for JSON-like format
    const nameMatch = line.match(/name: "([^"]+)"/); 
    if (nameMatch && nameMatch[1]) {
      try {
        const filename = nameMatch[1];
        let path = '';
        
        const pathMatch = line.match(/path: "([^"]+)"/);  
        if (pathMatch && pathMatch[1]) {
          path = pathMatch[1];
        } else {
          path = `${currentDirectory.value}/${filename}`;
        }
        
        console.log(`Found file (JSON format): ${path}`);
        
        // Determine if this is a directory
        const isDir = line.includes('type: dir');
        if (isDir) {
          addDirectoryToQueue(path);
          return;
        }
        
        // Determine file type
        let fileType = 'unknown';
        if (path.includes('/ext/subghz') || path.includes('subghz') || filename.endsWith('.sub')) {
          fileType = 'subghz';
        } else if (path.includes('/ext/lfrfid') || path.includes('lfrfid') || filename.endsWith('.rfid')) {
          fileType = 'rfid';
        } else if (path.includes('/ext/nfc') || path.includes('nfc') || filename.endsWith('.nfc')) {
          fileType = 'nfc';
        } else if (filename.endsWith('.ir')) {
          fileType = 'ir';
        }
        
        // Ignore files that start with a dot (.)
        if (filename.startsWith('.')) {
          console.log(`Ignoring hidden file: ${filename}`);
          return;
        }
        
        // Add to read queue
        addToReadQueue(path, filename, fileType);
      } catch (error) {
        console.error("Error processing JSON entry:", error);
      }
    }
    
    // Check for coordinate lines
    if (line.toLowerCase().includes('latitude:') || line.toLowerCase().includes('longitude:')) {
      // This might be file content with coordinates
      console.log(`Potential coordinate line found: ${line}`);
      extractCoordinatesFromOutput(line);
    }
  };
  
  // Read file content from Flipper
  const readFileContent = async (path, filename, fileType) => {
    if (!writer.value || !isConnected.value) return;
    
    try {
      // Use the exact path provided - no path manipulation
      // This ensures we're reading from the exact location specified
      // The path should already be correctly constructed by the processFlipperOutput function
      
      console.log(`Reading file: ${filename}`);
      console.log(`Using path: ${path}`);
      
      // Reset current file
      currentFile.value = {
        name: filename,
        path: path,
        type: fileType,
        content: ''
      };
      
      // Quote path to handle spaces
      const quotedPath = `"${path}"`;
      
      // Send command to read file
      console.log(`Sending storage read command for: ${quotedPath}`);
      await writer.value.write(`storage read ${quotedPath}\r\n`);
      
      // Wait for file content to be processed
      console.log(`Waiting for file content to be processed for: ${filename}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased timeout for larger files
      
      // Log if coordinates were found
      if (currentFile.value.content.toLowerCase().includes('latitude:') || 
          currentFile.value.content.toLowerCase().includes('longitude:')) {
        console.log(`File ${filename} contains coordinate keywords`);
        console.log(`File content sample: ${currentFile.value.content.substring(0, 200)}...`);
      } else {
        console.log(`No coordinate keywords found in ${filename}`);
        if (!fileList.value.some(f => f.path === path)) {
          console.log(`No coordinates found for ${filename}, adding without coordinates`);
          addFileToList(filename, path, fileType, null, null);
        }
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
    if (!currentFile.value.name) {
      // If no current file is being processed, ignore this line
      console.log("Received coordinate data but no current file is being processed");
      return;
    }
    
    currentFile.value.content += line + '\n';
    
    // Check for Latitude and Longitude patterns in this specific line (case insensitive)
    // Match both decimal and integer formats
    let latitudeMatch = line.match(/Latitude:\s*(-?\d+\.?\d*)/i);
    let longitudeMatch = line.match(/Longitude:\s*(-?\d+\.?\d*)/i);
    
    // If not found in this line, check the entire accumulated content
    if (!latitudeMatch || !longitudeMatch) {
      const content = currentFile.value.content;
      latitudeMatch = latitudeMatch || content.match(/Latitude:\s*(-?\d+\.?\d*)/i);
      longitudeMatch = longitudeMatch || content.match(/Longitude:\s*(-?\d+\.?\d*)/i);
    }
    
    if (latitudeMatch && longitudeMatch) {
      const latitude = parseFloat(latitudeMatch[1]);
      const longitude = parseFloat(longitudeMatch[1]);
      
      // Add additional validation to ensure coordinates are valid numbers
      if (!isNaN(latitude) && !isNaN(longitude) && 
          latitude >= -90 && latitude <= 90 && 
          longitude >= -180 && longitude <= 180) {
        console.log(`Extracted valid coordinates for ${currentFile.value.path}: ${latitude}, ${longitude}`);
      } else {
        console.warn(`Invalid coordinates extracted for ${currentFile.value.path}: ${latitude}, ${longitude}`);
        // Continue processing in case we find valid coordinates later
        return;
      }
      
      console.log(`Adding file with coordinates for ${currentFile.value.path}: ${latitude}, ${longitude}`);
      
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
  
  // Directories to ignore when listing files
  const ignoredDirectories = [
    '/ext/subghz/assets',
    '/ext/subghz/samples',
    '/ext/subghz/.cache',
    '/ext/nfc/assets',
    '/ext/nfc/samples',
    '/ext/nfc/.cache',
    '/ext/lfrfid/assets',
    '/ext/lfrfid/samples',
    '/ext/lfrfid/.cache',
  ];
  
  // Add directory to queue for listing
  const addDirectoryToQueue = (dirPath) => {
    // Normalize the path - ensure no double slashes
    const normalizedPath = dirPath.replace(/\/\/+/g, '/');
    
    // Skip if already in queue or if it's not in one of the allowed base directories
    const allowedBaseDirs = ['/ext/subghz', '/ext/lfrfid', '/ext/nfc'];
    const isInAllowedDir = allowedBaseDirs.some(dir => normalizedPath.startsWith(dir));
    
    if (!isInAllowedDir) {
      console.log(`Skipping directory outside allowed paths: ${normalizedPath}`);
      return;
    }
    
    // Skip if directory is in the ignored list
    if (ignoredDirectories.some(dir => normalizedPath.startsWith(dir))) {
      console.log(`Skipping ignored directory: ${normalizedPath}`);
      return;
    }
    
    // Check if already in queue
    if (directoryQueue.value.includes(normalizedPath)) {
      console.log(`Directory already in queue: ${normalizedPath}`);
      return;
    }
    
    // Add to queue
    directoryQueue.value.push(normalizedPath);
    console.log(`Added directory to queue: ${normalizedPath} (${directoryQueue.value.length} in queue)`);
    
    // Start processing directory queue if not already processing
    if (!isProcessingDirectories.value && isConnected.value) {
      processDirectoryQueue();
    }
  };
  
  // Add file to read queue
  const addToReadQueue = (path, filename, fileType) => {
    // Normalize the path - ensure no double slashes
    const normalizedPath = path.replace(/\/\/+/g, '/');
    
    // Ensure we're using the correct file type based on extension and path
    let detectedFileType = fileType || 'unknown';
    if (normalizedPath.includes('/ext/subghz') || filename.endsWith('.sub')) {
      detectedFileType = 'subghz';
    } else if (normalizedPath.includes('/ext/lfrfid') || filename.endsWith('.rfid')) {
      detectedFileType = 'rfid';
    } else if (normalizedPath.includes('/ext/nfc') || filename.endsWith('.nfc')) {
      detectedFileType = 'nfc';
    } else if (filename.endsWith('.ir')) {
      detectedFileType = 'ir';
    }
    
    // Skip files that don't have a recognized type
    if (detectedFileType === 'unknown') {
      console.log(`Skipping file with unknown type: ${filename}`);
      return;
    }
    
    // Add to queue
    fileReadQueue.value.push({ path: normalizedPath, filename, fileType: detectedFileType });
    console.log(`Added to read queue: ${filename} (path: ${normalizedPath}, type: ${detectedFileType})`);
    
    // Start processing queue if not already processing
    if (!isProcessingQueue.value) {
      processFileQueue();
    }
  };
  
  // Process file read queue
  const processFileQueue = async () => {
    if (isProcessingQueue.value) return;
    
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
      
      // Only set syncing to false if both queues are empty
      if (fileReadQueue.value.length === 0 && directoryQueue.value.length === 0) {
        isSyncing.value = false;
      } else if (directoryQueue.value.length > 0 && !isProcessingDirectories.value) {
        // If we have directories to process and aren't already processing them
        processDirectoryQueue();
      }
    }
  };
  
  // Process directory queue
  const processDirectoryQueue = async () => {
    if (isProcessingDirectories.value || directoryQueue.value.length === 0) return;
    
    try {
      isProcessingDirectories.value = true;
      
      while (directoryQueue.value.length > 0) {
        // Get next directory from queue
        const dirPath = directoryQueue.value.shift();
        console.log(`Processing directory from queue: ${dirPath} (${directoryQueue.value.length} remaining)`);
        
        // Set current directory
        currentDirectory.value = dirPath;
        
        // Send command to list files
        const quotedPath = dirPath.includes(' ') ? `"${dirPath}"` : dirPath;
        console.log(`Listing directory contents: ${quotedPath}`);
        await writer.value.write(`storage list ${quotedPath}\r\n`);
        
        // Wait to ensure all files are listed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error("Error processing directory queue:", error);
    } finally {
      isProcessingDirectories.value = false;
    }
  };
  
  // List files from Flipper storage
  const listFiles = async () => {
    if (!writer.value || !isConnected.value) return;
    
    try {
      // Set syncing state to true
      isSyncing.value = true;
      
      // Clear existing file list and queue
      fileList.value = [];
      fileReadQueue.value = [];
      directoryQueue.value = [];
      
      // Define allowed root directories
      const allowedDirectories = [
        '/ext/subghz',
        '/ext/lfrfid',
        '/ext/nfc'
      ];
      
      // Start with root directories we're interested in
      console.log("Starting file listing with root directories:");
      for (const dir of allowedDirectories) {
        console.log(`Adding root directory to queue: ${dir}`);
        addDirectoryToQueue(dir);
      }
      
      // Process the directory queue first
      await processDirectoryQueue();
      
      console.log(`Total files found: ${fileList.value.length}`);
      console.log(`Files in read queue: ${fileReadQueue.value.length}`);
      
      // Process the file read queue
      if (fileReadQueue.value.length > 0) {
        processFileQueue();
      } else {
        // No files to read and no directories to process, set syncing to false
        isSyncing.value = false;
      }
    } catch (error) {
      console.error("Error listing files:", error);
      return [];
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
    connectFlipper,
    disconnectFlipper,
    listFiles
  };
});
