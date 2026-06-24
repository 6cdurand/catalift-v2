"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "@/components/layouts/MainLayout";
import { useRequireAuth, upsertProfile } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Gender = "male" | "female" | "other";

/**
 * Client onboarding — v1 `onboarding/client/page.tsx` ported VERBATIM (G-19).
 *
 * SEAM: v1 wrote via the supabaseSync god-file's user-update helper AND a
 * mirrored legacy localStorage write. Both are DROPPED (G-02/G-03,
 * grep-guard-forbidden). The only write is `upsertProfile` (G-01: id =
 * auth.uid(), G-11 await+retry).
 *
 * Persists full_name / gender / height_cm / weight_kg via `upsertProfile`
 * (migration 00006), each scoped to `id = auth.uid()` (G-01, G-11 await+retry).
 */
export default function ClientOnboardingPage() {
  const router = useRouter();
  const { user } = useRequireAuth();

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<Gender>("other");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  // Prefill the display name from the auth profile once the session resolves.
  // React's "adjust state during render when a value changes" pattern — avoids
  // a setState-in-effect cascade. Tracks the user id so it only seeds once.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (user && user.id !== seededFor) {
    setSeededFor(user.id);
    const existing = user.user_metadata?.full_name as string | undefined;
    if (existing) setDisplayName(existing);
  }

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    try {
      await upsertProfile(user.id, {
        fullName: displayName.trim() || undefined,
        gender,
        heightCm: height ? Number(height) : undefined,
        weightKg: weight ? Number(weight) : undefined,
      });
      toast.success("Profile set up! Welcome to Catalift!");
      router.push("/today");
    } catch {
      setSaving(false);
      toast.error("Could not save your profile. Please try again.");
    }
  };

  if (!user) return null;

  return (
    <MainLayout>
      <div className="px-4 py-8 max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Catalift!</h1>
          <p className="text-gray-500 text-sm">
            Let&apos;s set up your profile so your trainer can personalise your program.
          </p>
        </div>

        {/* Form */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Gender</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-700">Height (cm)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Weight (kg)</Label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="70"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-sky-500 hover:bg-sky-600 h-12 text-base"
        >
          {saving ? "Saving…" : "Continue"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <button
          onClick={() => router.push("/today")}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
        >
          Skip for now
        </button>
      </div>
    </MainLayout>
  );
}
