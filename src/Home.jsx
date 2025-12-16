import React, { useState, useEffect } from "react";
import {
  FaBars,
  FaTimes,
  FaMapMarkerAlt,
  FaBell,
  FaUserCircle,
  FaTachometerAlt,
  FaChartBar,
  FaHome,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* ---------------- FIX LEAFLET ICON ISSUE ---------------- */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ---------------- CUSTOM COLORED MARKER ---------------- */
function getColoredMarker(color = "blue") {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        background:${color};
        width:18px;
        height:18px;
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 0 6px rgba(0,0,0,0.6);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

/* ============================ HOME ============================ */
export default function Home({ user, setUser }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stationStatus, setStationStatus] = useState(null);

  /* ---------------- FETCH ALERT DATA ---------------- */
  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStationStatus(data[0]);
        }
      })
      .catch((err) => console.error("Error fetching alerts:", err));
  }, []);

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = () => {
    setUser(null);
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ================= NAVBAR ================= */}
      <nav className="flex items-center justify-between bg-blue-600 p-4 text-white z-50">
        {/* Left */}
        <div className="flex items-center space-x-3">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-2xl">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>

          <div className="flex items-center space-x-2">
            <img src="logo1.png" alt="Logo" className="h-10" />
            <span className="font-bold text-3xl">Aquapulse - </span>
            <span className="text-xl text-white/100">The realtime groundwater level monitoring system</span>

          </div>
        </div>

        {/* Right */}
        <div className="flex items-center space-x-4 relative">
          {/* Home Button */}
          <FaHome
            title="Home"
            className="cursor-pointer text-2xl hover:text-gray-200"
            onClick={() => navigate("/home")}
          />

          {/* Profile */}
          <FaUserCircle
            title="Profile"
            className="cursor-pointer text-2xl hover:text-gray-200"
            onClick={() => setProfileOpen(!profileOpen)}
          />

          {profileOpen && (
            <div className="absolute right-0 top-10 bg-white text-black rounded-lg shadow-lg w-56">
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
                  onClick={() => navigate("/")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-blue-600"
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
      {menuOpen && (
  <div
    className="fixed inset-0 bg-black/30 z-[9000]"
    onClick={() => setMenuOpen(false)}
  />
)}


      {/* ================= SIDEBAR ================= */}
      <div
  className={`fixed top-0 left-0 h-full w-64 bg-blue-700 text-white
  z-[9999] shadow-2xl transform transition-transform duration-300
  ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
>

        <div className="p-6 space-y-4">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <FaTachometerAlt /> <span>Dashboard</span>
          </Link>
          <Link to="/stations" className="flex items-center space-x-2">
            <FaMapMarkerAlt /> <span>Stations</span>
          </Link>
          <Link to="/alerts" className="flex items-center space-x-2">
            <FaBell /> <span>Alerts</span>
          </Link>
          <Link to="/charts" className="flex items-center space-x-2">
            <FaChartBar /> <span>Charts</span>
          </Link>
        </div>
      </div>

      {/* ================= MAP ================= */}
<main className="flex-grow">
  <MapContainer
    center={[16.575, 79.311]}
    zoom={12}
    className="w-full h-[calc(100vh-64px)] z-0"
  >
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; OpenStreetMap"
    />

    <Marker
      key={stationStatus?.color || "blue"}
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
          <>Station location pinned</>
        )}
      </Popup>
    </Marker>
  </MapContainer>
</main>

    </div>
  );
}
