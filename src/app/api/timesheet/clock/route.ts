import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { format, getDay } from "date-fns";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, lat, lng } = body; // action: "in" | "out"

  if (!action || !["in", "out"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const timeStr = format(now, "HH:mm");
  const isoTimestamp = now.toISOString();

  // Default target hours: 10h Mon-Thu
  const dayOfWeek = getDay(now);
  const defaultTarget = (dayOfWeek >= 1 && dayOfWeek <= 4) ? 600 : 0;

  if (action === "in") {
    // Clock in: create or update entry with start time
    const existing = await prisma.timesheetEntry.findUnique({
      where: { userId_date: { userId, date: todayStr } },
    });

    if (existing && existing.clockInTime) {
      return NextResponse.json({ error: "Bereits eingestempelt", entry: existing }, { status: 400 });
    }

    const entry = await prisma.timesheetEntry.upsert({
      where: { userId_date: { userId, date: todayStr } },
      update: {
        startTime: timeStr,
        clockInTime: isoTimestamp,
        startLat: lat ?? null,
        startLng: lng ?? null,
      },
      create: {
        userId,
        date: todayStr,
        startTime: timeStr,
        clockInTime: isoTimestamp,
        startLat: lat ?? null,
        startLng: lng ?? null,
        targetHours: defaultTarget,
        workHours: 0,
        diffHours: -defaultTarget,
        pauseTime: defaultTarget > 0 ? "00:30" : null,
      },
    });

    return NextResponse.json({ message: "Eingestempelt", entry });
  }

  if (action === "out") {
    // Clock out: update entry with end time and calculate hours
    const existing = await prisma.timesheetEntry.findUnique({
      where: { userId_date: { userId, date: todayStr } },
    });

    if (!existing || !existing.clockInTime) {
      return NextResponse.json({ error: "Nicht eingestempelt", entry: existing }, { status: 400 });
    }

    if (existing.clockOutTime) {
      return NextResponse.json({ error: "Bereits ausgestempelt", entry: existing }, { status: 400 });
    }

    // Calculate work hours
    const parseTime = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };

    const startMinutes = parseTime(existing.startTime || timeStr);
    const endMinutes = parseTime(timeStr);
    const pauseMinutes = parseTime(existing.pauseTime || "00:00");
    let workHours = endMinutes - startMinutes - pauseMinutes;
    if (workHours < 0) workHours = 0;
    const diffHours = workHours - (existing.targetHours || 0);

    const entry = await prisma.timesheetEntry.update({
      where: { userId_date: { userId, date: todayStr } },
      data: {
        endTime: timeStr,
        clockOutTime: isoTimestamp,
        endLat: lat ?? null,
        endLng: lng ?? null,
        workHours,
        diffHours,
      },
    });

    return NextResponse.json({ message: "Ausgestempelt", entry });
  }
}
