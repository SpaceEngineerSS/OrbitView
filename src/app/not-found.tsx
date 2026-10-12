import Link from "next/link";
import { LogoMark } from "@/components/common/Logo";

export default function NotFound() {
    return (
        <main className="min-h-dvh flex items-center justify-center p-6 bg-bg">
            <div className="w-full max-w-sm rounded-[28px] bg-card shadow-float p-7 text-center">
                <div className="flex justify-center"><LogoMark size={56} /></div>
                <h1 className="mt-4 text-[22px] font-semibold tracking-tight">No object at this address</h1>
                <p lang="tr" className="mt-1 text-[15px] text-ink-2">Bu adreste bir şey yok.</p>
                <Link href="/" className="inline-flex items-center justify-center h-11 px-6 mt-6 rounded-full bg-accent text-on-accent text-[15px] font-semibold">
                    OrbitView
                </Link>
            </div>
        </main>
    );
}
