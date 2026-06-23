"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CataliftLogo } from "@/components/CataliftLogo";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthShellProps {
  active: "login" | "register";
  children: ReactNode;
}

/**
 * Branded auth card — ports v1's auth look onto v2's backend (G-19).
 *
 * Sky gradient backdrop, CataliftLogo, and a Login/Register tab toggle
 * with a sky-500 active state. The tabs navigate between the `/login`
 * and `/signup` routes (each route renders its own form as children).
 */
export function AuthShell({ active, children }: AuthShellProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-100 via-sky-50 to-white px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <CataliftLogo size="lg" />
        </div>

        <div className="rounded-[14px] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-500/10">
          <Tabs
            value={active}
            onValueChange={(value) =>
              router.push(value === "login" ? "/login" : "/signup")
            }
          >
            <TabsList className="grid w-full grid-cols-2 bg-sky-50">
              <TabsTrigger
                value="login"
                className="text-gray-600 data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="text-gray-600 data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Register
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
