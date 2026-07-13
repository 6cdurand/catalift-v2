'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  User,
  Bell,
  Scale,
  Shield,
  ChevronRight,
  Save,
  Link2,
  Dumbbell,
  Heart,
  Smartphone,
  Calendar,
  CreditCard,
  Search,
  Plus,
  X,
} from 'lucide-react';
import { PRIVACY_SETTINGS_ROUTE } from './privacy/helpers';
import { toast } from 'sonner';
import type { WeightUnit } from '@/types';
import { useSession, useUserRole, logout as authLogout, upsertProfile } from '@/features/auth';
import { getBrowserClient } from '@/lib/supabase';
import { getLocalItem, setLocalItem, userScopedKey } from '@/lib/storage';

interface GymEntry {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user: sessionUser, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading } = useUserRole(sessionUser?.id);
  const isTrainer = role === 'trainer';

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>('kg');
  const [exerciseUnit, setExerciseUnit] = useState<WeightUnit>('kg');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  const [gymName, setGymName] = useState('');
  const [gymSearch, setGymSearch] = useState('');
  const [showGymSearch, setShowGymSearch] = useState(false);
  const [gyms, setGyms] = useState<GymEntry[]>([]);

  useEffect(() => {
    if (!sessionUser) return;
    const supabase = getBrowserClient();
    supabase
      .from('users')
      .select('full_name, username, email')
      .eq('id', sessionUser.id)
      .single()
      .then(({ data }: { data: { full_name: string | null; username: string | null; email: string | null } | null }) => {
        if (!data) return;
        setDisplayName(data.full_name || data.username || sessionUser.email?.split('@')[0] || '');
        setPersonalEmail(data.email || sessionUser.email || '');
      });
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser?.id) return;
    const id = sessionUser.id;
    const frame = requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(
          getLocalItem(userScopedKey('gyms', id)) || '[]',
        );
        setGyms(stored);
      } catch {
        setGyms([]);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [sessionUser?.id]);

  const handleSaveProfile = async () => {
    if (!sessionUser) return;
    try {
      await upsertProfile(sessionUser.id, { fullName: displayName });
      // TODO(settings-schema-followon): persist bio, height, weight,
      // preferredUnit, exerciseUnit, isPublicProfile, gymName when those
      // columns exist on public.users. The UI is ported and ready; the
      // schema migration is a separate Class-B ticket.
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('[settings] save profile failed:', err);
      toast.error('Failed to save profile');
    }
  };

  const handleAddGym = (name: string) => {
    if (!name.trim() || !sessionUser) return;
    const newGym: GymEntry = {
      id: `gym-${Date.now()}`,
      name: name.trim(),
      createdBy: sessionUser.id,
      createdAt: new Date().toISOString(),
    };
    const updated = [...gyms, newGym];
    setGyms(updated);
    setLocalItem(userScopedKey('gyms', sessionUser.id), JSON.stringify(updated));
    setGymName(name.trim());
    setGymSearch('');
    setShowGymSearch(false);
  };

  const handleSignOut = async () => {
    try {
      await authLogout();
      router.replace('/login');
    } catch (error) {
      console.error('[settings] logout error:', error);
      window.location.href = '/login';
    }
  };

  const handleDeleteAccount = () => {
    // TODO(account-deletion): v2 has no account-deletion API yet.
    // The UI is ported from v1 for parity; wiring requires a server-side
    // function that deletes the auth user + cascades. Tracked separately.
    toast.error('Account deletion is not yet available. Contact support.');
    setShowDeleteAccountConfirm(false);
  };

  if (sessionLoading || roleLoading) {
    return (
      <div className="px-5 py-24 text-center text-gray-500">Loading settings…</div>
    );
  }

  if (!sessionUser) return null;

  return (
    <>
      <PageHeader
        title="Settings"
        showBack
        action={
          <Button onClick={handleSaveProfile} className="bg-sky-500 hover:bg-sky-600">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        }
      />

      <div className="px-4 py-6 space-y-6">
        {/* Profile Settings */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-400" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-600">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600">Personal Email</Label>
              <Input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
              <p className="text-[11px] text-gray-500">Used for app access links and notifications</p>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600">Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="bg-gray-50 border-gray-200 text-gray-900 min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-600">Height (cm)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">Weight (kg)</Label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="70"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600">Gym</Label>
              {gymName && !showGymSearch ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                    <Dumbbell className="w-4 h-4 text-sky-400" />
                    <span className="text-gray-900 text-sm">{gymName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-gray-900"
                    onClick={() => { setShowGymSearch(true); setGymSearch(gymName); }}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:text-red-400"
                    onClick={() => { setGymName(''); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    value={gymSearch}
                    onChange={(e) => { setGymSearch(e.target.value); setShowGymSearch(true); }}
                    onFocus={() => setShowGymSearch(true)}
                    placeholder="Search or add your gym..."
                    className="bg-gray-50 border-gray-200 text-gray-900"
                  />
                  {showGymSearch && gymSearch.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg z-50 max-h-48 overflow-y-auto shadow-xl">
                      {gyms
                        .filter(g => g.name.toLowerCase().includes(gymSearch.toLowerCase()))
                        .slice(0, 5)
                        .map(g => (
                          <button
                            key={g.id}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-900 flex items-center gap-2"
                            onClick={() => { setGymName(g.name); setGymSearch(''); setShowGymSearch(false); }}
                          >
                            <Dumbbell className="w-3 h-3 text-sky-400" />
                            {g.name}
                          </button>
                        ))}
                      {!gyms.some(g => g.name.toLowerCase() === gymSearch.toLowerCase()) && (
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-sky-500 flex items-center gap-2 border-t border-gray-200"
                          onClick={() => handleAddGym(gymSearch)}
                        >
                          <Plus className="w-3 h-3" />
                          Add &quot;{gymSearch.trim()}&quot;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Connected Services */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-emerald-400" />
              Connected Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Apple Health */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Apple Health</p>
                  <p className="text-xs text-gray-500">Requires iOS app (HealthKit)</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-gray-600 text-gray-300 hover:border-red-500/50 hover:text-red-400"
                onClick={() => toast.info('Apple Health requires the native iOS app (coming soon)')}
              >
                Set Up
              </Button>
            </div>

            {/* Google/Samsung Health */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Google / Samsung Health</p>
                  <p className="text-xs text-gray-500">Requires Android app (Health Connect)</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-gray-600 text-gray-300 hover:border-green-500/50 hover:text-green-400"
                onClick={() => toast.info('Google Health requires the native Android app (coming soon)')}
              >
                Set Up
              </Button>
            </div>

            {/* Calendar */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Google Calendar</p>
                  <p className="text-xs text-gray-500">Sign in to sync bookings & workouts</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-gray-600 text-gray-300 hover:border-blue-500/50 hover:text-blue-400"
                onClick={() => toast.info('Calendar integration coming soon')}
              >
                Sign In
              </Button>
            </div>

            {/* Stripe — trainers only */}
            {isTrainer && (
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Stripe</p>
                    <p className="text-xs text-gray-500">Connect account to accept payments</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-gray-600 text-gray-300 hover:border-purple-500/50 hover:text-purple-400"
                  onClick={() => toast.info('Stripe integration coming soon')}
                >
                  Connect
                </Button>
              </div>
            )}

            <p className="text-xs text-gray-500 text-center pt-1">
              Calendar & Stripe connect via OAuth. Health data requires the native iOS/Android app.
            </p>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-400" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Body Weight Unit</p>
                <p className="text-sm text-gray-500">For your body weight display</p>
              </div>
              <Select value={preferredUnit} onValueChange={(v) => setPreferredUnit(v as WeightUnit)}>
                <SelectTrigger className="w-24 bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lb">lb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator className="bg-gray-200" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Exercise Weight Unit</p>
                <p className="text-sm text-gray-500">For workout exercises display</p>
              </div>
              <Select value={exerciseUnit} onValueChange={(v) => setExerciseUnit(v as WeightUnit)}>
                <SelectTrigger className="w-24 bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lb">lb</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Public Profile</p>
                <p className="text-sm text-gray-500">Anyone can view your profile and stats</p>
              </div>
              <Switch
                checked={isPublicProfile}
                onCheckedChange={setIsPublicProfile}
                className="data-[state=checked]:bg-sky-500"
              />
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500">
                {isPublicProfile
                  ? "Your profile is visible to everyone. Anyone can see your strength ratings and workout stats."
                  : "Your profile is private. Only your trainer and friends can see your strength ratings and workout stats."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive workout summaries, program updates, and reminders via email</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked);
                  // TODO(settings-schema-followon): persist to users.notification_prefs JSONB
                  toast.success(checked ? 'Email notifications enabled' : 'Email notifications disabled');
                }}
                className="data-[state=checked]:bg-sky-500"
              />
            </div>
            <Separator className="bg-gray-200" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive in-app alerts for messages, completed workouts, and updates</p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={(checked) => {
                  setPushNotifications(checked);
                  // TODO(settings-schema-followon): persist to users.notification_prefs JSONB
                  toast.success(checked ? 'Push notifications enabled' : 'Push notifications disabled');
                }}
                className="data-[state=checked]:bg-sky-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* More Options — Privacy & Security */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              className="w-full justify-start h-14 px-4 text-gray-600 hover:bg-gray-50 rounded-none"
              onClick={() => router.push(PRIVACY_SETTINGS_ROUTE)}
              data-testid="settings-privacy-button"
            >
              <Shield className="w-5 h-5 mr-3 text-gray-500" />
              Privacy & Security
              <ChevronRight className="w-5 h-5 ml-auto text-gray-500" />
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              className="w-full justify-start h-14 px-4 text-red-400 hover:bg-red-500/10 rounded-none"
              onClick={handleSignOut}
              data-testid="settings-sign-out"
            >
              <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="bg-white border-red-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              ⚠️ Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => setShowDeleteAccountConfirm(true)}
            >
              Delete My Account
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Permanently delete your account and all associated data
            </p>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-gray-500 text-sm py-4">
          <p>Catalift v2.0.0</p>
          <p className="mt-1">Made with 💪 for fitness enthusiasts</p>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteAccountConfirm}
        onOpenChange={setShowDeleteAccountConfirm}
        title="Delete Account"
        description="Are you sure you want to delete your account? This cannot be undone. All your data will be permanently removed."
        confirmLabel="Delete My Account"
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />
    </>
  );
}
