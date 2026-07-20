import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/");
  }

  const currentYear = new Date().getFullYear().toString();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      vacationDaysPerYear: true,
      entries: {
        where: {
          date: { startsWith: currentYear },
          isVacation: true,
        },
        select: {
          vacationConfirmed: true,
        },
      },
    },
  });

  const usersWithVacation = users.map(user => {
    const confirmedDays = user.entries.filter(e => e.vacationConfirmed).length;
    const pendingDays = user.entries.filter(e => !e.vacationConfirmed).length;
    const remainingDays = user.vacationDaysPerYear - confirmedDays;
    return {
      ...user,
      confirmedDays,
      pendingDays,
      remainingDays,
    };
  });

  return (
    <div className="min-h-screen bg-[#f5f8ff] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#123e7f] font-[Poppins]">Admin Bereich</h1>
          <Link href="/" className="px-4 py-2 bg-white text-[#123e7f] rounded shadow-sm hover:bg-gray-50">
            Zurück zum Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#123e7f] text-white">
              <tr>
                <th className="p-4">Benutzername</th>
                <th className="p-4">Rolle</th>
                <th className="p-4 text-center">Urlaub (genehm./gesamt)</th>
                <th className="p-4 text-center">Beantragt</th>
                <th className="p-4 text-center">Verbleibend</th>
                <th className="p-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {usersWithVacation.map(user => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-[#f5f8ff]">
                  <td className="p-4 font-medium">{user.username}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-green-600">{user.confirmedDays}</span>
                    <span className="text-gray-400"> / </span>
                    <span className="font-medium text-gray-600">{user.vacationDaysPerYear}</span>
                  </td>
                  <td className="p-4 text-center">
                    {user.pendingDays > 0 ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                        {user.pendingDays} ⏳
                      </span>
                    ) : (
                      <span className="text-gray-300">–</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-bold ${user.remainingDays > 0 ? 'text-[#123e7f]' : 'text-red-600'}`}>
                      {user.remainingDays}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/admin/${user.id}`} className="text-[#ed8022] hover:underline font-medium text-sm">
                      Zeiten ansehen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
