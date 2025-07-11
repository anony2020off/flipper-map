<template>
  <div class="sidebar border-end">
    <div class="sidebar-header">
      <div class="custom-primary-bg text-white p-3 d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <div class="d-flex align-items-center justify-content-center bg-white rounded-circle p-1" style="width: 36px; height: 36px;">
            <i class="fas fa-location-dot custom-primary-text fs-5"></i>
          </div>
          <h1 class="fs-5 mb-0 app-title">Flipper Map</h1>
        </div>
        <button @click="handleFlipperConnection" :disabled="flipper.isConnecting" :class="['btn btn-sm d-flex align-items-center gap-1', flipper.isConnected ? 'btn-light' : 'btn-light']">
          <i :class="['fas', flipper.isSyncing ? 'fa-sync fa-spin' : (flipper.isConnected ? 'fa-check' : (flipper.isConnecting ? 'fa-spinner fa-spin' : 'fa-plug'))]"></i>
          <span>{{ flipper.isSyncing ? 'Syncing' : (flipper.isConnected ? 'Connected' : (flipper.isConnecting ? 'Connecting' : 'Connect')) }}</span>
        </button>
      </div>
    </div>

    <div class="sidebar-search p-3 border-bottom">
        <div class="position-relative">
          <span class="position-absolute top-50 start-0 translate-middle-y ms-3">
            <i class="fas fa-search text-muted"></i>
          </span>
          <input type="text" v-model="searchInput" @input="handleSearch" placeholder="Search pins..." class="form-control ps-5">
        </div>
      </div>
    
    <div class="sidebar-content overflow-auto h-100">
      <div class="flex-grow-1 overflow-auto">
        <div v-if="pins.length === 0" class="d-flex flex-column align-items-center justify-content-center py-5">
          <p v-if="!flipper.isConnected" class="text-muted small">Connect to Flipper to see pins</p>
          <p v-else-if="flipper.isSyncing" class="text-muted small">Syncing...</p>
          <p v-else class="text-muted small">No pins found</p>
        </div>
      
        <div v-else>
          <div class="list-group list-group-flush">
            <a href="#"
              v-for="pin in pins" 
              :key="pin.hash"
              class="list-group-item list-group-item-action px-3 py-3 overflow-hidden"
              :class="{'bg-body-secondary': selectedPin && selectedPin.hash === pin.hash, 'd-none': !pin.visible}"
              @click.prevent="selectPin(pin)"
            >
              <div class="d-flex align-items-center">
                <div class="d-flex align-items-center justify-content-center rounded-circle shadow-sm flex-shrink-0" style="width: 46px; height: 46px" :style="{ backgroundColor: flipper.getFileColor(pin.type) }">
                  <i :class="['fas', `fa-${flipper.getFileIcon(pin.type)}`, 'text-white']"></i>
                </div>
                <div class="flex-grow-1 min-width-0 mx-3 overflow-hidden" :class="pin.distance ? '' : 'opacity-75'">
                  <p class="mb-0 fw-medium small text-truncate">{{ pin.name }}</p>
                  <div class="mb-0 text-muted small d-flex align-items-center text-truncate">
                    <div v-if="pin.distance">
                      <i class="fas fa-location-dot me-1 small flex-shrink-0"></i>
                      <span class="text-truncate">{{ pin.distance < 1 ? `${(pin.distance * 1000).toFixed(0)}m` : (pin.distance < 10 ? `${pin.distance.toFixed(1)}km` : `${pin.distance.toFixed(0)}km`) }} away</span>
                    </div>
                    <div v-else>
                      <i class="fas fa-location-pin-lock me-1 small flex-shrink-0"></i>
                      <span class="text-truncate">No location</span>
                    </div>
                  </div>
                </div>
                <div class="flex-shrink-0">
                  <i class="fas fa-chevron-right text-muted"></i>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useFlipperStore } from "@/stores/flipper.js";
import { ref, watch } from "vue";
import Toastify from 'toastify-js';

const props = defineProps({
  pins: {
    type: Array,
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  },
  selectedPin: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['search', 'select-pin']);

const flipper = useFlipperStore();
const searchInput = ref(props.searchQuery);

const handleFlipperConnection = async () => {
  if (flipper.isConnected) {
    flipper.disconnect();
  } else {
    flipper.connect();
  }
}

watch(() => flipper.isSyncing, () => {
  if (!flipper.isSyncing) {
    Toastify({
      text: `Discovered ${flipper.fileList.length} files`,
      duration: 5000,
      gravity: "bottom",
      position: "center",
    }).showToast();
  }
});

const handleSearch = () => {
  emit('search', searchInput.value);
};

</script>

<style scoped>
.app-title {
  font-family: 'Jersey 10', sans-serif;
  font-size: 2rem !important;
}

.sidebar {
  height: 100%;
  width: 100%;
}

.custom-primary-bg {
  background-color: #ff8200;
}

.custom-primary-bg-light {
  background-color: rgba(255, 130, 0, 0.1);
}

.custom-primary-text {
  color: #ff8200;
}

.custom-primary-border {
  border-color: rgba(255, 130, 0, 0.25);
}

.custom-primary-btn {
  color: #fff;
  background-color: #ff8200;
  border-color: #ff8200;
}

.custom-primary-btn:hover {
  color: #fff;
  background-color: #e67600;
  border-color: #d96e00;
}

.custom-primary-btn:focus {
  box-shadow: 0 0 0 0.25rem rgba(255, 130, 0, 0.5);
}
</style>
