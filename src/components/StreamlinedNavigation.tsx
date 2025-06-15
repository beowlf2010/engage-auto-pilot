
import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";

const navLinks = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Inventory", path: "/inventory-dashboard" },
  { label: "Leads", path: "/leads" },
  { label: "Financial", path: "/financial-dashboard" },
];

const StreamlinedNavigation = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) return null;

  return (
    <nav className="w-full sticky top-0 z-30 px-8 py-5 bg-gradient-to-b from-[#25185d]/95 to-[#1d1246]/80 flex justify-between items-center border-b border-[#33276c] shadow-none mb-10">
      {/* Logo and Brand */}
      <div
        className="font-extrabold text-2xl sm:text-3xl tracking-tight flex items-center gap-3 cursor-pointer"
        onClick={() => navigate("/dashboard")}
      >
        <span className="text-white font-display">formaCRM</span>
        <span className="rounded-[4px] bg-accent2 px-2 py-1 text-lg text-white font-black shadow-lg">.</span>
      </div>
      {/* Navigation Links */}
      <ul className="flex gap-4 sm:gap-6 items-center">
        {navLinks.map(link => (
          <li key={link.path}>
            <button
              className={`nav-link text-base ${location.pathname.startsWith(link.path) ? "text-accent2 underline underline-offset-4 font-bold" : "text-white/90"}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          </li>
        ))}
          {/* CTA Button */}
          <li>
            <button
              onClick={() => navigate("/contact")}
              className="cta-btn ml-2 shadow-xl"
            >
              Book Demo
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("/auth")}
              className="nav-link text-white/70"
            >
              Login
            </button>
          </li>
      </ul>
    </nav>
  );
};

export default StreamlinedNavigation;
