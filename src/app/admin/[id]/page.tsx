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
  const [vacationDaysPerYear, setVacationDaysPerYear] = useState<number>(30);
  const [editingVacation, setEditingVacation] = useState(false);
  const [newVacationDays, setNewVacationDays] = useState<number>(30);

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
    const res = await fetch(`/api/user/${userId}`);
    if (res.ok) {
      const data = await res.json();
      setTargetUserName(data.username);
      setVacationDaysPerYear(data.vacationDaysPerYear ?? 30);
      setNewVacationDays(data.vacationDaysPerYear ?? 30);
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

  const handleSaveVacationDays = async () => {
    const res = await fetch(`/api/user/${userId}/vacation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vacationDaysPerYear: newVacationDays }),
    });
    if (res.ok) {
      setVacationDaysPerYear(newVacationDays);
      setEditingVacation(false);
    }
  };

  const handleExport = () => {
    const data = [];
    data.push(["Datum", "Arbeitsbeginn", "Arbeitsende", "Pause", "Soll-Zeit (Min)", "Arbeitszeit (Min)", "Differenz (Min)", "Urlaub", "Urlaub bestätigt", "Krank", "Bestätigt", "GPS Start", "GPS Ende", "Bemerkungen"]);
    
    entries.forEach(e => {
      const gpsStart = e.startLat && e.startLng ? `${e.startLat},${e.startLng}` : "";
      const gpsEnd = e.endLat && e.endLng ? `${e.endLat},${e.endLng}` : "";
      data.push([
        e.date, e.startTime, e.endTime, e.pauseTime, 
        e.targetHours, e.workHours, e.diffHours, 
        e.isVacation ? "Ja" : "Nein",
        e.vacationConfirmed ? "Ja" : "Nein",
        e.isSick ? "Ja" : "Nein",
        e.isConfirmed ? "Ja" : "Nein",
        gpsStart, gpsEnd,
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

  // GPS entries for the current month
  const gpsEntries = entries.filter(e => e.startLat || e.endLat);

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
        {/* Vacation Quota Editor */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border-t-4 border-[#16a34a] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🏖️</span>
            <div>
              <div className="text-sm font-bold text-[#123e7f] uppercase">Urlaubskontingent / Jahr</div>
              {editingVacation ? (
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" value={newVacationDays} min={0}
                    onChange={(e) => setNewVacationDays(parseInt(e.target.value) || 0)}
                    className="w-20 p-1 border border-gray-300 rounded text-black font-bold text-lg text-center" />
                  <span className="text-gray-500">Tage</span>
                  <button onClick={handleSaveVacationDays}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600">Speichern</button>
                  <button onClick={() => { setEditingVacation(false); setNewVacationDays(vacationDaysPerYear); }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300">Abbrechen</button>
                </div>
              ) : (
                <div className="text-2xl font-black text-[#123e7f] font-[Poppins]">{vacationDaysPerYear} Tage</div>
              )}
            </div>
          </div>
          {!editingVacation && (
            <button onClick={() => setEditingVacation(true)}
              className="px-3 py-1 bg-[#ed8022] text-white rounded text-sm font-medium hover:bg-[#ff6d00]">
              Bearbeiten
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <input type="month" value={format(currentMonth, "yyyy-MM")}
            onChange={(e) => setCurrentMonth(new Date(e.target.value))}
            className="p-3 border-2 border-[#123e7f] rounded text-[#123e7f] font-black text-xl focus:ring-2 focus:ring-[#ed8022] outline-none bg-white shadow-sm" />
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

        {/* GPS Log */}
        {gpsEntries.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-8 border-t-4 border-gray-300">
            <h3 className="text-sm font-bold text-[#123e7f] uppercase mb-3 flex items-center gap-2">
              📍 GPS-Protokoll ({gpsEntries.length} Einträge)
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {gpsEntries.map(e => (
                <div key={e.id} className="flex items-center gap-4 text-sm border-b border-gray-50 pb-2">
                  <span className="font-medium text-gray-700 min-w-[80px]">{e.date}</span>
                  {e.startLat && e.startLng && (
                    <a href={`https://www.google.com/maps?q=${e.startLat},${e.startLng}`} target="_blank" rel="noopener"
                      className="text-green-600 hover:underline text-xs">
                      📍 Start: {e.startLat.toFixed(4)}, {e.startLng.toFixed(4)}
                    </a>
                  )}
                  {e.endLat && e.endLng && (
                    <a href={`https://www.google.com/maps?q=${e.endLat},${e.endLng}`} target="_blank" rel="noopener"
                      className="text-red-600 hover:underline text-xs">
                      📍 Ende: {e.endLat.toFixed(4)}, {e.endLng.toFixed(4)}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
