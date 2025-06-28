import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useLocationStore } from './location';
import { processAllFiles, getFileType } from '../services/fileService';

export const useFileStore = defineStore('files', () => {
  const files = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const locationStore = useLocationStore();

  // File type constants
  const FILE_TYPES = {
    SUBGHZ: 'subghz',
    RFID: 'rfid',
    NFC: 'nfc'
  };

  // Icons for different file types
  const FILE_ICONS = {
    [FILE_TYPES.SUBGHZ]: 'signal',
    [FILE_TYPES.RFID]: 'id-card',
    [FILE_TYPES.NFC]: 'wifi'
  };

  // Colors for different file types
  const FILE_COLORS = {
    [FILE_TYPES.SUBGHZ]: '#ff5722',
    [FILE_TYPES.RFID]: '#2196f3',
    [FILE_TYPES.NFC]: '#4caf50'
  };

  // Load files from service
  const loadFiles = async () => {
    isLoading.value = true;
    try {
      const loadedFiles = await processAllFiles();
      files.value = loadedFiles;
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      isLoading.value = false;
    }
  };

  // Parse files from directories
  const parseFiles = (fileContent, filePath) => {
    const fileName = filePath.split('/').pop();
    const fileExtension = fileName.split('.').pop().toLowerCase();
    let fileType;
    
    switch (fileExtension) {
      case 'sub':
        fileType = FILE_TYPES.SUBGHZ;
        break;
      case 'rfid':
        fileType = FILE_TYPES.RFID;
        break;
      case 'nfc':
        fileType = FILE_TYPES.NFC;
        break;
      default:
        fileType = 'unknown';
    }
    
    // Extract latitude and longitude from file content
    const latitudeMatch = fileContent.match(/Latitude:\s*(-?\d+\.\d+)/);
    const longitudeMatch = fileContent.match(/Longitude:\s*(-?\d+\.\d+)/);
    
    const latitude = latitudeMatch ? parseFloat(latitudeMatch[1]) : null;
    const longitude = longitudeMatch ? parseFloat(longitudeMatch[1]) : null;
    
    return {
      name: fileName,
      path: filePath,
      type: fileType,
      latitude,
      longitude,
      content: fileContent
    };
  };

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    return FILE_ICONS[fileType] || 'file';
  };

  // Get file color based on type
  const getFileColor = (fileType) => {
    return FILE_COLORS[fileType] || '#999999';
  };

  // Computed property to get files sorted by distance from user
  const sortedByDistance = computed(() => {
    if (!locationStore.userLocation) return [...files.value];
    
    const userLat = locationStore.userLocation.lat;
    const userLng = locationStore.userLocation.lng;
    
    return [...files.value]
      .filter(file => file.latitude && file.longitude)
      .map(file => ({
        ...file,
        distance: locationStore.calculateDistance(
          userLat, 
          userLng, 
          file.latitude, 
          file.longitude
        )
      }))
      .sort((a, b) => a.distance - b.distance);
  });

  return {
    files,
    isLoading,
    loadFiles,
    getFileIcon,
    getFileColor,
    sortedByDistance
  };
});
