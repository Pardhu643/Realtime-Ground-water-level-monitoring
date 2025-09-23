import React, { useState } from "react";
import {
  FaBars, FaTimes, FaUserCircle,
  FaTachometerAlt, FaMapMarkerAlt, FaBell, FaChartBar
} from "react-icons/fa";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

export default function Charts({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // ✅ Sample data from /api/charts
  const data = {
    evaporation: [
      { date: "2025-09-17", evaporation_mm: 12 },
      { date: "2025-09-18", evaporation_mm: 15 },
      { date: "2025-09-19", evaporation_mm: 10 },
      { date: "2025-09-20", evaporation_mm: 18 }
    ],
    water_levels: [
      { date: "2025-09-17", Groundwatelevel_m: 12.2 },
      { date: "2025-09-18", Groundwatelevel_m: 12.4 },
      { date: "2025-09-19", Groundwatelevel_m: 12.6 },
      { date: "2025-09-20", Groundwatelevel_m: 12.7 }
    ]
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

      {/* Main */}
     <h2 className="text-lg font-extrabold m-5">Charts</h2>

      <main className="flex-grow p-6 bg-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Evaporation */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h2 className="text-lg font-bold mb-2">Evaporation</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.evaporation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="evaporation_mm" stroke="#1f77b4" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Water Levels */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h2 className="text-lg font-bold mb-2">Water Levels</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.water_levels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line dataKey="Groundwatelevel_m" stroke="#2ca02c" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-4 rounded-2xl shadow col-span-2">
            <h2 className="text-lg font-bold mb-2">Water Balance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Evaporation", value: data.evaporation.reduce((a, b) => a + b.evaporation_mm, 0) },
                    { name: "Water Level", value: data.water_levels.reduce((a, b) => a + b.Groundwatelevel_m, 0) }
                  ]}
                  dataKey="value"
                  outerRadius={120}
                  label
                >
                  <Cell fill="#1f77b4" />
                  <Cell fill="#2ca02c" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <a href="/home">
      <button className=" py-2 px-4 mt-5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200">Back</button></a>
      </main>
    </div>
  );
}
