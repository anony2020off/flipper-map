# Flipper Map

Connect your Flipper Zero to your computer using USB and visualize signal recordings on map.

<img width="1024" height="477" alt="flipper-zero-cover" src="https://github.com/user-attachments/assets/8c8c29be-b9b9-435c-ae2a-738060fadba4" />


Flipper files should include `Latitude:` and `Longitude:` lines. It's done manually at the moment, but I hope there will be an easier way to do it in the future, like automatically saving location at the time of recording using GPS module via GPIO.

You can add location info using Flipper mobile app or directly edit them on SD card.

### Example file

```yaml
Filetype: Flipper SubGhz Key File
Version: 1
Frequency: 433920000
Preset: FuriHalSubGhzPresetOok270Async
Latitude: 41.123456
Longitude: 44.987654
Protocol: Dickert_MAHS
Bit: 36
Key: 00 00 00 0C 12 AB CD EF
```


![Screenshot](https://github.com/user-attachments/assets/e005ad5c-9c7c-4d2a-91c6-e6004bf0057b)
