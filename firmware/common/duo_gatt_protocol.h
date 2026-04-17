/*
 * DUO BLE GATT protocol — shared definitions.
 *
 * Frozen as of Phase 2. Any change to UUIDs, frame layouts, or command bytes
 * requires a protocol_ver bump and coordinated mobile release.
 *
 * See docs/phase_2_hardware_and_firmware.md §7 for the full spec.
 */

#ifndef DUO_GATT_PROTOCOL_H
#define DUO_GATT_PROTOCOL_H

#include <stdint.h>

#define DUO_PROTOCOL_VERSION 1

/* Service and characteristic UUIDs (128-bit) */
#define DUO_SERVICE_UUID       "6d756f00-0001-4000-8000-000000000001"
#define DUO_CHAR_DEVICE_INFO   "6d756f00-0002-4000-8000-000000000001"
#define DUO_CHAR_SESSION_CTL   "6d756f00-0003-4000-8000-000000000001"
#define DUO_CHAR_TELEMETRY     "6d756f00-0004-4000-8000-000000000001"
#define DUO_CHAR_EVENTS        "6d756f00-0005-4000-8000-000000000001"
#define DUO_CHAR_BATTERY       "6d756f00-0006-4000-8000-000000000001"
#define DUO_CHAR_RAWBUF_CTL    "6d756f00-0007-4000-8000-000000000001"
#define DUO_CHAR_RAWBUF_DATA   "6d756f00-0008-4000-8000-000000000001"
#define DUO_CHAR_OTA_CTL       "6d756f00-0009-4000-8000-000000000001"
#define DUO_CHAR_OTA_DATA      "6d756f00-000A-4000-8000-000000000001"
#define DUO_CHAR_OTA_STATUS    "6d756f00-000B-4000-8000-000000000001"

/* SessionControl commands */
typedef enum {
    DUO_CMD_START_SESSION    = 0x01,
    DUO_CMD_STOP_SESSION     = 0x02,
    DUO_CMD_TARE             = 0x03,
    DUO_CMD_SET_ODR          = 0x04,
    DUO_CMD_SET_RANGE        = 0x05,
    DUO_CMD_ENTER_LOW_POWER  = 0x06,
    DUO_CMD_IDENTIFY         = 0x07,
} duo_session_cmd_t;

/* Event IDs */
typedef enum {
    DUO_EVT_REP_DETECTED     = 0x01,
    DUO_EVT_ATTACH           = 0x02,
    DUO_EVT_DETACH           = 0x03,
    DUO_EVT_BUTTON_SHORT     = 0x04,
    DUO_EVT_BUTTON_LONG      = 0x05,
    DUO_EVT_FAULT            = 0x06,
    DUO_EVT_MOTION_WAKE      = 0x07,
    DUO_EVT_CHARGING_STARTED = 0x08,
    DUO_EVT_CHARGING_DONE    = 0x09,
} duo_event_id_t;

/* 20-byte telemetry frame, notified at ~20 Hz */
typedef struct __attribute__((packed)) {
    uint8_t  seq;
    uint16_t t_offset_ms;
    uint16_t accel_peak_mg;
    uint16_t accel_rms_mg;
    int16_t  gyro_peak_x_dps;
    int16_t  gyro_peak_y_dps;
    int16_t  gyro_peak_z_dps;
    int8_t   quat_w;
    int8_t   quat_x;
    int8_t   quat_y;
    int8_t   quat_z;
    uint8_t  state_byte;
    uint16_t crc16;
} duo_telemetry_frame_t;

_Static_assert(sizeof(duo_telemetry_frame_t) == 20, "telemetry frame must be 20 bytes");

#endif /* DUO_GATT_PROTOCOL_H */
