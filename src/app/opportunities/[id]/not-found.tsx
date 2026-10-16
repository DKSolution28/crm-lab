import Link from "next/link";
import { buttonClasses } from "@/components/ui/modal";

export default function OpportunityNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-800">This opportunity does not exist or was deleted.</h2>
      <Link href="/opportunities" className={buttonClasses.neutral}>
        Back to Opportunities
      </Link>
    </div>
  );
}
