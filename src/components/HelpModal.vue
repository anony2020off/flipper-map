<template>
  <div>
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
</template>
