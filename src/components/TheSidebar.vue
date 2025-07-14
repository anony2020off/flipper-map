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
      <div class="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <div class="d-flex align-items-center justify-content-center bg-white rounded-circle p-1 size-36">
            <i class="fas fa-location-dot text-primary fs-5" />
          </div>
          <h1 class="mb-0 h2 pixel-font">
            Flipper Map
          </h1>
        </div>
        <button
          :disabled="flipper.isConnecting"
          :class="['btn btn-sm d-flex align-items-center gap-1', flipper.isConnected ? 'btn-light' : 'btn-light']"
          @click="handleFlipperConnection"
        >
          <i :class="['fas', flipper.isSyncing ? 'fa-sync fa-spin' : (flipper.isConnected ? 'fa-check' : (flipper.isConnecting ? 'fa-spinner fa-spin' : 'fa-plug'))]" />
          <span>{{ flipper.isSyncing ? 'Syncing' : (flipper.isConnected ? 'Connected' : (flipper.isConnecting ? 'Connecting' : 'Connect')) }}</span>
        </button>
      </div>
    </div>

    <div class="sidebar-search p-3 border-bottom">
      <div class="position-relative">
        <span class="position-absolute top-50 start-0 translate-middle-y ms-3">
          <i class="fas fa-search text-muted" />
        </span>
        <input
          v-model="searchInput"
          type="text"
          class="form-control ps-5"
          :placeholder="`Search${flipper.fileList.length ? ' ' + flipper.fileList.length + ' pins' : ''}...`"
          @input="handleSearch"
        >
      </div>
    </div>
    
    <div class="sidebar-content overflow-auto h-100">
      <div class="flex-grow-1 overflow-auto">
        <div
          v-if="pins.length === 0"
          class="d-flex flex-column align-items-center justify-content-center py-5"
        >
          <div v-if="!flipper.isConnected">
            <p class="text-muted small">
              Connect Flipper to see files.
            </p>
            <div class="mt-5 text-center">
              <a
                href="#"
                class="btn btn-sm btn-link text-decoration-none"
                data-bs-toggle="modal"
                data-bs-target="#helpModal"
              >
                <i class="fas fa-question-circle" /> Help
              </a>
            </div>
          </div>
          <p v-else-if="flipper.isSyncing">
            <span class="text-muted small">Syncing...</span>
          </p>
          <p v-else>
            <span class="text-muted small">No files found.</span>
          </p>
        </div>
      
        <div v-else>
          <div class="list-group list-group-flush">
            <a
              v-for="pin in pins"
              :key="pin.hash"
              href="#"
              class="list-group-item list-group-item-action px-3 py-3 overflow-hidden"
              :class="{'bg-body-secondary': selectedPin && selectedPin.hash === pin.hash, 'd-none': !pin.visible}"
              @click.prevent="handleSelectPin(pin)"
            >
              <div class="d-flex align-items-center">
                <div
                  class="d-flex align-items-center justify-content-center rounded-circle shadow-sm flex-shrink-0 size-46"
                  :class="'bg-' + pin.type"
                >
                  <i :class="['fas', `fa-${flipper.getFileIcon(pin.type)}`, 'text-white']" />
                </div>
                <div
                  class="flex-grow-1 min-width-0 mx-3 overflow-hidden"
                  :class="pin.distance ? '' : 'opacity-75'"
                >
                  <span class="d-block fw-medium small text-truncate">{{ pin.name }}</span>
                  <div class="text-muted small d-flex align-items-center text-truncate">
                    <div v-if="pin.distance">
                      <i class="fas fa-location-dot me-1 small flex-shrink-0" />
                      <span class="text-truncate">{{ pin.distance < 1 ? `${(pin.distance * 1000).toFixed(0)}m` : (pin.distance < 10 ? `${pin.distance.toFixed(1)}km` : `${pin.distance.toFixed(0)}km`) }} away</span>
                    </div>
                    <div v-else>
                      <i class="fas fa-location-pin-lock me-1 small flex-shrink-0" />
                      <span class="text-truncate">No location</span>
                    </div>
                  </div>
                </div>
                <div class="flex-shrink-0">
                  <i
                    v-if="pin.distance"
                    class="fas fa-chevron-right text-muted"
                  />
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div
        id="helpModal"
        class="modal fade"
        tabindex="-1"
      >
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                How to use Flipper Map
              </h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
              />
            </div>
            <div class="modal-body px-4">
              <div class="mb-4">
                <h6 class="fw-wedium">
                  <i class="fas fa-plug me-2" />
                  <span>Connecting Your Flipper</span>
                </h6>
                <ol>
                  <li>Connect your Flipper Zero to the computer using USB cable.</li>
                  <li>Click the <span class="fw-medium">Connect</span> button in the sidebar and select your Flipper Zero device from the browser dialog.</li>
                  <li>Wait for the app to sync files from your device.</li>
                </ol>
                <div class="alert alert-success">
                  <i class="fas fa-lock me-1" />
                  Your files are never sent to any server and always remain private.
                  <a
                    href="https://github.com/Stichoza/flipper-map"
                    class="link-success"
                  >View source on GitHub</a>.
                </div>
                <p>
                  <span class="fw-medium">Pins</span> on the map represent your Flipper files with location data. Click a pin to view detailed information about the file.
                  Flipper Map currently supports <i class="fas fa-wave-square color-subghz" /> Sub-GHz, <i class="fas fa-wifi color-nfc" /> NFC and <i class="fas fa-id-card-clip color-rfid" /> RFID files.
                </p>
              </div>
              <div class="mb-4">
                <ul>
                  <li>Files must include <code>Latitude:</code> and <code>Longitude:</code> lines to appear on the map.</li>
                  <li>You can add location data by editing files on your SD card or using the Flipper mobile app.</li>
                  <li>Files without location data will still appear in the sidebar but won't be shown on the map.</li>
                </ul>
              </div>
              <div class="mb-4">
                <h6 class="fw-bold">
                  <i class="fas fa-file-text me-2" />
                  <span>Example File</span>
                </h6>
                <pre class="border rounded bg-body-secondary py-2 px-3 small">
Filetype: Flipper SubGhz Key File
Version: 1
Frequency: 433920000
Preset: FuriHalSubGhzPresetOok270Async
<strong class="text-success">Latitude: 41.123456789</strong>
<strong class="text-success">Longitude: 44.987654321</strong>
Protocol: Princeton
...</pre>
              </div>
              <div class="mb-4">
                <h6 class="fw-bold">
                  <i class="fas fa-rocket me-2" />
                  <span>Future Improvements</span>
                </h6>
                <ol>
                  <li>Assigning or changing location of a pin directly on map using drag-and-drop. I hope I add this feature soon. Feel free to <a href="https://github.com/Stichoza/flipper-map">contribute</a>.</li>
                  <li>
                    The main Sub-GHz app with support of external
                    <a href="https://lab.flipper.net/apps/gps_nmea">GPS module</a>
                    via GPIO. The coordinates will be stored automatically when Flipper captures a signal.
                    <br>
                    Related issues:
                    <a href="https://github.com/DarkFlippers/unleashed-firmware/issues/844">unleashed-firmware#844</a>,
                    <a href="https://github.com/flipperdevices/flipperzero-firmware/issues/1547">flipperzero-firmware#1547</a>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
