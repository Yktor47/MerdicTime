"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchEntries = async () => {
    if (!session) return;
    const monthStr = format(currentMonth, "yyyy-MM");
    const res = await fetch(`/api/timesheet?month=${monthStr}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [currentMonth, session]);

  if (status === "loading" || !session) {
    return <div className="p-8 text-center">Loading...</div>;
  }

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
    data.push(["Datum", "Arbeitsbeginn", "Arbeitsende", "Pause", "Soll-Zeit (Min)", "Arbeitszeit (Min)", "Differenz (Min)", "Urlaub", "Bestätigt", "Bemerkungen"]);
    
    entries.forEach(e => {
      data.push([
        e.date, e.startTime, e.endTime, e.pauseTime, 
        e.targetHours, e.workHours, e.diffHours, 
        e.isVacation ? "Ja" : "Nein", 
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
        <div className="flex justify-between items-center mb-6">
          <input 
            type="month" 
            value={format(currentMonth, "yyyy-MM")}
            onChange={(e) => setCurrentMonth(new Date(e.target.value))}
            className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#ed8022] outline-none"
          />
          <button onClick={handleExport} className="px-4 py-2 bg-[#ed8022] hover:bg-[#ff6d00] text-white rounded shadow-sm font-medium transition-colors">
            Excel Export
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border-t-4 border-[#123e7f]">
            <div className="text-sm font-bold uppercase text-[#123e7f]">Gesamtarbeitszeit</div>
            <div className="text-2xl font-bold font-[Poppins]">{formatTime(totalWork)} h</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-t-4 border-[#123e7f]">
            <div className="text-sm font-bold uppercase text-[#123e7f]">Soll-Zeit Monat</div>
            <div className="text-2xl font-bold font-[Poppins]">{formatTime(totalTarget)} h</div>
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
