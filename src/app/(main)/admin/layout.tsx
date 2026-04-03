"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="text-gray-500">Đang tải...</div>;
  }

  if (session?.user?.role !== "ADMIN") {
    return <div className="text-red-500">Bạn không có quyền truy cập.</div>;
  }

  return <>{children}</>;
}
