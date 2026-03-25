"use client"

import React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Trophy, Zap, Users, Shield, Award, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface IntelModalProps {
    isOpen: boolean
    onClose: () => void
}

export const IntelModal: React.FC<IntelModalProps> = ({ isOpen, onClose }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-black/90 border-white/10 backdrop-blur-2xl text-white rounded-[2rem] overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                
                <DialogHeader className="p-6 md:p-10">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-black italic uppercase text-[10px] tracking-widest px-3">
                            Classified Intel
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Protocol v6.2.0</span>
                    </div>
                    <DialogTitle className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                        Strategic <span className="text-primary text-5xl flex items-center gap-4">Draft <Zap className="size-8 animate-pulse text-primary fill-primary" /> Guide</span>
                    </DialogTitle>
                    <DialogDescription className="text-lg text-muted-foreground font-medium">
                        Master the protocols of the TUG Arena. High-stakes matchmaking requires peak tactical awareness.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 md:p-10 pt-0 grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <section className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                                    <Shield className="size-4 text-primary" />
                                </div>
                                <h3 className="font-black italic uppercase tracking-tight text-white">Captain Selection</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                The top two players by ELO ranking are automatically promoted to Command. These leaders are responsible for assembling their strike teams.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                                    <Target className="size-4 text-amber-500" />
                                </div>
                                <h3 className="font-black italic uppercase tracking-tight text-white">Strategic Initiative</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                The 2nd highest ELO captain earns the **Strategic Initiative**. Choose to strike first with the #1 pick, or pass to secure the #3 and #4 picks.
                            </p>
                        </section>
                    </div>

                    <div className="space-y-6">
                        <section className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                    <Award className="size-4 text-green-500" />
                                </div>
                                <h3 className="font-black italic uppercase tracking-tight text-white">Bounty Allocation</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Entry fees pool into the **Bounty**. Winning teams divide the spoils instantly. TUG retains a minimal 10% operational protocol fee.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <div className="flex items-center gap-3 text-red-500">
                                <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30">
                                    <Users className="size-4" />
                                </div>
                                <h3 className="font-black italic uppercase tracking-tight">Arena Rules</h3>
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 font-medium italic">
                                <li>Failure to Ready results in a 15-minute blacklisting.</li>
                                <li>The Captain's decision is final in the Draft.</li>
                                <li>Collusion will result in permanent termination.</li>
                            </ul>
                        </section>
                    </div>
                </div>

                <div className="p-6 md:p-10 pt-0 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase italic tracking-widest text-sm rounded-xl border border-white/10 transition-all"
                    >
                        Intel Acknowledged
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
