import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { vacationDaysPerYear } = body;

  if (typeof vacationDaysPerYear !== "number" || vacationDaysPerYear < 0) {
    return NextResponse.json({ error: "Invalid vacation days" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { vacationDaysPerYear },
    select: { id: true, username: true, vacationDaysPerYear: true },
  });

  return NextResponse.json(user);
}
