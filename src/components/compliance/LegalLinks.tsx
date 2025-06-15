
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Dynamically fetch and show privacy/terms links; fallback to sample if not set
export const LegalLinks: React.FC = () => {
  const [links, setLinks] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    let active = true;
    const fetchLinks = async () => {
      const { data, error } = await supabase
        .from("legal_disclosures")
        .select("name,url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (!error && data && active) setLinks(data as any);
    };
    fetchLinks();
    return () => {
      active = false;
    };
  }, []);

  if (links.length === 0) {
    return (
      <>
        <a
          href="https://your-dealership.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline ml-2"
        >
          Privacy Policy
        </a>
        {" & "}
        <a
          href="https://your-dealership.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Terms of Service
        </a>
      </>
    );
  }
  return (
    <>
      {links.map((l, idx) => (
        <React.Fragment key={l.url}>
          {idx > 0 && " & "}
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {l.name}
          </a>
        </React.Fragment>
      ))}
    </>
  );
};
