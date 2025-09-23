import React, { useState } from "react";
import {
  FaBars, FaTimes, FaUserCircle,
  FaTachometerAlt, FaMapMarkerAlt, FaBell, FaChartBar
} from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Stations({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // ✅ Sample data from /api/stations
  const stations = [
    { id: "TGPH2SW0203", name: "Nagarjuna Sagar", status: "Active", last_update: "2025-09-23" },
  ];

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
      <main className="flex-grow p-6 bg-gray-100">
        <div className="bg-white p-4 rounded-2xl shadow">
          <h2 className="text-lg font-bold mb-4">Stations</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Last Update</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id} className="text-center">
                  <td className="p-2 border">{s.id}</td>
                  <td className="p-2 border">{s.name}</td>
                  <td className="p-2 border">{s.status}</td>
                  <td className="p-2 border">{s.last_update}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a href="/home">
      <button className=" py-2 px-4 mt-5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200">Back</button></a>
      </main>
    </div>
  );
}
