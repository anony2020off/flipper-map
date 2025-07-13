<script setup>
import { ref, watch } from 'vue';
import { useFlipperStore } from '@/stores/flipper.js';
import { notify } from '@/helpers/notification.js';

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
    notify(`${flipper.fileList.length || 'No'} files discovered`, 'success');
  }
});

const handleSearch = () => {
  emit('search', searchInput.value);
};

const handleSelectPin = (pin) => {
  if (pin.distance) {
    emit('select-pin', pin);
  }
}

</script>

<template>
  <div class="sidebar border-end">
    <div class="sidebar-header">
      <div class="custom-primary-bg text-white p-3 d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <div class="d-flex align-items-center justify-content-center bg-white rounded-circle p-1" style="width: 36px; height: 36px;">
            <i class="fas fa-location-dot custom-primary-text fs-5"></i>
          </div>
          <h1 class="mb-0 h2 pixel-font">Flipper Map</h1>
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
          <input type="text" v-model="searchInput" @input="handleSearch" :placeholder="`Search${flipper.fileList.length ? ' ' + flipper.fileList.length + ' pins' : ''}...`" class="form-control ps-5">
        </div>
      </div>
    
    <div class="sidebar-content overflow-auto h-100">
      <div class="flex-grow-1 overflow-auto">
        <div v-if="pins.length === 0" class="d-flex flex-column align-items-center justify-content-center py-5">
          <div v-if="!flipper.isConnected">
            <p class="text-muted small">Connect Flipper to see files.</p>
            <div class="mt-5 text-center">
              <a href="#" class="small custom-primary-text text-decoration-none" data-bs-toggle="modal" data-bs-target="#helpModal"><i class="fas fa-question-circle"></i> Help</a>
            </div>
          </div>
          <p v-else-if="flipper.isSyncing" class="text-muted small">Syncing...</p>
          <p v-else class="text-muted small">No files found.</p>
        </div>
      
        <div v-else>
          <div class="list-group list-group-flush">
            <a href="#"
              v-for="pin in pins" 
              :key="pin.hash"
              class="list-group-item list-group-item-action px-3 py-3 overflow-hidden"
              :class="{'bg-body-secondary': selectedPin && selectedPin.hash === pin.hash, 'd-none': !pin.visible}"
              @click.prevent="handleSelectPin(pin)"
            >
              <div class="d-flex align-items-center">
                <div class="d-flex align-items-center justify-content-center rounded-circle shadow-sm flex-shrink-0" style="width: 46px; height: 46px" :style="{ backgroundColor: flipper.getFileColor(pin.type) }">
                  <i :class="['fas', `fa-${flipper.getFileIcon(pin.type)}`, 'text-white']"></i>
                </div>
                <div class="flex-grow-1 min-width-0 mx-3 overflow-hidden" :class="pin.distance ? '' : 'opacity-75'">
                  <span class="d-block fw-medium small text-truncate">{{ pin.name }}</span>
                  <div class="text-muted small d-flex align-items-center text-truncate">
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
                  <i v-if="pin.distance" class="fas fa-chevron-right text-muted"></i>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div class="modal fade" id="helpModal" tabindex="-1" aria-labelledby="helpModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="helpModalLabel"> How to use Flipper Map</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body px-4">
              <div class="mb-4">
                <h6 class="fw-wedium"><i class="fas fa-plug me-2"></i>Connecting Your Flipper</h6>
                <ol>
                  <li>Connect your Flipper Zero to the computer using USB cable.</li>
                  <li>Click the <span class="fw-medium">Connect</span> button in the sidebar and select your Flipper Zero device from the browser dialog.</li>
                  <li>Wait for the app to sync files from your device.</li>
                </ol>
                <p>
                  <span class="fw-medium">Pins</span> on the map represent your Flipper files with location data. Click a pin to view detailed information about the file.
                  Flipper Map currently supports <i class="fas fa-wave-square" style="color: #1aa179"></i> Sub-GHz, <i class="fas fa-wifi" style="color: #3d8bfd"></i> NFC and <i class="fas fa-id-card-clip" style="color: #ffc107"></i> RFID files.
                </p>
              </div>
              
              <div class="mb-4">
                <div class="alert alert-warning">
                  <i class="fas fa-exclamation-triangle me-1"></i>
                  <span class="fw-medium">Important!</span>
                  Files must include <code>Latitude:</code> and <code>Longitude:</code> lines to appear on the map.
                </div>
                <ul>
                  <li>You can add location data by editing files on your SD card or using the Flipper mobile app.</li>
                  <li>Files without location data will still appear in the sidebar but won't be shown on the map.</li>
                </ul>
                <div class="mt-3">
                  <p class="mb-1"><span class="fw-medium">Example File:</span></p>
                  <pre class="border rounded bg-body-secondary py-2 px-3 small">
Filetype: Flipper SubGhz Key File
Version: 1
Frequency: 433920000
Preset: FuriHalSubGhzPresetOok270Async
<strong class="text-success">Latitude: 41.123456789</strong>
<strong class="text-success">Longitude: 44.987654321</strong>
Protocol: Dickert_MAHS
Bit: 36
Key: 00 00 00 0C 12 AB CD EF</pre>
                </div>
              </div>
              
              <div class="mb-4">
                <h6 class="fw-bold"><i class="fas fa-square-arrow-up-right me-2"></i>Opening Files on Flipper</h6>
                <ol>
                  <li>Click on a pin to open its popup.</li>
                  <li>Click the <span class="fw-medium">Open on Flipper</span> button to launch the file on your connected device.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
