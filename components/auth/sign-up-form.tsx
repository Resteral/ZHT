"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { signUp } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-medium rounded-lg h-[60px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating account...
        </>
      ) : (
        "Create Account & Start Playing"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [state, formAction] = useActionState(signUp, null)

  useEffect(() => {
    if (state?.success && state?.user && state?.autoLogin) {
      login(state.user)
      router.push("/")
    }
  }, [state, login, router])

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Join the League</h1>
        <p className="text-lg text-slate-100">Start with $25 • Earn $100 per ELO game</p>
      </div>

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded">{state.error}</div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Username *
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              placeholder="Choose your username"
              className="bg-[#1c1c1c] border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password *
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Create a secure password"
              className="bg-[#1c1c1c] border-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="accountId" className="block text-sm font-medium text-gray-300">
              Account ID (Optional)
            </label>
            <Input
              id="accountId"
              name="accountId"
              type="text"
              placeholder="123456789 (can be added later)"
              className="bg-[#1c1c1c] border-gray-800 text-white placeholder:text-gray-500 font-mono"
            />
            <p className="text-xs text-gray-500">Enter your account ID (4-15 numbers) or add it later in settings</p>
          </div>
        </div>

        <SubmitButton />

        <div className="text-center text-slate-100">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-white hover:underline">
            Sign in here
          </Link>
        </div>
      </form>
    </div>
  )
}
