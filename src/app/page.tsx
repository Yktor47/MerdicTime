"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import Calendar from "@/components/Calendar";
import TimesheetModal from "@/components/TimesheetModal";
import * as XLSX from "xlsx";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Clock state
  const [clockStatus, setClockStatus] = useState<"idle" | "clocked_in" | "clocked_out">("idle");
  const [clockLoading, setClockLoading] = useState(false);
  const [clockMessage, setClockMessage] = useState("");
  const [gpsStatus, setGpsStatus] = useState("");
  const [clockInTimestamp, setClockInTimestamp] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchEntries = useCallback(async () => {
    if (!session) return;
    const monthStr = format(currentMonth, "yyyy-MM");
    const res = await fetch(`/api/timesheet?month=${monthStr}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data);
      
      // Check today's clock status
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const todayEntry = data.find((e: any) => e.date === todayStr);
      if (todayEntry?.clockInTime && todayEntry?.clockOutTime) {
        setClockStatus("clocked_out");
        setClockInTimestamp(todayEntry.clockInTime);
      } else if (todayEntry?.clockInTime) {
        setClockStatus("clocked_in");
        setClockInTimestamp(todayEntry.clockInTime);
      } else {
        setClockStatus("idle");
        setClockInTimestamp(null);
      }
    }
  }, [currentMonth, session]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Elapsed time ticker
  useEffect(() => {
    if (clockStatus !== "clocked_in" || !clockInTimestamp) {
      setElapsedTime("");
      return;
    }

    const tick = () => {
      const start = new Date(clockInTimestamp).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsedTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [clockStatus, clockInTimestamp]);

  if (status === "loading" || !session) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const handleClock = async (action: "in" | "out") => {
    setClockLoading(true);
    setGpsStatus("📍 Standort wird ermittelt...");
    setClockMessage("");

    const getPosition = (): Promise<{ lat: number; lng: number } | null> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setGpsStatus("⚠️ GPS nicht verfügbar");
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsStatus("📍 Standort erfasst");
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {
            setGpsStatus("⚠️ Standort konnte nicht ermittelt werden");
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    };

    const coords = await getPosition();

    const res = await fetch("/api/timesheet/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, lat: coords?.lat, lng: coords?.lng }),
    });

    const data = await res.json();
    
    if (res.ok) {
      setClockMessage(data.message);
      if (action === "in") {
        setClockStatus("clocked_in");
        setClockInTimestamp(data.entry.clockInTime);
      } else {
        setClockStatus("clocked_out");
      }
      fetchEntries();
    } else {
      setClockMessage(data.error || "Fehler");
    }
    setClockLoading(false);
  };

  const handleSaveEntry = async (entry: any) => {
    const res = await fetch("/api/timesheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      setSelectedDate(null);
      fetchEntries();
    }
  };

  const handleExport = () => {
    const data = [];
    data.push(["Datum", "Arbeitsbeginn", "Arbeitsende", "Pause", "Soll-Zeit (Min)", "Arbeitszeit (Min)", "Differenz (Min)", "Urlaub", "Urlaub bestätigt", "Krank", "Bestätigt", "Bemerkungen"]);
    
    entries.forEach(e => {
      data.push([
        e.date, e.startTime, e.endTime, e.pauseTime, 
        e.targetHours, e.workHours, e.diffHours, 
        e.isVacation ? "Ja" : "Nein",
        e.vacationConfirmed ? "Ja" : "Nein",
        e.isSick ? "Ja" : "Nein",
        e.isConfirmed ? "Ja" : "Nein", 
        e.remarks
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stundenzettel");
    XLSX.writeFile(workbook, `Stundenzettel_${format(currentMonth, "yyyy_MM")}.xlsx`);
  };

  const totalWork = entries.reduce((acc, curr) => acc + curr.workHours, 0);
  const totalTarget = entries.reduce((acc, curr) => acc + curr.targetHours, 0);
  const totalDiff = entries.reduce((acc, curr) => acc + curr.diffHours, 0);

  const formatTime = (minutes: number) => {
    const isNegative = minutes < 0;
    const abs = Math.abs(minutes);
    return `${isNegative ? '-' : ''}${Math.floor(abs / 60)}:${String(Math.round(abs % 60)).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f8ff]">
      <header className="bg-[#123e7f] text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold font-[Poppins]">MERDIC Construction</h1>
            <p className="text-sm">Hallo, {session.user?.name}</p>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={() => router.push("/overview")} className="px-3 py-1 bg-[#ed8022] text-white rounded font-medium text-sm hover:bg-[#ff6d00] transition-colors">
              Übersicht
            </button>
            {/* @ts-ignore */}
            {session.user?.role === "ADMIN" && (
              <button onClick={() => router.push("/admin")} className="px-3 py-1 bg-white text-[#123e7f] rounded font-medium text-sm">
                Admin Bereich
              </button>
            )}
            <button onClick={() => signOut()} className="text-sm font-medium hover:underline">Abmelden</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 py-8">
        {/* Clock In/Out Section */}
        <div className="bg-white rounded-xl shadow-md border-t-4 border-[#ed8022] p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-bold text-[#123e7f] font-[Poppins]">Zeiterfassung</h2>
              <p className="text-sm text-gray-500">{format(new Date(), "dd.MM.yyyy")}</p>
              {clockStatus === "clocked_in" && elapsedTime && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500 uppercase font-bold">Arbeitszeit</span>
                  <div className="text-3xl font-black text-[#123e7f] font-[Poppins] tabular-nums">{elapsedTime}</div>
                </div>
              )}
              {clockStatus === "clocked_out" && (
                <div className="mt-2 text-sm text-green-600 font-medium">✅ Arbeit für heute beendet</div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-3">
                <button
                  onClick={() => handleClock("in")}
                  disabled={clockLoading || clockStatus === "clocked_in" || clockStatus === "clocked_out"}
                  className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-md ${
                    clockStatus === "idle" && !clockLoading
                      ? "bg-green-500 hover:bg-green-600 hover:scale-105 hover:shadow-lg"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  ▶ Arbeit starten
                </button>
                <button
                  onClick={() => handleClock("out")}
                  disabled={clockLoading || clockStatus !== "clocked_in"}
                  className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-md ${
                    clockStatus === "clocked_in" && !clockLoading
                      ? "bg-red-500 hover:bg-red-600 hover:scale-105 hover:shadow-lg"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  ⏹ Arbeit beenden
                </button>
              </div>
              {gpsStatus && <span className="text-xs text-gray-500">{gpsStatus}</span>}
              {clockMessage && (
                <span className={`text-sm font-medium ${clockMessage.includes("Fehler") || clockMessage.includes("Bereits") || clockMessage.includes("Nicht") ? "text-red-600" : "text-green-600"}`}>
                  {clockMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <input 
            type="month" 
            value={format(currentMonth, "yyyy-MM")}
            onChange={(e) => setCurrentMonth(new Date(e.target.value))}
            className="p-3 border-2 border-[#123e7f] rounded text-[#123e7f] font-black text-xl focus:ring-2 focus:ring-[#ed8022] outline-none bg-white shadow-sm"
          />
          <button onClick={handleExport} className="px-4 py-2 bg-[#ed8022] hover:bg-[#ff6d00] text-white rounded shadow-sm font-medium transition-colors">
            Excel Export
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border-t-4 border-[#123e7f]">
            <div className="text-sm font-bold uppercase text-[#123e7f]">Gesamtarbeitszeit</div>
            <div className="text-3xl font-black text-[#123e7f] font-[Poppins] mt-1">{formatTime(totalWork)} h</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-t-4 border-[#123e7f]">
            <div className="text-sm font-bold uppercase text-[#123e7f]">Soll-Zeit Monat</div>
            <div className="text-3xl font-black text-[#123e7f] font-[Poppins] mt-1">{formatTime(totalTarget)} h</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-t-4 border-[#ed8022]">
            <div className="text-sm font-bold uppercase text-[#ed8022]">Überstunden Monat</div>
            <div className={`text-2xl font-bold font-[Poppins] ${totalDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalDiff > 0 ? "+" : ""}{formatTime(totalDiff)} h
            </div>
          </div>
        </div>

        <Calendar 
          currentMonth={currentMonth} 
          entries={entries} 
          onDayClick={(date) => setSelectedDate(date)} 
        />

        {selectedDate && (
          <TimesheetModal 
            date={selectedDate}
            existingEntry={entries.find(e => e.date === format(selectedDate, "yyyy-MM-dd")) || null}
            onClose={() => setSelectedDate(null)}
            onSave={handleSaveEntry}
            // @ts-ignore
            isAdmin={session.user?.role === "ADMIN"}
          />
        )}
      </main>
    </div>
  );
}
