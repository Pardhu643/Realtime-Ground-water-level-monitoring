import React, { useState, useEffect } from "react";
import {
  FaBars, FaTimes, FaUserCircle,
  FaTachometerAlt, FaMapMarkerAlt, FaBell, FaChartBar
} from "react-icons/fa";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import Plot from "react-plotly.js";

export default function Charts({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [data, setData] = useState({
    evaporation: [],
    water_levels: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch chart data from backend
  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/charts")
      .then(res => {
        if (!res.ok) throw new Error("Backend error");
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load chart data");
        setLoading(false);
      });
  }, []);

  // Prepare pie chart data
  const evaporationTotal = data.evaporation?.reduce((sum, item) => sum + (item.evaporation_mm || 0), 0) || 0;
  const waterLevelTotal = data.water_levels?.reduce((sum, item) => sum + (item.Groundwatelevel_m || 0), 0) || 0;

  const pieData = (evaporationTotal > 0 || waterLevelTotal > 0) ? [
    { name: "Evaporation", value: evaporationTotal },
    { name: "Water Level", value: waterLevelTotal }
  ] : [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="flex items-center justify-between bg-blue-600 p-4 text-white">
        <div className="flex items-center space-x-3">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-2xl">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <span className="font-bold text-lg">Aquapulse</span>
        </div>

        <FaUserCircle
          className="cursor-pointer text-2xl"
          onClick={() => setProfileOpen(!profileOpen)}
        />

        {profileOpen && (
          <div className="absolute right-4 top-16 bg-white text-black rounded-lg shadow-lg w-56 z-50">
            <div className="p-4 border-b">
              <p className="font-semibold">{user?.username || "Guest User"}</p>
              <p className="text-sm text-gray-600">{user?.email || "guest@email.com"}</p>
            </div>
            {user ? (
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
                Logout
              </button>
            ) : (
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-blue-600">
                Login
              </button>
            )}
          </div>
        )}
      </nav>
      {menuOpen && (
  <div
    className="fixed inset-0 bg-black/30 z-[9000]"
    onClick={() => setMenuOpen(false)}
  />
)}


      {/* Sidebar */}
      <div
  className={`fixed top-0 left-0 h-full w-64 bg-blue-700 text-white
  z-[9999] shadow-2xl transform transition-transform duration-300
  ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
>

        <div className="p-6 space-y-4">
          <Link to="/dashboard" className="flex items-center space-x-2"><FaTachometerAlt /> <span>Dashboard</span></Link>
          <Link to="/stations" className="flex items-center space-x-2"><FaMapMarkerAlt /> <span>Stations</span></Link>
          <Link to="/alerts" className="flex items-center space-x-2"><FaBell /> <span>Alerts</span></Link>
          <Link to="/charts" className="flex items-center space-x-2"><FaChartBar /> <span>Charts</span></Link>
        </div>
      </div>

      {/* Main Content */}
      <main
     className="flex-grow p-6 bg-cover bg-center bg-no-repeat relative"
     style={{ backgroundImage: "url('/coastline-waikiki-water-level-diamond-260nw-2495293861.jpg')" }}
      >

        <h2 className="text-xl font-bold mb-4">Charts</h2>

        {loading && <p>Loading charts...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Evaporation */}
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold mb-2">Evaporation</h3>
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
            <div className="bg-white p-4 rounded-xl shadow">
              <h3 className="font-bold mb-2">Water Levels</h3>
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

            {/* Water Balance Pie */}
            <div className="bg-white p-4 rounded-xl shadow col-span-2">
              <h3 className="font-bold mb-2">7-Day Water Balance</h3>

              {pieData.length > 0 ? (
                <Plot
                  data={[
                    {
                      type: "pie",
                      labels: pieData.map(d => d.name),
                      values: pieData.map(d => d.value),
                      marker: { colors: ["#1f77b4", "#2ca02c"] },
                      hovertemplate: "%{label}: %{value:.2f}<br>Percentage: %{percent}<extra></extra>",
                      name: "7-day Balance"
                    }
                  ]}
                  layout={{ height: 300, width: "100%", showlegend: true, margin: { t:0, b:0, l:0, r:0 } }}
                  useResizeHandler
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <p className="text-center text-gray-500 mt-20">
                  Not enough data to display water balance
                </p>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
