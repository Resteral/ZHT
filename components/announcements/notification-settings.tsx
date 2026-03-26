import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function NotificationSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="email-notifications" className="text-sm">
          Email Notifications
        </Label>
        <Switch id="email-notifications" defaultChecked />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="push-notifications" className="text-sm">
          Push Notifications
        </Label>
        <Switch id="push-notifications" defaultChecked />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="sms-alerts" className="text-sm">
          SMS Alerts
        </Label>
        <Switch id="sms-alerts" />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="auto-publish" className="text-sm">
          Auto-publish Schedules
        </Label>
        <Switch id="auto-publish" defaultChecked />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="game-reminders" className="text-sm">
          Game Reminders
        </Label>
        <Switch id="game-reminders" defaultChecked />
      </div>
    </div>
  )
}
