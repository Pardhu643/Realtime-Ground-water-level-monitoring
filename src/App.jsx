// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import Dashboard from "./Dashboard";
import Charts from "./Charts";
import { useState } from "react";
import Stations from "./Stations";
import Alerts from "./Alerts";

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route path="/home" element={<Home user={user} setUser={setUser} />} />
        <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} />} />
        <Route path="/charts" element={<Charts user={user} setUser={setUser} />} />
        <Route path="/stations" element={<Stations user={user} setUser={setUser} />} />
        <Route path="/alerts" element={<Alerts user={user} setUser={setUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
