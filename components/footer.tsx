import Link from "next/link"
import { Gamepad2 } from "lucide-react"

export function Footer() {
    return (
        <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 mt-12">
            <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row px-4">
                <div className="flex items-center gap-2">
                    <Gamepad2 className="h-6 w-6 text-primary" />
                    <p className="text-sm text-muted-foreground leading-loose md:text-left">
                        © {new Date().getFullYear()} TUG E-Sports. All rights reserved.
                    </p>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <Link href="/terms" className="hover:text-foreground hover:underline underline-offset-4 transition-colors">
                        Terms of Service
                    </Link>
                    <Link href="/privacy" className="hover:text-foreground hover:underline underline-offset-4 transition-colors">
                        Privacy Policy
                    </Link>
                    <Link href="/support" className="hover:text-foreground hover:underline underline-offset-4 transition-colors">
                        Support
                    </Link>
                </div>
            </div>
            <div className="container mx-auto mt-4 px-4 text-center text-xs text-muted-foreground/60">
                <p>
                    TUG E-Sports offers skill-based competitions. Not a gambling platform.
                    Must be 18+ to participate in cash contests. Void where prohibited.
                </p>
            </div>
        </footer>
    )
}
