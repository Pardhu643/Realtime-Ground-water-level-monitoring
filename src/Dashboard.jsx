import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaUserCircle } from "react-icons/fa";
import Plot from "react-plotly.js";

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Backend error");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load dashboard data");
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-6">Loading forecast charts...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  const {
    rainfall_dates,
    predicted_rainfall,
    rainfall_upper,
    rainfall_lower,
    gw_dates,
    predicted_gw,
    today_gw_level,
  } = data;

  /* ================= Rainfall ================= */
  const rainfallUpper = {
    x: rainfall_dates,
    y: rainfall_upper,
    mode: "lines",
    line: { width: 0 },
    showlegend: false,
  };

  const rainfallLower = {
    x: rainfall_dates,
    y: rainfall_lower,
    mode: "lines",
    fill: "tonexty",
    fillcolor: "rgba(0,0,255,0.2)",
    line: { width: 0 },
    showlegend: false,
  };

  const rainfallTrace = {
    x: rainfall_dates,
    y: predicted_rainfall,
    mode: "lines+markers",
    name: "Predicted Rainfall",
    line: { color: "blue", width: 3 },
    hovertemplate:
      "Date: %{x}<br>Predicted Rainfall: %{y:.2f} mm<extra></extra>",
  };

  /* ================= Groundwater ================= */
  const gwTrace = {
    x: gw_dates,
    y: predicted_gw,
    mode: "lines+markers",
    name: "Predicted Groundwater",
    line: { color: "purple", width: 3 },
    hovertemplate:
      "Date: %{x}<br>Predicted GW: %{y:.3f} m<extra></extra>",
  };

  const gwCurrent = {
    x: [gw_dates[0], gw_dates[gw_dates.length - 1]],
    y: [today_gw_level, today_gw_level],
    mode: "lines",
    name: "Current Level",
    line: { color: "red", width: 2, dash: "dash" },
    hovertemplate: `Current Level: ${today_gw_level.toFixed(
      3
    )} m<extra></extra>`,
  };

  return (
    <div className="min-h-screen relative">
  {/* Full-screen background image */}
  <div
    className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
    style={{ backgroundImage: "url('/coastline-waikiki-water-level-diamond-260nw-2495293861.jpg')" }}
  />
  <div className="fixed inset-0 bg-black/30 -z-10" /> {/* Optional overlay for readability */}

      {/* ================= Top Bar ================= */}
<nav className="fixed top-0 left-0 right-0 h-16 bg-blue-600 text-white flex items-center justify-between px-8 shadow z-50">
        <h1 className="text-lg font-bold">Aquapulse Dashboard</h1>
        

        <div className="flex items-center space-x-4">
          {/* ✅ Home Button */}
          <button
            onClick={() => navigate("/home")}
            className="flex items-center space-x-1 hover:text-gray-200"
            title="Home"
          >
            <FaHome className="text-xl" />
            <span className="hidden md:inline">Home</span>
          </button>

          {/* Profile */}
          <div className="flex items-center space-x-2">
            <FaUserCircle className="text-2xl" />
            <span className="hidden md:inline">
              {user?.username || "Guest"}
            </span>
          </div>
        </div>
      </nav>

      {/* ================= Content ================= */}
      <div className="pt-20 p-6">

        <h2 className="text-2xl font-bold mb-6">Next Week Forecast</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rainfall */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h3 className="font-semibold mb-2">Rainfall Forecast</h3>
            <Plot
              data={[rainfallUpper, rainfallLower, rainfallTrace]}
              layout={{
                title: "Predicted Rainfall (mm)",
                xaxis: { title: "Date" },
                yaxis: { title: "Rainfall (mm)" },
                hovermode: "x unified",
                autosize: true,
              }}
              config={{ responsive: true }}
              style={{ width: "100%", height: "350px" }}
            />
          </div>

          {/* Groundwater */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h3 className="font-semibold mb-2">Groundwater Forecast</h3>
            <Plot
              data={[gwTrace, gwCurrent]}
              layout={{
                title: "Predicted Groundwater Level (m)",
                xaxis: { title: "Date" },
                yaxis: { title: "GW Level (m)" },
                hovermode: "x unified",
                autosize: true,
              }}
              config={{ responsive: true }}
              style={{ width: "100%", height: "350px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
