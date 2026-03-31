"use client";

interface PortalHeaderProps {
  firstName: string;
}

export function PortalHeader({ firstName }: PortalHeaderProps) {
  return (
    <div className="bg-emerald-500 text-white px-4 py-5">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
            <span className="font-bold text-lg">{firstName[0]}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">Welcome back, {firstName}!</h1>
            <p className="text-emerald-100 text-sm">Fresh Path Mobile Detailing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
