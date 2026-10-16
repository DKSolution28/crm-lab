import Link from "next/link";
import { buttonClasses } from "@/components/ui/modal";

export default function ContactNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-800">This contact does not exist or was deleted.</h2>
      <Link href="/contacts" className={buttonClasses.neutral}>
        Back to Contacts
      </Link>
    </div>
  );
}
