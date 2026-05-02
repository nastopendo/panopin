"use client";

import { useEffect } from "react";
import * as Swetrix from "swetrix";

export function SwetrixAnalytics() {
  useEffect(() => {
    const pid = process.env.NEXT_PUBLIC_SWETRIX_PROJECT_ID;
    if (!pid) return;

    Swetrix.init(pid, {
      devMode: process.env.NODE_ENV === "development",
    });
    Swetrix.trackViews();
    Swetrix.trackErrors();
  }, []);

  const pid = process.env.NEXT_PUBLIC_SWETRIX_PROJECT_ID;
  if (!pid) return null;

  return (
    <noscript>
      <img
        src={`https://api.swetrix.com/log/noscript?pid=${pid}`}
        alt=""
        referrerPolicy="no-referrer-when-downgrade"
      />
    </noscript>
  );
}
