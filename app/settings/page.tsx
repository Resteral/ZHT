import { NotificationSettings } from "@/components/profile/notification-settings"
import { PrivacySettings } from "@/components/profile/privacy-settings"
import { ProfileSettings } from "@/components/profile/profile-settings"
import { SecuritySettings } from "@/components/profile/security-settings"
import { DangerZone } from "@/components/profile/danger-zone"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft, User, Shield, Bell, Lock, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
    return (
        <div className="container mx-auto p-4 max-w-5xl space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                    <p className="text-muted-foreground text-sm">Manage your profile, security, and notification preferences.</p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-8">
                <TabsList className="md:w-64 h-auto flex-col bg-transparent gap-2 p-0">
                    <TabsTrigger 
                        value="profile" 
                        className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20"
                    >
                        <User className="size-4" />
                        Profile & Social
                    </TabsTrigger>
                    <TabsTrigger 
                        value="security" 
                        className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20"
                    >
                        <Lock className="size-4" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger 
                        value="privacy" 
                        className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20"
                    >
                        <Shield className="size-4" />
                        Privacy
                    </TabsTrigger>
                    <TabsTrigger 
                        value="notifications" 
                        className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20"
                    >
                        <Bell className="size-4" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger 
                        value="danger" 
                        className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500 border border-transparent data-[state=active]:border-red-500/20 text-red-500/70"
                    >
                        <AlertTriangle className="size-4" />
                        Danger Zone
                    </TabsTrigger>
                </TabsList>

                <div className="flex-1">
                    <TabsContent value="profile" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                        <ProfileSettings />
                    </TabsContent>
                    
                    <TabsContent value="security" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                        <SecuritySettings />
                    </TabsContent>
                    
                    <TabsContent value="privacy" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                        <PrivacySettings />
                    </TabsContent>
                    
                    <TabsContent value="notifications" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                        <NotificationSettings />
                    </TabsContent>

                    <TabsContent value="danger" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                        <DangerZone />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
