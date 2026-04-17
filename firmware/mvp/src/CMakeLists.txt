idf_component_register(
    SRCS
        "main.c"
        "ble_service.c"
        "imu_driver.c"
        "hall.c"
        "state_machine.c"
        "rep_detector.c"
        "power_mgmt.c"
    INCLUDE_DIRS "."
    REQUIRES
        nvs_flash
        bt
        driver
        esp_adc
)
