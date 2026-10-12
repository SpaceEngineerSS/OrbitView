import Link from "next/link";
import { LogoMark } from "@/components/common/Logo";

export default function NotFound() {
    return (
        <main className="min-h-dvh flex items-center justify-center p-6 bg-bg">
            <div className="w-full max-w-sm border border-rule bg-surface">
                <div className="flex items-center gap-2 h-10 px-3 border-b border-rule">
                    <LogoMark />
                    <span className="label">404</span>
                </div>
                <div className="p-4 text-[13px] text-dim leading-relaxed">
                    <p className="text-ink mb-1">No object at this address.</p>
                    <p lang="tr">Bu adreste bir şey yok.</p>
                    <Link href="/" className="inline-flex items-center h-8 px-3 mt-4 border border-rule-strong text-ink hover:border-dim">
                        OrbitView →
                    </Link>
                </div>
            </div>
        </main>
    );
}
