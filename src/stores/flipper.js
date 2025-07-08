import { ref } from "vue";
import { defineStore } from "pinia";

export const useFlipperStore = defineStore("flipper", () => {
    const port = ref(null);
    const isConnected = ref(false);

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
