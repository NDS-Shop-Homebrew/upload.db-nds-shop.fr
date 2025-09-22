
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";
// import About from "./pages/About";
import EditGameForm from "./pages/EditGameForm";

export default function App() {
  return (
    <Routes>
      {/* Routes avec Layout (Navbar + Footer) */}
      <Route element={<Layout />}>
        {/* Routes publiques */}
        <Route path="/" element={<Home />} />
        <Route path="/edit/:fileName" element={<EditGameForm />} />
        {/* <Route path="/about" element={<About />} /> */}
      </Route>

      {/* Route 404 hors Layout */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
