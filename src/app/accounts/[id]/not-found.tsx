import Link from "next/link";
import { buttonClasses } from "@/components/ui/modal";

export default function AccountNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-800">This account does not exist or was deleted.</h2>
      <Link href="/accounts" className={buttonClasses.neutral}>
        Back to Accounts
      </Link>
    </div>
  );
}
