import React from "react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div style={{ padding: "50px" }}>
      <h1>Augmentor Platform</h1>
      <Link to="/annotate">Annotate</Link><br />
      <Link to="/train">Train</Link><br />
      <Link to="/detect">Detect</Link>
    </div>
  );
};

export default Dashboard;