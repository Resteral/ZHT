import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CreateUserPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create User</h1>
          <p className="text-muted-foreground">Add a new user to the platform</p>
        </div>
        <Link href="/admin/users">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set up the user's profile and account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <input type="text" placeholder="Enter first name..." className="w-full p-3 border rounded-md" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <input type="text" placeholder="Enter last name..." className="w-full p-3 border rounded-md" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <input type="text" placeholder="Enter username..." className="w-full p-3 border rounded-md" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <input type="email" placeholder="Enter email address..." className="w-full p-3 border rounded-md" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <input type="password" placeholder="Enter password..." className="w-full p-3 border rounded-md" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <input type="password" placeholder="Confirm password..." className="w-full p-3 border rounded-md" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gaming Profile</CardTitle>
              <CardDescription>Set up the user's gaming preferences and statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Favorite Game</label>
                <select className="w-full p-3 border rounded-md">
                  <option>Select favorite game...</option>
                  <option>Counter Strike</option>
                  <option>Rainbow Six Siege</option>
                  <option>Call of Duty</option>
                  <option>Zealot Hockey</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Starting ELO Rating</label>
                  <input type="number" placeholder="1200" className="w-full p-3 border rounded-md" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Starting Wallet Balance</label>
                  <input type="number" placeholder="0.00" className="w-full p-3 border rounded-md" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  placeholder="User bio and gaming background..."
                  rows={3}
                  className="w-full p-3 border rounded-md"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions & Role</CardTitle>
              <CardDescription>Set user permissions and access level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">User Role</label>
                <select className="w-full p-3 border rounded-md">
                  <option>Player</option>
                  <option>Captain</option>
                  <option>Moderator</option>
                  <option>Admin</option>
                  <option>Super Admin</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Permissions</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="can-bet" className="rounded" />
                    <label htmlFor="can-bet" className="text-sm">
                      Can place bets
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="can-create-tournaments" className="rounded" />
                    <label htmlFor="can-create-tournaments" className="text-sm">
                      Can create tournaments
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="can-moderate" className="rounded" />
                    <label htmlFor="can-moderate" className="text-sm">
                      Can moderate content
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="can-manage-users" className="rounded" />
                    <label htmlFor="can-manage-users" className="text-sm">
                      Can manage users
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="email-verified" className="rounded" />
                <label htmlFor="email-verified" className="text-sm">
                  Mark email as verified
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="send-welcome" className="rounded" />
                <label htmlFor="send-welcome" className="text-sm">
                  Send welcome email
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Preview</CardTitle>
              <CardDescription>Preview how the user profile will appear</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Username</h3>
                <Badge variant="secondary" className="mb-2">
                  Player
                </Badge>
                <p className="text-sm text-muted-foreground">ELO: 1200</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">Not set</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wallet:</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Favorite Game:</span>
                  <span className="font-medium">Not selected</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                <User className="h-4 w-4 mr-2" />
                Create User
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                Save as Draft
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Mail className="h-4 w-4 mr-2" />
                Create & Send Invite
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
