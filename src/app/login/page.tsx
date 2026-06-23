"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid username or password");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4 bg-[#f5f8ff]">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border-t-4 border-[#ed8022]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-[Poppins] text-[#123e7f]">MERDIC Construction</h1>
          <p className="text-gray-500 mt-2">Login to your timesheet</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ed8022]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#ed8022] hover:bg-[#ff6d00] text-white font-medium rounded-md transition-colors mt-4"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
