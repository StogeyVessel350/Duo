/*
 * DUO MVP firmware — main entry point.
 *
 * Target: Seeed XIAO ESP32-C3
 * BLE GATT service: see docs/phase_2_hardware_and_firmware.md §7
 *
 * Task layout (FreeRTOS):
 *   - Sensor Task       : pulls IMU samples, runs rep detector
 *   - State Task        : session state machine, power transitions
 *   - BLE Task          : GATT server, notifies, command handling
 *   - Housekeeping Task : battery, faults, OTA window
 */

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "nvs_flash.h"

#include "ble_service.h"
#include "imu_driver.h"
#include "state_machine.h"

static const char *TAG = "duo_main";

void app_main(void) {
    ESP_LOGI(TAG, "DUO MVP firmware booting");

    ESP_ERROR_CHECK(nvs_flash_init());

    // TODO: initialize IMU, Hall, button, charger pins
    // TODO: start BLE
    // TODO: spawn tasks

    ESP_LOGI(TAG, "Boot complete; entering idle");
}
