import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import EditGame from "./pages/EditGameForm";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/edit/:fileName" element={<EditGame />} />
    </Routes>
  );
}
