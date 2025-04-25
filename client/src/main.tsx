import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/kasina-animations.css";
import "@fontsource/inter";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";

createRoot(document.getElementById("root")!).render(<App />);
