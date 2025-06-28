/**
 * File Service
 * Handles reading and parsing files from directories
 */

// Function to read files recursively from a directory
export const readFilesFromDirectory = async (directoryPath) => {
  try {
    // In a browser environment, we can't directly read directories
    // This would typically be handled by a backend API
    // For now, we'll simulate this by returning an empty array
    // The actual files will be loaded by processAllFiles
    return [];
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
};

// Function to read file content
export const readFileContent = async (filePath) => {
  try {
    // Make sure the path starts with a slash for proper URL resolution
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const response = await fetch(normalizedPath);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${filePath}`);
    }
    
    const content = await response.text();
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
};

// Function to extract coordinates from file content
export const extractCoordinates = (fileContent) => {
  const latitudeMatch = fileContent.match(/Latitude:\s*(-?\d+\.\d+)/);
  const longitudeMatch = fileContent.match(/Longitude:\s*(-?\d+\.\d+)/);
  
  if (!latitudeMatch || !longitudeMatch) {
    return null;
  }
  
  return {
    latitude: parseFloat(latitudeMatch[1]),
    longitude: parseFloat(longitudeMatch[1])
  };
};

// Function to determine file type from extension
export const getFileType = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'sub':
      return 'subghz';
    case 'rfid':
      return 'rfid';
    case 'nfc':
      return 'nfc';
    default:
      return 'unknown';
  }
};

// Function to process all files from directories
export const processAllFiles = async () => {
  // Define the base directories to scan
  const baseDirectories = [
    { path: '/files/subghz', type: 'subghz' },
    { path: '/files/nfc', type: 'nfc' },
    { path: '/files/lfrfid', type: 'rfid' }
  ];
  
  let allFiles = [];
  
  // Get the list of files from the manifest
  try {
    const response = await fetch('/files-manifest.json');
    let filesList = [];
    
    if (response.ok) {
      // If we have a manifest file, use it
      filesList = await response.json();
    } else {
      // Otherwise, use the files we know exist from the find command
      filesList = [
        '/files/lfrfid/Burkadze Door.rfid',
        '/files/lfrfid/Burkadze Lift.rfid',
        '/files/lfrfid/Fitpass.rfid',
        '/files/lfrfid/Kutaisi Gia.rfid',
        '/files/lfrfid/Natia Geo Hospitals.rfid',
        '/files/nfc/Jikia Citycom.nfc',
        '/files/nfc/Jikia Door.nfc',
        '/files/nfc/Lisi Door.nfc',
        '/files/nfc/Tsereteli Citycom.nfc',
        '/files/subghz/Lisi Gate.sub',
        '/files/subghz/Lisi Parking Lock.sub',
        '/files/subghz/Lisi Parking Open.sub',
        '/files/subghz/Tbilisi/Abastumani 1 Deserter.sub',
        '/files/subghz/Tbilisi/Bochorma 18 Orient Logic Gate.sub',
        '/files/subghz/Tbilisi/Bochorma 4 Foris.sub',
        '/files/subghz/Tbilisi/Bochorma Corner Kaczynski 1.sub',
        '/files/subghz/Tbilisi/DevAlliance Chain.sub',
        '/files/subghz/Tbilisi/DevAlliance Gate.sub',
        '/files/subghz/Tbilisi/Panjikidze 3a Ori Nabiji Front.sub',
        '/files/subghz/Tbilisi/Tsintsadze Fire Station.sub',
        '/files/subghz/Tbilisi/UNK Begheli.sub',
        '/files/subghz/Tbilisi/UNK Bochorma Ialbuzi Corner Multiple Repeated.sub',
        '/files/subghz/Tbilisi/UNK Chavchavadze 19 Subway.sub',
        '/files/subghz/Tbilisi/UNK Pekini 18.sub',
        '/files/subghz/Tbilisi/UNK Vazha 96 U2G Libre.sub',
        '/files/subghz/Tsereteli Gate.sub'
      ];
    }
    
    // Process each file
    for (const filePath of filesList) {
      // Skip .DS_Store files
      if (filePath.includes('.DS_Store')) continue;
      
      try {
        // Determine the file type based on the directory and extension
        const fileType = getFileTypeFromPath(filePath, baseDirectories);
        if (!fileType) continue; // Skip files that don't match our known types
        
        // Get the file name from the path
        const fileName = filePath.split('/').pop();
        
        // Get the directory path
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        
        // Create a file object
        const file = {
          path: filePath,
          name: fileName,
          type: fileType,
          directory: dirPath
        };
        
        // Read the file content
        const content = await readFileContent(filePath);
        
        if (content) {
          const coordinates = extractCoordinates(content);
          if (coordinates) {
            allFiles.push({
              ...file,
              ...coordinates,
              content
            });
          }
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
  } catch (error) {
    console.error('Error loading files manifest:', error);
  }
  
  return allFiles;
};

// Helper function to determine file type from path
const getFileTypeFromPath = (filePath, baseDirectories) => {
  for (const dir of baseDirectories) {
    if (filePath.startsWith(dir.path)) {
      return dir.type;
    }
  }
  
  // If no directory match, try to determine from extension
  const extension = filePath.split('.').pop().toLowerCase();
  switch (extension) {
    case 'sub': return 'subghz';
    case 'rfid': return 'rfid';
    case 'nfc': return 'nfc';
    default: return null;
  }
};
