import React, { useState, useEffect } from "react";
import {
  FaBars,
  FaTimes,
  FaMapMarkerAlt,
  FaBell,
  FaUserCircle,
  FaTachometerAlt,
  FaChartBar,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ✅ Function to create colored marker
function getColoredMarker(color = "blue") {
  return new L.Icon({
    iconUrl: `https://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=water|${color}`,
    iconSize: [30, 50],
    iconAnchor: [15, 50],
    popupAnchor: [0, -50],
    shadowUrl: markerShadow,
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });
}

export default function Home({ user, setUser }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stationStatus, setStationStatus] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStationStatus(data[0]);
        }
      })
      .catch((err) => console.error("Error fetching station status:", err));
  }, []);

  const handleLogout = () => {
    if (setUser) setUser(null);
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-blue-600 p-4 text-white relative z-50">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-2xl focus:outline-none"
          >
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
                <p className="font-semibold">
                  {user?.username || "Guest User"}
                </p>
                <p className="text-sm text-gray-600">
                  {user?.email || "guest@email.com"}
                </p>
              </div>
              {user ? (
                <>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">
                    Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => (window.location.href = "/")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-blue-600"
                >
                  Login
                </button>
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
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 hover:text-gray-200"
          >
            <FaTachometerAlt /> <span>Dashboard</span>
          </Link>
          <Link
            to="/stations"
            className="flex items-center space-x-2 hover:text-gray-200"
          >
            <FaMapMarkerAlt /> <span>Stations</span>
          </Link>
          <Link
            to="/alerts"
            className="flex items-center space-x-2 hover:text-gray-200"
          >
            <FaBell /> <span>Alerts</span>
          </Link>
          <Link
            to="/charts"
            className="flex items-center space-x-2 hover:text-gray-200"
          >
            <FaChartBar /> <span>Charts</span>
          </Link>
        </div>
      </div>

      {/* Map */}
      <main className="flex-grow relative z-0">
        <div className="h-[calc(100vh-120px)] w-full">
          <MapContainer
            center={[16.575, 79.311]}
            zoom={12}
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            />

            {/* ✅ Always show default marker */}
            <Marker
              position={[16.575, 79.311]}
              icon={getColoredMarker(stationStatus?.color || "blue")}
            >
              <Popup>
                {stationStatus ? (
                  <>
                    <b>Station:</b> {stationStatus.station_id} <br />
                    <b>Pulse Score:</b> {stationStatus.pulse_score}/100 <br />
                    <b>Status:</b> {stationStatus.alert_level} <br />
                    <b>Message:</b> {stationStatus.message}
                  </>
                ) : (
                  <>Station location pinned (TGPH2SW0203)</>
                )}
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-blue-600 text-white p-4 text-center relative z-10">
        © {new Date().getFullYear()} DWLR. All rights reserved.
      </footer>
    </div>
  );
}
