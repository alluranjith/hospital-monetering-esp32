import { useEffect, useState } from "react";
import axios from "axios";

const time = (t) =>
  t ? new Date(t).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "Never";

export default function App() {
  const [equipment, setEquipment] = useState([]);
  const [scans, setScans] = useState([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  const load = async () => {
    const [e, s] = await Promise.all([axios.get("/api/equipment"), axios.get("/api/scans")]);
    setEquipment(e.data);
    setScans(s.data);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000); // auto refresh every 10s
    return () => clearInterval(timer);
  }, []);

  const locations = [...new Set(equipment.map((m) => m.location).filter(Boolean))];

  const shown = equipment.filter((m) => {
    const text = `${m.rfidTag} ${m.machineName}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (!location || m.location === location);
  });

  return (
    <div className="page">
      <h1>🏥 Hospital Equipment Tracker</h1>

      <div className="cards">
        <div className="card"><span>Total Machines</span><b>{equipment.length}</b></div>
        <div className="card"><span>Locations</span><b>{locations.length}</b></div>
        <div className="card"><span>Recent Scans</span><b>{scans.length}</b></div>
      </div>

      <div className="toolbar">
        <input placeholder="Search machine or RFID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l}>{l}</option>)}
        </select>
        <button onClick={load}>🔄 Refresh</button>
      </div>

      <h2>Current Machine Locations</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>RFID</th><th>Machine</th><th>Room</th><th>Location</th><th>Department</th><th>Last Scanned</th></tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m._id}>
                <td>{m.rfidTag}</td><td>{m.machineName}</td><td>{m.room || "-"}</td>
                <td>{m.location || "-"}</td><td>{m.department || "-"}</td><td>{time(m.lastScanned)}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan="6" className="empty">No machines found</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Recent Scans</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Time</th><th>RFID</th><th>Machine</th><th>Room</th><th>Device</th></tr></thead>
          <tbody>
            {scans.map((s) => (
              <tr key={s._id}>
                <td>{time(s.scannedAt)}</td><td>{s.rfidTag}</td><td>{s.machineName}</td><td>{s.room}</td><td>{s.deviceId}</td>
              </tr>
            ))}
            {scans.length === 0 && <tr><td colSpan="5" className="empty">No scans yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
