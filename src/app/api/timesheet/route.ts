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
  const { date, startTime, endTime, pauseTime, targetHours, workHours, diffHours, isVacation, isSick, isConfirmed, remarks, userId } = body;

  const targetUserId = userId || (session.user as any).id;

  // Only admin can edit other users' timesheets
  if (targetUserId !== (session.user as any).id && (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entry = await prisma.timesheetEntry.upsert({
    where: {
      userId_date: {
        userId: targetUserId,
        date: date,
      },
    },
    update: {
      startTime,
      endTime,
      pauseTime,
      targetHours,
      workHours,
      diffHours,
      isVacation,
      isSick,
      isConfirmed,
      remarks,
    },
    create: {
      userId: targetUserId,
      date,
      startTime,
      endTime,
      pauseTime,
      targetHours,
      workHours,
      diffHours,
      isVacation,
      isSick,
      isConfirmed,
      remarks,
    },
  });

  return NextResponse.json(entry);
}
