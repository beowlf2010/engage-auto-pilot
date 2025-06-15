
import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

const navLinks = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Inventory", path: "/inventory-dashboard" },
  { label: "Leads", path: "/leads" },
  { label: "Financial", path: "/financial-dashboard" },
  { label: "Settings", path: "/settings" },
];

const StreamlinedNavigation = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  return (
    <nav className="w-full px-6 py-4 bg-[rgba(16,20,31,0.95)] shadow-lg rounded-b-2xl flex justify-between items-center mb-8 border-b border-gray-800">
      <div className="font-black text-2xl tracking-tighter cursor-pointer flex items-center gap-2" onClick={() => navigate("/dashboard")}>
        <span className="text-white">uiflip</span>
        <span className="accent">.</span>
      </div>
      <ul className="flex gap-7 items-center">
        {navLinks.map(link => (
          <li key={link.path}>
            <button
              className="relative group font-semibold text-base text-white hover:text-accent-neon transition py-1 px-2"
              onClick={() => navigate(link.path)}
            >
              {link.label}
              <span className="absolute left-0 -bottom-1 w-full h-0.5 scale-x-0 group-hover:scale-x-100 bg-accent-neon transition-transform duration-300 origin-bottom-right group-hover:origin-bottom-left" />
            </button>
          </li>
        ))}
        <li>
          <button
            onClick={() => navigate("/contact")}
            className="neon-btn ml-2"
          >
            Let’s Talk
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default StreamlinedNavigation;
