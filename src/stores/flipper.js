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
    port.value = await navigator.serial.requestPort();
    
    await port.value.open({ baudRate: 230400 });
    
    isConnected.value = true;
  };
  
  const disconnect = async () => {
    
  };
  
  return {
    isConnected,
    connect,
    disconnect
  };
});
