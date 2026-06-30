"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TabType = "vacation" | "sick" | "overtime";

interface MonthData {
  month: number;
  monthLabel: string;
  vacationDays: number;
  sickDays: number;
  overtimeMinutes: number;
  workMinutes: number;
  targetMinutes: number;
}

interface OverviewData {
  year: string;
  months: MonthData[];
  totals: {
    vacationDays: number;
    sickDays: number;
    overtimeMinutes: number;
    workMinutes: number;
    targetMinutes: number;
  };
}

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
];

export default function OverviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<TabType>("vacation");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchOverview = async () => {
      if (!session) return;
      setLoading(true);
      const res = await fetch(`/api/timesheet/overview?year=${selectedYear}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      setLoading(false);
    };
    fetchOverview();
  }, [selectedYear, session]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-[#f5f8ff] flex items-center justify-center">
        <div className="animate-pulse text-[#123e7f] font-bold text-lg">Laden...</div>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    const isNegative = minutes < 0;
    const abs = Math.abs(minutes);
    return `${isNegative ? "-" : ""}${Math.floor(abs / 60)}:${String(Math.round(abs % 60)).padStart(2, "0")}`;
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const tabs: { key: TabType; label: string; icon: string; color: string; bgLight: string; borderColor: string }[] = [
    { key: "vacation", label: "Urlaubstage", icon: "🏖️", color: "#16a34a", bgLight: "#f0fdf4", borderColor: "#16a34a" },
    { key: "sick", label: "Krankheitstage", icon: "🤒", color: "#dc2626", bgLight: "#fef2f2", borderColor: "#dc2626" },
    { key: "overtime", label: "Überstunden", icon: "⏱️", color: "#ed8022", bgLight: "#fff7ed", borderColor: "#ed8022" },
  ];

  const activeTabConfig = tabs.find(t => t.key === activeTab)!;

  // Calculate values for the active tab
  const getMonthValue = (month: MonthData): number => {
    switch (activeTab) {
      case "vacation": return month.vacationDays;
      case "sick": return month.sickDays;
      case "overtime": return month.overtimeMinutes;
    }
  };

  const getTotalValue = (): number => {
    if (!data) return 0;
    switch (activeTab) {
      case "vacation": return data.totals.vacationDays;
      case "sick": return data.totals.sickDays;
      case "overtime": return data.totals.overtimeMinutes;
    }
  };

  const formatValue = (value: number): string => {
    if (activeTab === "overtime") {
      return `${formatTime(value)} h`;
    }
    return `${value} ${value === 1 ? "Tag" : "Tage"}`;
  };

  const maxMonthValue = data ? Math.max(...data.months.map(m => Math.abs(getMonthValue(m))), 1) : 1;

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="bg-[#123e7f] text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold font-[Poppins]">MERDIC Construction</h1>
            <p className="text-sm">Übersicht – {session.user?.name}</p>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={() => router.push("/")} className="px-3 py-1 bg-white text-[#123e7f] rounded font-medium text-sm hover:bg-gray-50 transition-colors">
              Zurück zum Dashboard
            </button>
            <button onClick={() => signOut()} className="text-sm font-medium hover:underline">Abmelden</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 py-8">
        {/* Year Selector */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-[#123e7f] font-[Poppins]">Jahresübersicht</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-[#123e7f] font-bold text-lg hover:bg-[#f5f8ff] transition-colors flex items-center justify-center"
            >
              ‹
            </button>
            <div className="px-5 py-2 bg-white rounded-lg shadow-sm border-2 border-[#123e7f] text-[#123e7f] font-black text-xl font-[Poppins] min-w-[100px] text-center">
              {selectedYear}
            </div>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              className="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-[#123e7f] font-bold text-lg hover:bg-[#f5f8ff] transition-colors flex items-center justify-center"
            >
              ›
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            const value = data ? (tab.key === "vacation" ? data.totals.vacationDays : tab.key === "sick" ? data.totals.sickDays : data.totals.overtimeMinutes) : 0;
            const displayValue = tab.key === "overtime" ? `${formatTime(value)} h` : `${value} ${value === 1 ? "Tag" : "Tage"}`;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative p-5 rounded-xl shadow-sm transition-all duration-300 text-left overflow-hidden group ${
                  isActive
                    ? "shadow-lg scale-[1.02]"
                    : "bg-white hover:shadow-md hover:scale-[1.01]"
                }`}
                style={{
                  backgroundColor: isActive ? tab.bgLight : undefined,
                  borderTop: `4px solid ${isActive ? tab.color : "#e5e7eb"}`,
                }}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{ background: `linear-gradient(135deg, ${tab.color}, transparent)` }}
                  />
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{tab.icon}</span>
                    <span className="text-sm font-bold uppercase tracking-wide" style={{ color: isActive ? tab.color : "#6b7280" }}>
                      {tab.label}
                    </span>
                  </div>
                  <div className="text-3xl font-black font-[Poppins]" style={{ color: isActive ? tab.color : "#374151" }}>
                    {loading ? "–" : displayValue}
                  </div>
                  <div className="text-xs mt-1" style={{ color: isActive ? tab.color : "#9ca3af" }}>
                    Gesamt {selectedYear}
                  </div>
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: tab.color }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Detail View */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="animate-pulse text-[#123e7f] font-bold">Daten werden geladen...</div>
          </div>
        ) : data ? (
          <div className="bg-white rounded-xl shadow-md overflow-hidden" style={{ borderTop: `4px solid ${activeTabConfig.color}` }}>
            {/* Chart Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#123e7f] font-[Poppins] flex items-center gap-2">
                  <span>{activeTabConfig.icon}</span>
                  {activeTabConfig.label} – Monatsübersicht
                </h3>
                <div className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: activeTabConfig.bgLight, color: activeTabConfig.color }}>
                  Gesamt: {formatValue(getTotalValue())}
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="px-6 pb-6">
              <div className="flex items-end gap-2 h-[250px] border-b border-gray-200 pb-2">
                {data.months.map((month, i) => {
                  const value = getMonthValue(month);
                  const absValue = Math.abs(value);
                  const barHeight = maxMonthValue > 0 ? (absValue / maxMonthValue) * 100 : 0;
                  const isNegative = value < 0;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar relative">
                      {/* Tooltip */}
                      <div className="absolute -top-8 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
                        {MONTH_NAMES[i]}: {formatValue(value)}
                      </div>
                      
                      {/* Value label */}
                      {value !== 0 && (
                        <div className="text-xs font-bold mb-1 whitespace-nowrap" style={{ color: isNegative ? "#dc2626" : activeTabConfig.color }}>
                          {activeTab === "overtime" ? formatTime(value) : value}
                        </div>
                      )}
                      
                      {/* Bar */}
                      <div
                        className="w-full rounded-t-md transition-all duration-500 ease-out min-h-[2px] group-hover/bar:opacity-80 cursor-pointer"
                        style={{
                          height: `${Math.max(barHeight, value !== 0 ? 4 : 0)}%`,
                          backgroundColor: isNegative ? "#dc2626" : activeTabConfig.color,
                          opacity: value === 0 ? 0.15 : 0.85,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              
              {/* Month Labels */}
              <div className="flex gap-2 mt-2">
                {SHORT_MONTH_NAMES.map((name, i) => (
                  <div key={i} className="flex-1 text-center text-xs font-medium text-gray-500">
                    {name}
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Table */}
            <div className="border-t border-gray-100">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-sm font-bold text-[#123e7f] uppercase tracking-wide">Monat</th>
                    <th className="p-4 text-sm font-bold text-[#123e7f] uppercase tracking-wide text-right">{activeTabConfig.label}</th>
                    {activeTab === "overtime" && (
                      <>
                        <th className="p-4 text-sm font-bold text-[#123e7f] uppercase tracking-wide text-right">Soll-Zeit</th>
                        <th className="p-4 text-sm font-bold text-[#123e7f] uppercase tracking-wide text-right">Ist-Zeit</th>
                      </>
                    )}
                    <th className="p-4 text-sm font-bold text-[#123e7f] uppercase tracking-wide text-right">Kumuliert</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((month, i) => {
                    const value = getMonthValue(month);
                    const cumulative = data.months.slice(0, i + 1).reduce((acc, m) => acc + getMonthValue(m), 0);
                    const hasData = value !== 0;

                    return (
                      <tr key={i} className={`border-b border-gray-50 transition-colors ${hasData ? "hover:bg-[#f5f8ff]" : "text-gray-400"}`}>
                        <td className="p-4 font-medium">
                          <span className="text-gray-800">{MONTH_NAMES[i]}</span>
                        </td>
                        <td className="p-4 text-right font-bold font-[Poppins]" style={{ color: hasData ? (value < 0 ? "#dc2626" : activeTabConfig.color) : "#d1d5db" }}>
                          {formatValue(value)}
                        </td>
                        {activeTab === "overtime" && (
                          <>
                            <td className="p-4 text-right text-gray-600 font-medium">
                              {formatTime(month.targetMinutes)} h
                            </td>
                            <td className="p-4 text-right text-gray-600 font-medium">
                              {formatTime(month.workMinutes)} h
                            </td>
                          </>
                        )}
                        <td className="p-4 text-right font-bold font-[Poppins]" style={{ color: cumulative < 0 ? "#dc2626" : cumulative > 0 ? activeTabConfig.color : "#d1d5db" }}>
                          {formatValue(cumulative)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-gray-50 font-black">
                    <td className="p-4 text-[#123e7f] uppercase text-sm tracking-wide">Gesamt</td>
                    <td className="p-4 text-right text-lg font-[Poppins]" style={{ color: activeTabConfig.color }}>
                      {formatValue(getTotalValue())}
                    </td>
                    {activeTab === "overtime" && (
                      <>
                        <td className="p-4 text-right text-[#123e7f] font-[Poppins]">
                          {formatTime(data.totals.targetMinutes)} h
                        </td>
                        <td className="p-4 text-right text-[#123e7f] font-[Poppins]">
                          {formatTime(data.totals.workMinutes)} h
                        </td>
                      </>
                    )}
                    <td className="p-4 text-right text-lg font-[Poppins]" style={{ color: getTotalValue() < 0 ? "#dc2626" : activeTabConfig.color }}>
                      {formatValue(getTotalValue())}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
