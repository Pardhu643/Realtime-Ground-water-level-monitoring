import React, { useState, useEffect } from "react";
import {
  FaBars, FaTimes, FaUserCircle,
  FaTachometerAlt, FaMapMarkerAlt, FaBell, FaChartBar
} from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Alerts({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/api/alerts");
        if (response.ok) {
          const data = await response.json();
          setAlerts(data);
        } else {
          console.error("Failed to fetch alerts");
        }
      } catch (err) {
        console.error("Error fetching alerts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

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
                <p className="font-semibold">{user?.username || "Guest User"}</p>
                <p className="text-sm text-gray-600">{user?.email || "guest@email.com"}</p>
              </div>
              {user ? (
                <>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100">
                    Change Password
                  </button>
                  <button
                    onClick={() => window.location.reload()}
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
        <div className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-lg font-bold mb-4">Alerts</h2>
          {loading ? (
            <p>Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p>No alerts at the moment.</p>
          ) : (
            alerts.map((a, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg shadow border-l-8 mb-4`}
                style={{ borderColor: a.color }}
              >
                <p><b>Station:</b> {a.station_id}</p>
                <p><b>Level:</b> {a.alert_level}</p>
                <p><b>Pulse Score:</b> {a.pulse_score}</p>
                <p><b>Message:</b> {a.message}</p>
              </div>
            ))
          )}
        </div>
        <Link to="/home">
          <button className="py-2 px-4 mt-5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200">
            Back
          </button>
        </Link>
      </main>
    </div>
  );
}
