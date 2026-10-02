import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hospital");

// ---------- Models ----------
// Which room each ESP32 is installed in
const Device = mongoose.model("Device", new mongoose.Schema({
  deviceId: { type: String, unique: true },
  room: String,
  location: String,
  department: String,
}));

// Current state of each machine
const Equipment = mongoose.model("Equipment", new mongoose.Schema({
  rfidTag: { type: String, unique: true },
  machineName: String,
  room: String,
  location: String,
  department: String,
  lastScanned: Date,
}));

// History of every scan
const Scan = mongoose.model("Scan", new mongoose.Schema({
  rfidTag: String,
  machineName: String,
  deviceId: String,
  room: String,
  location: String,
  department: String,
  scannedAt: { type: Date, default: Date.now },
}));

// ---------- Sample data (only added if missing) ----------
const devices = [
  { deviceId: "ESP32-ICU-02", room: "ICU-02", location: "Block A - Floor 1", department: "ICU" },
  { deviceId: "ESP32-CARD-03", room: "CARD-03", location: "Block B - Floor 2", department: "Cardiology" },
  { deviceId: "ESP32-RAD-01", room: "RAD-01", location: "Block A - Ground", department: "Radiology" },
];
const machines = [
  { rfidTag: "RFID001", machineName: "Ventilator" },
  { rfidTag: "RFID002", machineName: "ECG Machine" },
  { rfidTag: "RFID003", machineName: "X-Ray" },
];
for (const d of devices) await Device.updateOne({ deviceId: d.deviceId }, { $setOnInsert: d }, { upsert: true });
for (const m of machines) await Equipment.updateOne({ rfidTag: m.rfidTag }, { $setOnInsert: m }, { upsert: true });

// ---------- API ----------
// ESP32 calls this
app.post("/api/rfid", async (req, res) => {
  const { rfidTag, deviceId } = req.body;
  if (!rfidTag || !deviceId) return res.status(400).json({ error: "rfidTag and deviceId are required" });

  const device = await Device.findOne({ deviceId });
  if (!device) return res.status(404).json({ error: "Unknown deviceId" });

  const { room, location, department } = device;
  const now = new Date();

  const machine = await Equipment.findOneAndUpdate(
    { rfidTag },
    { $set: { room, location, department, lastScanned: now }, $setOnInsert: { machineName: "Unknown Machine" } },
    { upsert: true, new: true }
  );

  await Scan.create({ rfidTag, machineName: machine.machineName, deviceId, room, location, department, scannedAt: now });
  res.json({ ok: true, machine: machine.machineName, room });
});

// Website calls these
app.get("/api/equipment", async (req, res) => res.json(await Equipment.find().sort({ lastScanned: -1 })));
app.get("/api/scans", async (req, res) => res.json(await Scan.find().sort({ scannedAt: -1 }).limit(10)));

app.listen(5000, "0.0.0.0", () => console.log("Server running on port 5000"));
