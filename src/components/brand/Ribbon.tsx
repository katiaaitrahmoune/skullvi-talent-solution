"use client";

import { motion } from "framer-motion";

// The yellow-to-green swoosh from the skullvi.org hero. Decorative, drawn once on load.
export function Ribbon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="skv-ribbon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgb(var(--accent-500))" />
          <stop offset="0.3" stopColor="rgb(var(--accent-400))" />
          <stop offset="0.6" stopColor="rgb(var(--green-500))" />
          <stop offset="1" stopColor="rgb(var(--green-600))" />
        </linearGradient>
        <filter id="skv-soft" x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      <motion.path
        d="M-20 120 C 120 110, 260 40, 420 40 C 540 40, 560 150, 660 250 C 740 330, 820 280, 930 290 C 1060 300, 1120 360, 1230 420"
        fill="none"
        stroke="url(#skv-ribbon)"
        strokeWidth="26"
        strokeLinecap="round"
        filter="url(#skv-soft)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
    </svg>
  );
}
