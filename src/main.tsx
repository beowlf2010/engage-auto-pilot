import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Initialize global fetch/network interceptor
import './services/network/fetchInterceptor';

createRoot(document.getElementById("root")!).render(<App />);
