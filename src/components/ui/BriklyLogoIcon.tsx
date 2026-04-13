import React from "react";

export function BriklyLogoIcon({ className = "w-8 h-8", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        {/* Left Pillar */}
        <rect fill="currentColor" className="text-construction-blue" x="16" y="14" width="22" height="72" rx="11" />
        {/* Top Loop (Orange representing profit/growth) */}
        <rect fill="currentColor" className="text-construction-orange" x="42" y="14" width="36" height="32" rx="16" />
        {/* Bottom Loop */}
        <rect fill="currentColor" className="text-construction-blue dark:text-gray-300" x="42" y="54" width="46" height="32" rx="16" />
        
        {/* Upward Profit Arrow inside Top Loop to symbolize the 'radar/profit' */}
        <path d="M 52 32 l 6 -6 l 4 4 l 8 -8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 64 22 h 6 v 6" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
