import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext"; // Import the provider

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Wrap the App in the Provider here */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);