<template>
  <div class="sidebar">
    <div class="sidebar-header">
      
      <div class="custom-primary-bg text-orange-500 text-white p-3 d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <div class="d-flex align-items-center justify-content-center bg-white rounded p-2" style="width: 40px; height: 40px;">
            <i class="fas fa-map-marker-alt custom-primary-text fs-5"></i>
          </div>
          <h1 class="fs-5 fw-bold mb-0">Flipper Map</h1>
        </div>
        <button 
        @click="handleFlipperConnection" 
        :disabled="flipper.isConnecting"
        :class="['btn btn-sm d-flex align-items-center gap-1', 
        flipper.isConnected ? 'btn-light' : 'btn-light']">
        <i :class="['fas', 
        flipper.isSyncing ? 'fa-sync fa-spin' : (flipper.isConnected ? 'fa-check' : (flipper.isConnecting ? 'fa-spinner fa-spin' : 'fa-plug'))]"></i>
        <span>
          {{ flipper.isSyncing ? 'Syncing' : 
          (flipper.isConnected ? 'Connected' : 
          (flipper.isConnecting ? 'Connecting...' : 'Connect')) }}
        </span>
      </button>
    </div>
    
  </div>
  <div class="sidebar-content overflow-auto">
    <div class="p-3 border-bottom">
      <div class="position-relative">
        <span class="position-absolute top-50 start-0 translate-middle-y ms-3">
          <i class="fas fa-search text-muted"></i>
        </span>
        <input 
        type="text" 
        v-model="searchInput" 
        @input="handleSearch"
        placeholder="Search pins..." 
        class="form-control ps-5"
        />
      </div>
    </div>
    <p v-if="flipper.isConnecting">Connecting...</p>
    <p v-if="flipper.connectionError">{{ flipper.connectionError }}</p>
    <p v-if="flipper.isSyncing">Syncing...</p>
    <p v-if="flipper.isProcessingFiles">Processing files...</p>
    <p v-if="flipper.isProcessingDirectories">Processing directories...</p>
    <p v-if="flipper.fileList.length">Scanned {{ flipper.fileList.length }} files</p>
    <ul class="list-group">
      <li v-for="file in flipper.fileList" :key="file.path" class="list-group-item" :data-hash="file.hash">
        {{ file.path }}
      </li>
    </ul>
  </div>
</div>
</template>

<script setup>
import {useFlipperStore} from "@/stores/flipper.js";

const flipper = useFlipperStore();

const handleFlipperConnection = async () => {
  if (flipper.isConnected) {
    flipper.disconnect();
  } else {
    flipper.connect();
  }
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  width: 100%;
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
}
</style>
