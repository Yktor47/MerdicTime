import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const userId = searchParams.get("userId") || (session.user as any).id;

  // Only admin can view other users' timesheets
  if (userId !== (session.user as any).id && (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!month) {
    return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
  }

  const entries = await prisma.timesheetEntry.findMany({
    where: {
      userId: userId,
      date: {
        startsWith: month,
      },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    date, startTime, endTime, pauseTime, targetHours, workHours, diffHours,
    isVacation, vacationConfirmed, isSick, isConfirmed, remarks, userId,
    startLat, startLng, endLat, endLng, clockInTime, clockOutTime
  } = body;

  const targetUserId = userId || (session.user as any).id;

  // Only admin can edit other users' timesheets
  if (targetUserId !== (session.user as any).id && (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin can confirm vacations
  const isAdmin = (session.user as any).role === "ADMIN";
  const finalVacationConfirmed = isAdmin ? (vacationConfirmed ?? false) : false;

  const entryData = {
    startTime,
    endTime,
    pauseTime,
    targetHours,
    workHours,
    diffHours,
    isVacation,
    vacationConfirmed: isVacation ? finalVacationConfirmed : false,
    isSick,
    isConfirmed,
    remarks,
    startLat: startLat ?? null,
    startLng: startLng ?? null,
    endLat: endLat ?? null,
    endLng: endLng ?? null,
    clockInTime: clockInTime ?? null,
    clockOutTime: clockOutTime ?? null,
  };

  const entry = await prisma.timesheetEntry.upsert({
    where: {
      userId_date: {
        userId: targetUserId,
        date: date,
      },
    },
    update: entryData,
    create: {
      userId: targetUserId,
      date,
      ...entryData,
    },
  });

  return NextResponse.json(entry);
}
