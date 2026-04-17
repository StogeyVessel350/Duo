/*
 * DUO MVP firmware
 *
 * Target:    Seeed XIAO ESP32-C3
 * Sensor:    LSM6DSO32 (I2C, SparkFun/Adafruit breakout)
 * Protocol:  Nordic UART Service (NUS) — advertises as "DUO-mvp"
 *            Emits a 12-byte IMU frame at ~100 Hz on the TX characteristic.
 *
 * Frame layout (little-endian):
 *   int16 ax, ay, az  in milli-g     (1 g = 1000)
 *   int16 gx, gy, gz  in milli-dps   (1 dps = 1000)
 *
 * This is the minimum viable firmware — just stream raw IMU over BLE.
 * Rep detection, power management, attach sensor, etc. come later.
 *
 * Arduino IDE setup:
 *   Board:  "XIAO_ESP32C3" (under Seeed esp32 boards)
 *   Libraries:
 *     - Sparkfun 6DoF IMU Breakout LSM6DSO32   (by SparkFun)
 *       Library manager search: "SparkFun 6DoF LSM6DSO"
 *     - NimBLE-Arduino                           (by h2zero)
 *       Library manager search: "NimBLE-Arduino"
 *   Partition scheme: default
 *   USB CDC on boot: Enabled (for Serial monitor)
 *
 * Wiring (XIAO ESP32-C3  ↔  LSM6DSO32 breakout):
 *   3V3   ↔  VIN / 3V3
 *   GND   ↔  GND
 *   GPIO6 (SDA, D4)  ↔  SDA
 *   GPIO7 (SCL, D5)  ↔  SCL
 */

#include <Arduino.h>
#include <Wire.h>
#include <NimBLEDevice.h>
#include "SparkFunLSM6DSO.h"

// ─── Config ──────────────────────────────────────────────────────────────────
static const char *DEVICE_NAME   = "DUO-mvp";
static const uint16_t SAMPLE_HZ  = 100;
static const uint32_t SAMPLE_US  = 1000000UL / SAMPLE_HZ;

// NUS UUIDs (must match the app's src/config.ts)
#define NUS_SERVICE_UUID "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define NUS_TX_UUID      "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
#define NUS_RX_UUID      "6e400002-b5a3-f393-e0a9-e50e24dcca9e"

// ─── Globals ─────────────────────────────────────────────────────────────────
LSM6DSO imu;
NimBLEServer         *bleServer   = nullptr;
NimBLECharacteristic *txChar      = nullptr;
bool                  connected   = false;
uint32_t              lastSendUs  = 0;
uint32_t              lastBlinkMs = 0;
uint32_t              sampleCount = 0;

// 12-byte frame buffer
static uint8_t frame[12];

// ─── BLE callbacks ───────────────────────────────────────────────────────────
class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *srv, NimBLEConnInfo &info) override {
    connected = true;
    Serial.println("[BLE] central connected");
    // Request faster connection interval for live streaming
    srv->updateConnParams(info.getConnHandle(), 12, 24, 0, 400);
  }
  void onDisconnect(NimBLEServer *srv, NimBLEConnInfo &info, int reason) override {
    connected = false;
    Serial.printf("[BLE] disconnected, reason=%d\n", reason);
    NimBLEDevice::startAdvertising();
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
static inline int16_t clamp_i16(float v) {
  if (v >  32767.0f) return  32767;
  if (v < -32768.0f) return -32768;
  return (int16_t)v;
}

static void packFrame(float ax_g, float ay_g, float az_g,
                      float gx_dps, float gy_dps, float gz_dps) {
  int16_t ax = clamp_i16(ax_g  * 1000.0f);
  int16_t ay = clamp_i16(ay_g  * 1000.0f);
  int16_t az = clamp_i16(az_g  * 1000.0f);
  int16_t gx = clamp_i16(gx_dps * 1000.0f);
  int16_t gy = clamp_i16(gy_dps * 1000.0f);
  int16_t gz = clamp_i16(gz_dps * 1000.0f);

  frame[0]  = (uint8_t)(ax & 0xFF);  frame[1]  = (uint8_t)(ax >> 8);
  frame[2]  = (uint8_t)(ay & 0xFF);  frame[3]  = (uint8_t)(ay >> 8);
  frame[4]  = (uint8_t)(az & 0xFF);  frame[5]  = (uint8_t)(az >> 8);
  frame[6]  = (uint8_t)(gx & 0xFF);  frame[7]  = (uint8_t)(gx >> 8);
  frame[8]  = (uint8_t)(gy & 0xFF);  frame[9]  = (uint8_t)(gy >> 8);
  frame[10] = (uint8_t)(gz & 0xFF);  frame[11] = (uint8_t)(gz >> 8);
}

// ─── Setup ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("=== DUO MVP firmware ===");

  // Onboard LED for status — XIAO ESP32-C3 has one on GPIO10 (active LOW? depends on rev)
  // Adjust LED_BUILTIN pin if your board differs
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  // I2C — XIAO ESP32-C3 defaults: SDA=GPIO6(D4), SCL=GPIO7(D5)
  Wire.begin();
  Wire.setClock(400000);

  // IMU
  if (!imu.begin()) {
    Serial.println("[IMU] LSM6DSO32 not found — check wiring/address");
    while (1) {
      digitalWrite(LED_BUILTIN, LOW);  delay(100);
      digitalWrite(LED_BUILTIN, HIGH); delay(100);
    }
  }
  imu.initialize(BASIC_SETTINGS);
  // Override defaults for our use case
  imu.setAccelRange(32);        // ±32 g — survives barbell drops (if using DSO32 variant)
  imu.setAccelDataRate(104);    // 104 Hz ≈ our target 100 Hz
  imu.setGyroRange(2000);       // ±2000 dps
  imu.setGyroDataRate(104);
  Serial.println("[IMU] OK");

  // BLE
  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);
  NimBLEDevice::setMTU(185);

  bleServer = NimBLEDevice::createServer();
  bleServer->setCallbacks(new ServerCallbacks());

  NimBLEService *svc = bleServer->createService(NUS_SERVICE_UUID);
  txChar = svc->createCharacteristic(
      NUS_TX_UUID,
      NIMBLE_PROPERTY::NOTIFY
  );
  // RX char exists for future use (commands from phone → device). Unused in MVP.
  svc->createCharacteristic(
      NUS_RX_UUID,
      NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  svc->start();

  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(NUS_SERVICE_UUID);
  adv->setName(DEVICE_NAME);
  adv->enableScanResponse(true);
  NimBLEDevice::startAdvertising();

  Serial.printf("[BLE] advertising as \"%s\"\n", DEVICE_NAME);
  Serial.printf("[BLE] streaming at %u Hz once a central connects\n", SAMPLE_HZ);
  lastSendUs = micros();
}

// ─── Loop ────────────────────────────────────────────────────────────────────
void loop() {
  uint32_t nowUs = micros();

  // Sample + notify at SAMPLE_HZ
  if (connected && (nowUs - lastSendUs) >= SAMPLE_US) {
    lastSendUs += SAMPLE_US;

    float ax = imu.readFloatAccelX();   // g
    float ay = imu.readFloatAccelY();
    float az = imu.readFloatAccelZ();
    float gx = imu.readFloatGyroX();    // dps
    float gy = imu.readFloatGyroY();
    float gz = imu.readFloatGyroZ();

    packFrame(ax, ay, az, gx, gy, gz);
    txChar->setValue(frame, sizeof(frame));
    txChar->notify();
    sampleCount++;
  }

  // Status heartbeat on Serial every 2 s
  uint32_t nowMs = millis();
  if (nowMs - lastBlinkMs >= 2000) {
    lastBlinkMs = nowMs;
    Serial.printf("[stat] conn=%d  sent=%lu\n",
                  connected ? 1 : 0, (unsigned long)sampleCount);
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }

  // Small yield to keep BLE stack happy
  delayMicroseconds(200);
}
