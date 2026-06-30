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
  const year = searchParams.get("year") || new Date().getFullYear().toString();
  const userId = (session.user as any).id;

  const entries = await prisma.timesheetEntry.findMany({
    where: {
      userId: userId,
      date: {
        startsWith: year,
      },
    },
  });

  // Build monthly breakdown
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthStr = `${year}-${String(i + 1).padStart(2, "0")}`;
    const monthEntries = entries.filter((e) => e.date.startsWith(monthStr));

    const vacationDays = monthEntries.filter((e) => e.isVacation).length;
    const sickDays = monthEntries.filter((e) => (e as any).isSick).length;
    const overtimeMinutes = monthEntries.reduce((acc, e) => acc + e.diffHours, 0);
    const workMinutes = monthEntries.reduce((acc, e) => acc + e.workHours, 0);
    const targetMinutes = monthEntries.reduce((acc, e) => acc + e.targetHours, 0);

    return {
      month: i + 1,
      monthLabel: monthStr,
      vacationDays,
      sickDays,
      overtimeMinutes,
      workMinutes,
      targetMinutes,
    };
  });

  const totalVacationDays = months.reduce((acc, m) => acc + m.vacationDays, 0);
  const totalSickDays = months.reduce((acc, m) => acc + m.sickDays, 0);
  const totalOvertimeMinutes = months.reduce((acc, m) => acc + m.overtimeMinutes, 0);
  const totalWorkMinutes = months.reduce((acc, m) => acc + m.workMinutes, 0);
  const totalTargetMinutes = months.reduce((acc, m) => acc + m.targetMinutes, 0);

  return NextResponse.json({
    year,
    months,
    totals: {
      vacationDays: totalVacationDays,
      sickDays: totalSickDays,
      overtimeMinutes: totalOvertimeMinutes,
      workMinutes: totalWorkMinutes,
      targetMinutes: totalTargetMinutes,
    },
  });
}
