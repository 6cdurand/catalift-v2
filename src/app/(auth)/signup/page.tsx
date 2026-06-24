"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Scale,
  Ruler,
  Calendar,
  Heart,
  Smartphone,
  CreditCard,
  Check,
} from "lucide-react";
import { getBrowserClient } from "@/lib/supabase";
import { AuthShell, upsertProfile } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Step = "credentials" | "profile" | "goals" | "connections";
type Gender = "male" | "female" | "other";

/**
 * Signup — v1 `auth/page.tsx` register tab (the 4-step wizard) ported
 * VERBATIM (G-19): credentials → profile → goals → connections, same fields,
 * same step machine, same copy.
 *
 * SEAM (only change): v1 `useAuthStore().register()` (localStorage +
 * client-side password hashing) → `getBrowserClient().auth.signUp()` + a
 * scoped `public.users` write (G-01: id = auth.uid()).
 *
 * SCOPE (Option B): username / gender / height / weight columns do not exist
 * on `public.users` yet, so the wizard RENDERS them (visual parity) but only
 * full_name / role / date_of_birth are persisted. See `// TODO(auth-schema-followon)`.
 */
export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [isTrainer, setIsTrainer] = useState(false);

  const [onboardConnections, setOnboardConnections] = useState<
    Record<string, boolean>
  >({
    appleHealth: false,
    googleHealth: false,
    calendar: false,
    stripe: false,
  });

  const handleNextStep = () => {
    if (step === "credentials") {
      if (!email || !username || !password) {
        toast.error("Please fill in all fields");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      setStep("profile");
    } else if (step === "profile") {
      setStep("goals");
    } else if (step === "goals") {
      setStep("connections");
    }
  };

  const handlePrevStep = () => {
    if (step === "profile") setStep("credentials");
    else if (step === "goals") setStep("profile");
    else if (step === "connections") setStep("goals");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const role = isTrainer ? "trainer" : "client";
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // `mode` is a convenience mirror only. Authorization gating reads
        // `public.users.role` (G-20), never this metadata value.
        data: { mode: role, full_name: displayName || username },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setIsLoading(false);
      toast.error(error.message || "Could not create account");
      return;
    }

    // Email confirmation OFF → signUp returns a live session. Persist the
    // profile now (G-01 / G-11 await+retry). With confirmation ON there is no
    // session yet; the row is created by the `handle_new_user` trigger and the
    // user lands here again post-confirm.
    //
    // TODO(auth-schema-followon): persist username / gender / height / weight /
    // healthConnections once those columns + tables exist. They are collected
    // above for visual parity but intentionally NOT written this wave.
    if (data.session && data.user) {
      try {
        await upsertProfile(data.user.id, {
          fullName: displayName || username,
          role,
          dateOfBirth,
        });
      } catch {
        // Already logged + retried in upsertProfile; non-blocking for nav.
      }
      toast.success("Account created successfully!");
      router.push("/today");
      router.refresh();
      return;
    }

    setIsLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AuthShell active="register">
        <div className="space-y-4 text-center py-2">
          <CardTitle className="text-white">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link. Click it to verify your
            account, then sign in.
          </CardDescription>
          <Button
            className="w-full bg-sky-500 hover:bg-sky-600 text-white"
            onClick={() => router.push("/login")}
          >
            Back to Sign In
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell active="register">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-white">
          {step === "credentials" && "Create Account"}
          {step === "profile" && "About You"}
          {step === "goals" && "Your Path"}
          {step === "connections" && "Connect Your Data"}
        </CardTitle>
        <CardDescription>
          {step === "credentials" && "Start your fitness journey today"}
          {step === "profile" && "Help us personalize your experience"}
          {step === "goals" && "Choose your path"}
          {step === "connections" && "Optional — connect health & services"}
        </CardDescription>
        {/* Progress indicator */}
        <div className="flex gap-2 mt-4">
          {["credentials", "profile", "goals", "connections"].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                ["credentials", "profile", "goals", "connections"].indexOf(
                  step,
                ) >= i
                  ? "bg-sky-500"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <form
          onSubmit={
            step === "connections"
              ? handleRegister
              : (e) => {
                  e.preventDefault();
                  handleNextStep();
                }
          }
        >
          {step === "credentials" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="fitnessfan123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-gray-300">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  required
                />
              </div>
            </div>
          )}

          {step === "profile" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-gray-300">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Gender</Label>
                {/* TODO(auth-schema-followon): no `gender` column yet — collected for parity, not persisted. */}
                <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                  <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    <SelectItem value="male" className="!text-gray-900 focus:!text-gray-900 focus:!bg-gray-100">Male</SelectItem>
                    <SelectItem value="female" className="!text-gray-900 focus:!text-gray-900 focus:!bg-gray-100">Female</SelectItem>
                    <SelectItem value="other" className="!text-gray-900 focus:!text-gray-900 focus:!bg-gray-100">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-gray-300">Date of Birth</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900 pl-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-gray-300">Height (cm)</Label>
                  {/* TODO(auth-schema-followon): no `height` column yet — not persisted. */}
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="height"
                      type="number"
                      placeholder="175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-gray-300">Weight (kg)</Label>
                  {/* TODO(auth-schema-followon): no `weight` column yet — not persisted. */}
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="weight"
                      type="number"
                      placeholder="70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "goals" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Are you a Personal Trainer?</h3>
                    <p className="text-sm text-gray-300 mt-1">
                      Access trainer tools to manage clients
                    </p>
                  </div>
                  <Switch
                    checked={isTrainer}
                    onCheckedChange={setIsTrainer}
                    aria-label="Are you a Personal Trainer?"
                    className="data-[state=checked]:bg-sky-500"
                  />
                </div>
              </div>

              {isTrainer && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-rose-400 text-sm">
                    <strong>Trainer Mode</strong> unlocks client management, workout assignment,
                    calendar scheduling, and progress tracking features.
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <h4 className="font-semibold text-sky-400 mb-2">What you&apos;ll get:</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    Advanced workout logging &amp; tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    Strength ratings &amp; medals system
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    Social features &amp; community
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    Weekly progress reports
                  </li>
                </ul>
              </div>
            </div>
          )}

          {step === "connections" && (
            <div className="space-y-3">
              {/* TODO(auth-schema-followon): healthConnections not persisted (healthData flag off, no column). */}
              <p className="text-xs text-gray-500 mb-2">
                Connect now or skip — you can always change this in Settings later.
              </p>

              <button
                type="button"
                onClick={() => setOnboardConnections((c) => ({ ...c, appleHealth: !c.appleHealth }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  onboardConnections.appleHealth
                    ? "bg-red-500/10 border-red-500/40"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-100 text-sm">Apple Health</p>
                  <p className="text-[11px] text-gray-400">Steps, calories, heart rate, sleep</p>
                </div>
                {onboardConnections.appleHealth && <Check className="w-5 h-5 text-red-400" />}
              </button>

              <button
                type="button"
                onClick={() => setOnboardConnections((c) => ({ ...c, googleHealth: !c.googleHealth }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  onboardConnections.googleHealth
                    ? "bg-green-500/10 border-green-500/40"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-100 text-sm">Google / Samsung Health</p>
                  <p className="text-[11px] text-gray-400">Steps, calories, heart rate</p>
                </div>
                {onboardConnections.googleHealth && <Check className="w-5 h-5 text-green-400" />}
              </button>

              <button
                type="button"
                onClick={() => setOnboardConnections((c) => ({ ...c, calendar: !c.calendar }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  onboardConnections.calendar
                    ? "bg-blue-500/10 border-blue-500/40"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-100 text-sm">Calendar</p>
                  <p className="text-[11px] text-gray-400">Sync workouts to your phone calendar</p>
                </div>
                {onboardConnections.calendar && <Check className="w-5 h-5 text-blue-400" />}
              </button>

              {isTrainer && (
                <button
                  type="button"
                  onClick={() => setOnboardConnections((c) => ({ ...c, stripe: !c.stripe }))}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    onboardConnections.stripe
                      ? "bg-purple-500/10 border-purple-500/40"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-100 text-sm">Stripe</p>
                    <p className="text-[11px] text-gray-400">Accept payments from clients</p>
                  </div>
                  {onboardConnections.stripe && <Check className="w-5 h-5 text-purple-400" />}
                </button>
              )}

              <p className="text-[11px] text-gray-600 text-center pt-1">
                Real-time sync available when the native app is installed
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step !== "credentials" && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="flex-1 border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 bg-sky-500 hover:bg-sky-600 text-white"
              disabled={isLoading}
            >
              {step === "connections"
                ? isLoading
                  ? "Creating..."
                  : "Create Account"
                : "Continue"}
              {step !== "connections" && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </AuthShell>
  );
}
