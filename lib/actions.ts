"use server"

import { createClient } from "@/lib/supabase/server"
import bcrypt from "bcryptjs"

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const username = formData.get("username")?.toString() || ""
  const password = formData.get("password")?.toString() || ""

  if (!username || !password) {
    return { error: "Username and password are required" }
  }

  const supabase = await createClient()

  try {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single()

    if (userError || !userData) {
      return { error: "Invalid username or password" }
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userData.password_hash)
    if (!passwordMatch) {
      return { error: "Invalid username or password" }
    }

    const userForAuth = {
      ...userData,
      id: userData.account_id || userData.username, // Use account_id as primary ID
      uuid: userData.id, // Store actual UUID for database operations
    }

    return { success: true, user: userForAuth }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "Login failed. Please try again." }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const username = formData.get("username")?.toString() || ""
  const password = formData.get("password")?.toString() || ""
  const accountId = formData.get("accountId")?.toString() || null

  if (!username || !password) {
    return { error: "Username and password are required" }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long" }
  }

  const supabase = await createClient()

  try {
    // Check if username already exists
    const { data: existingUser } = await supabase.from("users").select("id").eq("username", username).single()

    if (existingUser) {
      return { error: "Username already exists" }
    }

    if (accountId) {
      const { data: existingAccountId } = await supabase.from("users").select("id").eq("account_id", accountId).single()
      if (existingAccountId) {
        return { error: "Account ID already exists" }
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { data: newUser, error: profileError } = await supabase
      .from("users")
      .insert({
        username: username,
        password_hash: passwordHash,
        account_id: accountId,
        email: null,
        balance: 25.0,
        elo_rating: 1200,
        wins: 0,
        losses: 0,
        total_games: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileError) {
      console.error("Profile creation error:", profileError)
      return { error: `Signup failed: ${profileError.message}` }
    }

    const { error: walletError } = await supabase.from("user_wallets").insert({
      user_id: newUser.id,
      balance: 25.0,
      total_deposited: 25.0,
      total_winnings: 0,
      total_wagered: 0,
      total_withdrawn: 0,
    })

    if (walletError) {
      console.error("Wallet creation error:", walletError)
      // Continue anyway, wallet can be created later
    }

    const userForAuth = {
      ...newUser,
      id: newUser.account_id || newUser.username, // Use account_id as primary ID
      uuid: newUser.id, // Store actual UUID for database operations
    }

    return { success: true, user: userForAuth, autoLogin: true }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "Signup failed. Please try again." }
  }
}

export async function updateAccountId(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const userId = formData.get("userId")?.toString() || ""
  const accountId = formData.get("accountId")?.toString() || ""

  if (!userId || !accountId) {
    return { error: "User ID and Account ID are required" }
  }

  if (!/^\d{4,15}$/.test(accountId)) {
    return { error: "Account ID must be 4-15 numbers" }
  }

  const supabase = await createClient()

  try {
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ account_id: accountId })
      .eq("id", userId)
      .select()
      .single()

    if (updateError) {
      console.error("Account ID update error:", updateError)
      return { error: "Failed to update account ID" }
    }

    return { success: true, user: updatedUser }
  } catch (error) {
    console.error("Account ID update error:", error)
    return { error: "Failed to update account ID" }
  }
}

export async function signOut() {
  return { success: true }
}
