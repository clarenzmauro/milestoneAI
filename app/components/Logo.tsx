import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <span className="font-bold text-black text-lg">Milestone<span className="text-black font-extrabold">.AI</span></span>
    </div>
  );
} 