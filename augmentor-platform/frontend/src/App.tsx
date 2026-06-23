import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./components/Dashboard";

import Annotator from "./pages/Annotator";

import Train from "./pages/Train";

import Augment from "./pages/Augment";

import Detect from "./pages/Detect";   // ⭐ ADDED


function App() {

return(

<BrowserRouter>

<Routes>

<Route path="/" element={<Dashboard />} />

<Route path="/annotate" element={<Annotator />} />

<Route path="/train" element={<Train />} />

<Route path="/augment" element={<Augment />} />

<Route path="/detect" element={<Detect />} />   {/* ⭐ ADDED */}

</Routes>

</BrowserRouter>

);

}

export default App;