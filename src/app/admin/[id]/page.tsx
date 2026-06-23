"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import Calendar from "@/components/Calendar";
import TimesheetModal from "@/components/TimesheetModal";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function AdminUserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [targetUserName, setTargetUserName] = useState<string>("Mitarbeiter");

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && (session.user as any)?.role !== "ADMIN")) {
      router.push("/");
    }
  }, [status, router, session]);

  const fetchEntries = async () => {
    if (!session || !userId) return;
    const monthStr = format(currentMonth, "yyyy-MM");
    const res = await fetch(`/api/timesheet?month=${monthStr}&userId=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data);
    }
  };

  const fetchUser = async () => {
    // We can fetch user details from a new API, but for now we just show "Mitarbeiter" or we can fetch it via an API.
    // Let's create a quick API or just fetch the timesheets and show.
    const res = await fetch(`/api/user/${userId}`);
    if (res.ok) {
      const data = await res.json();
      setTargetUserName(data.username);
    }
  };

  useEffect(() => {
    fetchEntries();
    if (userId) fetchUser();
  }, [currentMonth, session, userId]);

  if (status === "loading" || !session) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const handleSaveEntry = async (entry: any) => {
    const entryWithUserId = { ...entry, userId };
    const res = await fetch("/api/timesheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryWithUserId),
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
    XLSX.utils.book_append_sheet(workbook, worksheet, `Zeiten_${targetUserName}`);
    XLSX.writeFile(workbook, `Stundenzettel_${targetUserName}_${format(currentMonth, "yyyy_MM")}.xlsx`);
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
            <h1 className="text-xl font-bold font-[Poppins]">Admin: {targetUserName}</h1>
            <p className="text-sm">Zeiten einsehen & bearbeiten</p>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white text-[#123e7f] rounded shadow-sm text-sm font-medium hover:bg-gray-50">
            Zurück zur Übersicht
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 py-8">
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
            isAdmin={true}
          />
        )}
      </main>
    </div>
  );
}
