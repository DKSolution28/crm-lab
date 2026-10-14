import type { Metadata } from "next";
import { connection } from "next/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboard } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard | CRM Lab" };

export default async function DashboardPage() {
  await connection();
  const snapshot = await getDashboard();
  return <DashboardView snapshot={snapshot} />;
}
