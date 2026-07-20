"use client";

import { useState, useEffect } from "react";
import { format, getDay } from "date-fns";

interface TimesheetEntry {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  pauseTime: string;
  targetHours: number;
  workHours: number;
  diffHours: number;
  isVacation: boolean;
  vacationConfirmed: boolean;
  isSick: boolean;
  isConfirmed: boolean;
  remarks: string;
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
  clockInTime?: string | null;
  clockOutTime?: string | null;
}

interface TimesheetModalProps {
  date: Date;
  existingEntry: TimesheetEntry | null;
  onClose: () => void;
  onSave: (entry: TimesheetEntry) => void;
  isAdmin?: boolean;
}

export default function TimesheetModal({ date, existingEntry, onClose, onSave, isAdmin = false }: TimesheetModalProps) {
  const formattedDate = format(date, "yyyy-MM-dd");
  
  const dayOfWeek = getDay(date);
  const defaultTarget = (dayOfWeek >= 1 && dayOfWeek <= 4) ? 600 : 0;

  const [formData, setFormData] = useState<TimesheetEntry>({
    date: formattedDate,
    startTime: existingEntry?.startTime || "",
    endTime: existingEntry?.endTime || "",
    pauseTime: existingEntry?.pauseTime || (defaultTarget > 0 ? "00:30" : ""),
    targetHours: existingEntry?.targetHours ?? defaultTarget,
    workHours: existingEntry?.workHours || 0,
    diffHours: existingEntry?.diffHours || 0,
    isVacation: existingEntry?.isVacation || false,
    vacationConfirmed: existingEntry?.vacationConfirmed || false,
    isSick: existingEntry?.isSick || false,
    isConfirmed: existingEntry?.isConfirmed || false,
    remarks: existingEntry?.remarks || "",
    startLat: existingEntry?.startLat ?? null,
    startLng: existingEntry?.startLng ?? null,
    endLat: existingEntry?.endLat ?? null,
    endLng: existingEntry?.endLng ?? null,
    clockInTime: existingEntry?.clockInTime ?? null,
    clockOutTime: existingEntry?.clockOutTime ?? null,
  });

  const [gpsStatus, setGpsStatus] = useState<string>("");
  const [gpsLoading, setGpsLoading] = useState(false);

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
  };

  useEffect(() => {
    let workHours = 0;

    if (formData.isVacation || formData.isSick) {
      workHours = formData.targetHours;
    } else {
      const start = parseTime(formData.startTime);
      const end = parseTime(formData.endTime);
      const pause = parseTime(formData.pauseTime);

      if (formData.startTime && formData.endTime) {
        workHours = end - start - pause;
        if (workHours < 0) workHours = 0;
      }
    }

    const diffHours = workHours - formData.targetHours;

    setFormData(prev => ({
      ...prev,
      workHours,
      diffHours
    }));
  }, [formData.startTime, formData.endTime, formData.pauseTime, formData.isVacation, formData.isSick, formData.targetHours]);

  // Capture GPS when entering manual times
  const captureGps = (type: "start" | "end") => {
    if (!navigator.geolocation) {
      setGpsStatus("GPS nicht verfügbar");
      return;
    }
    setGpsLoading(true);
    setGpsStatus("Standort wird ermittelt...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (type === "start") {
          setFormData(prev => ({ ...prev, startLat: latitude, startLng: longitude }));
        } else {
          setFormData(prev => ({ ...prev, endLat: latitude, endLng: longitude }));
        }
        setGpsStatus(`📍 Standort erfasst`);
        setGpsLoading(false);
      },
      (error) => {
        setGpsStatus("⚠️ Standort nicht verfügbar");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleVacationChange = (checked: boolean) => {
    setFormData({ ...formData, isVacation: checked, isSick: checked ? false : formData.isSick, vacationConfirmed: false });
  };

  const handleSickChange = (checked: boolean) => {
    setFormData({ ...formData, isSick: checked, isVacation: checked ? false : formData.isVacation });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isAbsent = formData.isVacation || formData.isSick;

  const mapsLink = (lat: number | null | undefined, lng: number | null | undefined) => {
    if (!lat || !lng) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-[#123e7f] text-white p-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="font-bold font-[Poppins]">Zeiten für {format(date, "dd.MM.yyyy")}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Vacation / Sick */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isVacation" checked={formData.isVacation}
                onChange={(e) => handleVacationChange(e.target.checked)}
                className="w-4 h-4 accent-[#ed8022]" />
              <label htmlFor="isVacation" className="font-bold text-black">Urlaub</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isSick" checked={formData.isSick}
                onChange={(e) => handleSickChange(e.target.checked)}
                className="w-4 h-4 accent-[#dc2626]" />
              <label htmlFor="isSick" className="font-bold text-black">Krank</label>
            </div>
          </div>

          {/* Vacation Status */}
          {formData.isVacation && (
            <div className={`p-3 rounded-lg text-sm font-medium ${formData.vacationConfirmed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
              {formData.vacationConfirmed ? '✅ Urlaub bestätigt' : '⏳ Urlaub beantragt – wartet auf Admin-Bestätigung'}
            </div>
          )}

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-black mb-1">Arbeitsbeginn</label>
              <input type="time" value={formData.startTime}
                onChange={(e) => { setFormData({...formData, startTime: e.target.value}); }}
                disabled={isAbsent}
                className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022] disabled:bg-gray-200 disabled:text-gray-900" />
              {!isAbsent && formData.startTime && !formData.startLat && (
                <button type="button" onClick={() => captureGps("start")}
                  className="mt-1 text-xs text-[#123e7f] hover:underline flex items-center gap-1">
                  📍 Standort erfassen
                </button>
              )}
              {formData.startLat && formData.startLng && (
                <a href={mapsLink(formData.startLat, formData.startLng)!} target="_blank" rel="noopener"
                  className="mt-1 text-xs text-green-600 hover:underline flex items-center gap-1">
                  📍 Standort anzeigen
                </a>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-1">Arbeitsende</label>
              <input type="time" value={formData.endTime}
                onChange={(e) => { setFormData({...formData, endTime: e.target.value}); }}
                disabled={isAbsent}
                className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022] disabled:bg-gray-200 disabled:text-gray-900" />
              {!isAbsent && formData.endTime && !formData.endLat && (
                <button type="button" onClick={() => captureGps("end")}
                  className="mt-1 text-xs text-[#123e7f] hover:underline flex items-center gap-1">
                  📍 Standort erfassen
                </button>
              )}
              {formData.endLat && formData.endLng && (
                <a href={mapsLink(formData.endLat, formData.endLng)!} target="_blank" rel="noopener"
                  className="mt-1 text-xs text-green-600 hover:underline flex items-center gap-1">
                  📍 Standort anzeigen
                </a>
              )}
            </div>
          </div>

          {/* GPS Status */}
          {gpsStatus && (
            <div className="text-xs text-gray-500 text-center">{gpsStatus}</div>
          )}

          <div>
            <label className="block text-sm font-bold text-black mb-1">Pause</label>
            <input type="time" value={formData.pauseTime}
              onChange={(e) => setFormData({...formData, pauseTime: e.target.value})}
              disabled={isAbsent}
              className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022] disabled:bg-gray-200 disabled:text-gray-900" />
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-1">Bemerkungen</label>
            <textarea value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022]"
              rows={2}></textarea>
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="pt-2 border-t border-gray-200 space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isConfirmed" checked={formData.isConfirmed}
                  onChange={(e) => setFormData({...formData, isConfirmed: e.target.checked})}
                  className="w-4 h-4 accent-[#123e7f]" />
                <label htmlFor="isConfirmed" className="font-medium text-[#123e7f]">Vom Admin bestätigt</label>
              </div>
              {formData.isVacation && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="vacationConfirmed" checked={formData.vacationConfirmed}
                    onChange={(e) => setFormData({...formData, vacationConfirmed: e.target.checked})}
                    className="w-4 h-4 accent-[#16a34a]" />
                  <label htmlFor="vacationConfirmed" className="font-medium text-green-700">Urlaub genehmigen</label>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-black font-bold hover:bg-gray-200 rounded-md">Abbrechen</button>
            <button type="submit" className="px-4 py-2 bg-[#ed8022] hover:bg-[#ff6d00] text-white font-medium rounded-md">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}
