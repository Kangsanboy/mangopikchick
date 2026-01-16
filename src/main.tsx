import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css' // <--- JANGAN SAMPAI HILANG INI!

createRoot(document.getElementById("root")!).render(<App />);
