import Link from "next/link";
import { buttonClasses } from "@/components/ui/modal";

export default function LeadNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-800">This lead does not exist or was deleted.</h2>
      <Link href="/leads" className={buttonClasses.neutral}>
        Back to Leads
      </Link>
    </div>
  );
}
