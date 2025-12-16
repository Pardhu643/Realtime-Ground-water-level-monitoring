import React, { useState, useEffect } from "react";
import {
  FaBars, FaTimes, FaUserCircle,
  FaTachometerAlt, FaMapMarkerAlt, FaBell, FaChartBar
} from "react-icons/fa";
import { Link } from "react-router-dom";


export default function Stations({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [stations, setStations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recharge, setRecharge] = useState({ amount: 0, date: "" });

  const handleLogout = () => {
    console.log("Logout clicked");
    window.location.href = "/";
  };

  // Helper to get Safe Status based on pulse score
  // Inside your component, add:
const getSafeStatus = (pulse_score) => {
  if (pulse_score >= 80) return { color: "green", alert: "NORMAL", message: "Groundwater levels are healthy" };
  if (pulse_score >= 60) return { color: "yellow", alert: "WATCH", message: "Groundwater levels are moderate - monitor closely" };
  if (pulse_score >= 40) return { color: "orange", alert: "ADVISORY", message: "Groundwater levels are below normal - conservation advised" };
  if (pulse_score >= 20) return { color: "red", alert: "WARNING", message: "Groundwater levels are critically low - immediate action needed" };
  return { color: "darkred", alert: "EMERGENCY", message: "Groundwater emergency - implement emergency measures" };
};

useEffect(() => {
    // Fetch stations
    fetch("https://realtime-ground-water-level-monitoring-1.onrender.com/api/stations")
      .then(res => res.json())
      .then(data => setStations(data));

    // Fetch alerts
    fetch("https://realtime-ground-water-level-monitoring-1.onrender.com/api/alerts")
      .then(res => res.json())
      .then(data => setAlerts(data));

    // Fetch today's recharge / groundwater prediction
    fetch("https://realtime-ground-water-level-monitoring-1.onrender.com/api/dashboard")
      .then(res => res.json())
      .then(data => {
        setRecharge({
          amount: data.predicted_groundwater, // or rainfall as needed
          date: new Date().toISOString().slice(0, 10)
        });
      });
  }, []);


  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-blue-600 p-4 text-white relative z-50">
        <div className="flex items-center space-x-3">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-2xl focus:outline-none">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className="flex items-center space-x-2">
            <img src="logo1.png" alt="Logo" className="h-10" />
            <span className="font-bold text-lg">Aquapulse</span>
          </div>
        </div>

        {/* Profile */}
        <div className="relative">
          <FaUserCircle
            title="Profile"
            className="cursor-pointer text-2xl"
            onClick={() => setProfileOpen(!profileOpen)}
          />
          {profileOpen && (
            <div className="absolute right-0 mt-2 bg-white text-black rounded-lg shadow-lg w-56 z-50">
              <div className="p-4 border-b">
                <p className="font-semibold">{user?.username || "Guest User"}</p>
                <p className="text-sm text-gray-600">{user?.email || "guest@email.com"}</p>
              </div>
              {user ? (
                <>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Change Password</button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">Logout</button>
                </>
              ) : (
                <button onClick={() => (window.location.href = "/")} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-blue-600">Login</button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-blue-700 text-white shadow-lg transform transition-transform duration-300 z-40 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-blue-500">
          <h2 className="font-bold text-lg">Menu</h2>
        </div>
        <div className="flex flex-col space-y-4 p-6">
          <Link to="/dashboard" className="flex items-center space-x-2 hover:text-gray-200">
            <FaTachometerAlt /> <span>Dashboard</span>
          </Link>
          <Link to="/stations" className="flex items-center space-x-2 hover:text-gray-200">
            <FaMapMarkerAlt /> <span>Stations</span>
          </Link>
          <Link to="/alerts" className="flex items-center space-x-2 hover:text-gray-200">
            <FaBell /> <span>Alerts</span>
          </Link>
          <Link to="/charts" className="flex items-center space-x-2 hover:text-gray-200">
            <FaChartBar /> <span>Charts</span>
          </Link>
        </div>
      </div>

      {/* Main */}
      <main
        className="flex-grow p-6 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: "url('/coastline-waikiki-water-level-diamond-260nw-2495293861.jpg')" }}
      >
        <div className="bg-white p-6 rounded-2xl shadow-lg max-w-5xl mx-auto">
          {/* Stations Table */}
          <h2 className="text-lg font-bold mb-4">Stations</h2>
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-gray-500 text-white">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Last Update</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id} className="hover:bg-gray-100">
                  <td className="p-2 border">{s.id}</td>
                  <td className="p-2 border">{s.name}</td>
                  <td className="p-2 border">{s.status}</td>
                  <td className="p-2 border">{s.last_update}</td>
                </tr>
              ))}
            </tbody>
          </table>

         {stations.map((s, index) => {
  const alertData = alerts[index] || { pulse_score: 0 };
  const status = getSafeStatus(alertData.pulse_score);

  return (
    <div key={s.id} className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">

      {/* Recent Recharge */}
      <div className="flex-1 bg-white p-4 rounded-lg shadow flex flex-col">
        <h4 className="font-medium text-gray-700 mb-2">Recent Recharge</h4>
        <p className="text-gray-600">Amout _of water(meters): {recharge.amount}</p>
        <p className="text-gray-600">Date: {recharge.date}</p>
      </div>

      {/* Recent Alerts */}
      <div className="flex-1 bg-white p-4 rounded-lg shadow flex flex-col">
        <h4 className="font-medium text-gray-700 mb-2">Recent Alerts</h4>
        <p className="text-red-600 font-semibold">{alertData.alert_level ? 1 : 0} New Alerts</p>
        <ul className="list-disc list-inside text-gray-600">
          <li>{alertData.message}</li>
        </ul>
      </div>

      {/* Safe Status */}
      <div className="flex-1 bg-white p-4 rounded-lg shadow flex flex-col items-start justify-center">
        <h4 className="font-medium text-gray-700 mb-2">Safe Status</h4>
        <div
          className="w-16 h-16 rounded-full"
          style={{ backgroundColor: status.color }}
        ></div>
        <p className="mt-2 font-semibold">{status.alert}</p>
        <p className="text-gray-600 text-sm">{status.message}</p>
      </div>

    </div>
  );
})}



          <div className="mt-6 text-right">
            <Link to="/home">
              <button className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200">Back</button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
