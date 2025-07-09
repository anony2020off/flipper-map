<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>SubGHz Map</h3>
    </div>
    <div class="sidebar-content">
      <p>This is the sidebar content</p>
      <a href="#" @click="handleFlipperConnection">
        {{ flipper.isConnected ? 'Disconnect' : 'Connect' }}
      </a>
      <span v-if="flipper.isConnecting">Connecting...</span>
      <span v-if="flipper.connectionError">{{ flipper.connectionError }}</span>
      <span v-if="flipper.isSyncing">Syncing...</span>
      <span v-if="flipper.fileList.length">Scanned {{ flipper.fileList.length }} files</span>
    </div>
  </div>
</template>

<script setup>
import {useFlipperStore} from "@/stores/flipper.js";

const flipper = useFlipperStore();

const handleFlipperConnection = async () => {
  if (flipper.isConnected) {
    await flipper.disconnect();
  } else {
    await flipper.connect();
  }
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  width: 100%;
  background-color: #f8f9fa;
  padding: 15px;
  border-right: 1px solid #dee2e6;
}

.sidebar-header {
  padding-bottom: 15px;
  border-bottom: 1px solid #dee2e6;
  margin-bottom: 15px;
}
</style>
