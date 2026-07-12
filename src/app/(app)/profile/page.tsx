'use client';

// Profile screen — verbatim UI port of v1's `app/profile/page.tsx`, rewired to
// v2 data seams. Deferred modules (medals, strength rating, weekly report,
// trainer sessions/payments, social graph) render hidden or empty per the
// feature flags + render-around matrix. Mode switching is a LOCAL view toggle
// only (never writes role) to respect the G-20 role-authority guardrail.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings,
  Trophy,
  Dumbbell,
  Users,
  Calendar,
  Medal,
  ChevronRight,
  Edit,
  LogOut,
  Zap,
  Target,
  Award,
  DollarSign,
  Crown,
  Plus,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { StrengthRating, Medal as MedalType, TrainerClient } from '@/types';
import { ProfileCardV2 } from './_components/ProfileCardV2';
import { WorkoutStatsCharts } from './_components/WorkoutStatsCharts';
import { TrainerStatsCharts } from './_components/TrainerStatsCharts';
import { useProfileData } from './_lib/use-profile-data';

export default function ProfilePage() {
  const router = useRouter();
  const {
    loading,
    user,
    isTrainerMode,
    workouts,
    personalBests,
    roster,
    gyms,
    setViewMode,
    setGym,
    addGym,
    logout,
  } = useProfileData();

  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showTrainerStatModal, setShowTrainerStatModal] = useState<'clients' | 'sessions' | 'revenue' | null>(null);
  const [showGymPicker, setShowGymPicker] = useState(false);
  const [gymSearchText, setGymSearchText] = useState('');

  // Deferred modules — no engine in v2 yet. Kept as typed empties so the
  // verbatim UI degrades gracefully behind its own guards / feature flags.
  const strengthRating: StrengthRating | null = null;
  const userMedals: MedalType[] = [];

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('[Profile] Logout error:', error);
      window.location.href = '/login';
    }
  };

  const handleAddGym = (name: string) => {
    if (!name.trim()) return;
    addGym(name.trim());
    setGymSearchText('');
    setShowGymPicker(false);
    toast.success(`Gym set to "${name.trim()}"`);
  };

  const handleSelectGym = (name: string) => {
    setGym(name);
    setGymSearchText('');
    setShowGymPicker(false);
    toast.success(`Gym set to "${name}"`);
  };

  const handleRemoveGym = () => {
    setGym(null);
    setShowGymPicker(false);
    toast.success('Gym removed');
  };

  if (loading) {
    return (
      <div className="px-5 py-24 text-center text-gray-500">Loading profile…</div>
    );
  }
  if (!user) return null;

  // Athlete sees own workouts; trainer's "sessions conducted" seam is deferred.
  const userOwnWorkouts = workouts;
  const userWorkouts = isTrainerMode ? [] : userOwnWorkouts;
  const totalWorkouts = userWorkouts.length;
  const totalVolume = userWorkouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  const userPBs = personalBests;

  // Trainers' followers are their roster clients (real). Following is deferred.
  const actualFollowers = isTrainerMode ? roster.map((r) => r.id) : [];
  const actualFollowing: string[] = [];

  // Trainer stats — client count is real (roster); sessions/revenue are the
  // deferred booking/payments module, so they render as zero/empty.
  const trainerStats = isTrainerMode
    ? {
        totalSessions: 0,
        weekSessions: 0,
        monthSessions: 0,
        totalEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
        activeClients: roster.length,
        avgSessionsPerWeek: '0',
        avgPerSession: '0',
        outstandingAmount: 0,
        totalPaidSessions: 0,
        totalUnpaidSessions: 0,
        collectionRate: 100,
        bestClient: { name: '—', revenue: 0, sessions: 0 },
        busiestDay: null as { day: string; count: number } | null,
        monthlyGrowth: 0,
        totalClientsEver: roster.length,
        revenuePerClient: 0,
      }
    : null;

  // Roster → TrainerClient shape for the (empty-data) trainer charts.
  const chartClients = roster.map((r) => ({
    id: r.id,
    trainerId: user.id,
    clientId: r.id,
    status: r.status,
    client: { displayName: r.name, username: r.name },
  })) as unknown as TrainerClient[];

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'elite': return 'text-amber-400';
      case 'advanced': return 'text-purple-400';
      case 'intermediate': return 'text-blue-400';
      case 'novice': return 'text-sky-400';
      default: return 'text-gray-400';
    }
  };

  const getTierBg = (tier?: string) => {
    switch (tier) {
      case 'elite': return 'bg-amber-500/20';
      case 'advanced': return 'bg-purple-500/20';
      case 'intermediate': return 'bg-blue-500/20';
      case 'novice': return 'bg-sky-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  return (
    <>
      <div className="pt-14 pb-12 px-5 relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${isTrainerMode ? 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=400&fit=crop&crop=center' : 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop&crop=center'})` }}
        />
        {/* Gradient overlay */}
        <div className={`absolute inset-0 ${isTrainerMode ? 'bg-gradient-to-b from-rose-600/85 via-rose-500/80 to-rose-700/90' : 'bg-gradient-to-b from-sky-600/85 via-sky-500/80 to-sky-700/90'}`} />
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px)] bg-[length:32px_32px] pointer-events-none" />

        {/* Profile Header */}
        <div className="relative flex items-start justify-between mb-8">
          <div className="flex items-center gap-5">
            <button onClick={() => setShowProfileCard(true)} className="relative group">
              <Avatar className="w-24 h-24 border-4 border-white/20 group-hover:border-white/40 transition-all duration-300 shadow-xl shadow-black/30">
                <AvatarImage src={user.profilePhoto} />
                <AvatarFallback className="text-2xl bg-slate-800 text-white font-bold">
                  {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-xs font-semibold">View Card</span>
              </div>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">{user.displayName || user.username}</h1>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-white/70 text-sm">@{user.username}</p>
                {user.gender && user.gender !== 'other' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-white/70 capitalize font-medium">
                    {user.gender}
                  </span>
                )}
              </div>
              {user.bio && (
                <p className="text-white/60 text-sm max-w-[200px] line-clamp-2">{user.bio}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => router.push('/settings')}
              className="text-white/80 hover:text-white hover:bg-white/15 rounded-xl"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats Row - Glass card style */}
        <div className="relative grid grid-cols-4 gap-2 mb-6 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{totalWorkouts}</p>
            <p className="text-[11px] text-white/60 font-medium">Workouts</p>
          </div>
          <div
            className="text-center cursor-pointer hover:bg-white/10 rounded-xl p-2 -m-2 transition-all duration-200"
            onClick={() => setShowFollowersModal(true)}
          >
            <p className="text-2xl font-bold text-white">{actualFollowers.length}</p>
            <p className="text-[11px] text-white/60 font-medium">{isTrainerMode ? 'Clients' : 'Followers'}</p>
          </div>
          <div
            className="text-center cursor-pointer hover:bg-white/10 rounded-xl p-2 -m-2 transition-all duration-200"
            onClick={() => setShowFollowingModal(true)}
          >
            <p className="text-2xl font-bold text-white">{actualFollowing.length}</p>
            <p className="text-[11px] text-white/60 font-medium">{isTrainerMode ? 'Athletes' : 'Following'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{userMedals.length}</p>
            <p className="text-[11px] text-white/60 font-medium">Medals</p>
          </div>
        </div>
      </div>

      {/* Add Your Gym */}
      <div className="px-5 -mt-3 relative z-10 mb-3">
        {user.gymName ? (
          <button
            onClick={() => setShowGymPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Dumbbell className="w-4 h-4 text-sky-500" />
            <span className="text-sm text-gray-700 font-medium">{user.gymName}</span>
          </button>
        ) : (
          <button
            onClick={() => setShowGymPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 border-dashed rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Add your gym</span>
          </button>
        )}
      </div>

      {/* Content below gradient - white background */}
      <div className="px-5 pt-4 pb-2 space-y-4 relative z-10">
        {/* User/Trainer Mode Toggle — only shown for trainers (local view toggle) */}
        {user.isTrainer && (
          <div className="flex items-center justify-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('user')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                !isTrainerMode
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              Athlete
            </button>
            <button
              onClick={() => setViewMode('trainer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                isTrainerMode
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Trainer
            </button>
          </div>
        )}

        {/* Membership Badge */}
        <div className="flex items-center gap-2">
          <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/30">
            <Crown className="w-3 h-3 mr-1" />
            {isTrainerMode ? 'Trainer Pro' : 'Pro Member'}
          </Badge>
        </div>

        {/* Trainer Stats - shown in trainer mode */}
        {isTrainerMode && trainerStats && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              {/* Earnings Row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">${Math.round(trainerStats.weekEarnings)}</p>
                  <p className="text-xs text-gray-500">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">${Math.round(trainerStats.monthEarnings)}</p>
                  <p className="text-xs text-gray-500">This Month</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-rose-500">${Math.round(trainerStats.totalEarnings)}</p>
                  <p className="text-xs text-gray-500">Total Paid</p>
                </div>
              </div>

              {/* Stats Grid - Clickable for medal progress */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setShowTrainerStatModal('sessions')}
                  className="text-center p-2 -m-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="text-lg font-semibold text-gray-900">{trainerStats.totalSessions}</p>
                  <p className="text-[10px] text-gray-500">Sessions</p>
                </button>
                <button
                  onClick={() => setShowTrainerStatModal('clients')}
                  className="text-center p-2 -m-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="text-lg font-semibold text-gray-900">{trainerStats.activeClients}</p>
                  <p className="text-[10px] text-gray-500">Clients</p>
                </button>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{trainerStats.avgSessionsPerWeek}</p>
                  <p className="text-[10px] text-gray-500">Avg/wk</p>
                </div>
                <button
                  onClick={() => setShowTrainerStatModal('revenue')}
                  className="text-center p-2 -m-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="text-lg font-semibold text-gray-900">${trainerStats.avgPerSession}</p>
                  <p className="text-[10px] text-gray-500">Avg/session</p>
                </button>
              </div>

              {/* Enhanced Insights */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 mt-3">
                <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">{trainerStats.collectionRate}%</p>
                  <p className="text-[9px] text-gray-500">Collection Rate</p>
                </div>
                <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">${trainerStats.revenuePerClient}</p>
                  <p className="text-[9px] text-gray-500">Rev/Client</p>
                </div>
                <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-500">
                    {trainerStats.monthlyGrowth > 0 ? '+' : ''}{trainerStats.monthlyGrowth}%
                  </p>
                  <p className="text-[9px] text-gray-500">Monthly Growth</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="px-5 pb-6 space-y-5">
        {/* Achievements Card — gated on the medals module (deferred) */}
        {FEATURE_FLAGS.medals && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 flex items-center gap-2.5 text-lg">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${isTrainerMode ? 'from-emerald-500 to-teal-600 shadow-emerald-500/20' : 'from-purple-500 to-pink-600 shadow-purple-500/20'} flex items-center justify-center shadow-lg`}>
                    {isTrainerMode ? <Crown className="w-4 h-4 text-white" /> : <Medal className="w-4 h-4 text-white" />}
                  </div>
                  {isTrainerMode ? 'Trainer Achievements' : 'Achievements'}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-sky-500" onClick={() => router.push('/medals')}>
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-700 mb-1">No {isTrainerMode ? 'trainer' : ''} medals yet</p>
                <p className="text-sm text-gray-500">
                  {isTrainerMode
                    ? 'Grow your client base, conduct sessions, and earn revenue to unlock trainer medals'
                    : 'Complete workouts to earn medals'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pure Strength Rating Card — gated on the strengthRating module (deferred) */}
        {!isTrainerMode && FEATURE_FLAGS.strengthRating && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 flex items-center gap-2.5 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  Pure Strength Rating
                </CardTitle>
                {strengthRating && (
                  <Badge className={`${getTierBg((strengthRating as StrengthRating).tier)} ${getTierColor((strengthRating as StrengthRating).tier)} font-semibold px-3`}>
                    {(strengthRating as StrengthRating).tier}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-700 font-medium mb-1">No strength data yet</p>
                <p className="text-sm text-gray-500">Complete workouts with key lifts to build your rating</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Bests - hidden in trainer mode */}
        {!isTrainerMode && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Personal Bests
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-amber-500"
                  onClick={() => router.push('/pbs')}
                >
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {userPBs.length > 0 ? (
                <div className="space-y-3">
                  {userPBs.slice(0, 5).map((pb) => (
                    <div
                      key={pb.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {(pb.exerciseName || pb.exerciseId).replace(/-/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(pb.achievedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-500">{Math.round(pb.oneRepMax)}kg</p>
                        <p className="text-xs text-gray-500">1RM</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700 mb-1">No personal bests yet</p>
                  <p className="text-sm text-gray-500">Start logging workouts to track your PRs</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Workout History */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-sky-400" />
                  {isTrainerMode ? 'Recent Client Sessions' : 'Workout History'}
                </CardTitle>
                {!isTrainerMode && (
                  <p className="text-[11px] text-gray-500 mt-0.5">Last 5 sessions — tap See All for full history</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-sky-500" onClick={() => router.push(isTrainerMode ? '/clients' : '/workouts')}>
                See All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isTrainerMode ? (
              <div className="text-center py-8">
                <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-700 mb-1">No client sessions yet</p>
                <p className="text-sm text-gray-500">Complete sessions with clients to see them here</p>
              </div>
            ) : userWorkouts.length > 0 ? (
              <div className="space-y-2">
                {userWorkouts.slice(0, 5).map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-100 border-l-2 border-l-sky-500"
                    onClick={() => router.push('/workouts')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{workout.name}</p>
                        <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-[10px] px-1.5 py-0">
                          Solo
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(new Date(workout.startTime), 'MMM d')} • {workout.exercises.length} exercises
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sky-400 font-medium text-sm">
                        {Math.round(workout.totalVolume).toLocaleString()} kg
                      </p>
                      <p className="text-xs text-gray-500">
                        {workout.duration ? `${Math.floor(workout.duration / 60)}m` : '--'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-700 mb-1">No workouts yet</p>
                <p className="text-sm text-gray-500">Start your first workout to see it here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trainer Stats & Graphs - shown in trainer mode */}
        {isTrainerMode && (
          <TrainerStatsCharts
            sessionPackages={[]}
            sessions={[]}
            clients={chartClients}
            payments={[]}
          />
        )}

        {/* Workout Stats & Graphs - shown in athlete mode */}
        {!isTrainerMode && (
          <WorkoutStatsCharts workoutHistory={userWorkouts} personalBests={userPBs} />
        )}

        {/* Account Actions */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              className="w-full justify-start h-14 px-4 text-gray-600 hover:bg-gray-50 rounded-none border-b border-gray-200"
              onClick={() => router.push('/settings')}
            >
              <Edit className="w-5 h-5 mr-3 text-gray-500" />
              Edit Profile
              <ChevronRight className="w-5 h-5 ml-auto text-gray-500" />
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-14 px-4 text-red-400 hover:bg-red-500/10 rounded-none"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Profile Card Popup */}
      <Dialog open={showProfileCard} onOpenChange={setShowProfileCard}>
        <DialogContent className="bg-transparent border-none shadow-none max-w-md p-0">
          <ProfileCardV2
            user={user}
            medals={userMedals}
            strengthRating={strengthRating}
            stats={{
              totalWorkouts,
              totalVolume,
              followers: actualFollowers.length,
              following: actualFollowing.length,
            }}
            isOwnProfile={true}
            isFriend={false}
            onClose={() => setShowProfileCard(false)}
            onShare={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success('Profile link copied');
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Followers Modal */}
      <Dialog open={showFollowersModal} onOpenChange={setShowFollowersModal}>
        <DialogContent className="bg-white border-gray-200 shadow-sm max-w-md">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">{isTrainerMode ? 'Clients' : 'Followers'}</h2>
            {actualFollowers.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No {isTrainerMode ? 'clients' : 'followers'} yet</p>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-3">
                  {roster.map((client) => (
                    <div key={client.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-sky-500 text-white">
                          {client.name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400">Client</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-sky-500 text-sky-500"
                        onClick={() => {
                          setShowFollowersModal(false);
                          router.push('/clients');
                        }}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Modal */}
      <Dialog open={showFollowingModal} onOpenChange={setShowFollowingModal}>
        <DialogContent className="bg-white border-gray-200 shadow-sm max-w-md">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">{isTrainerMode ? 'Athletes' : 'Following'}</h2>
            <p className="text-gray-400 text-center py-4">Not following anyone</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trainer Stats Milestone Modal */}
      <Dialog open={showTrainerStatModal !== null} onOpenChange={(open) => !open && setShowTrainerStatModal(null)}>
        <DialogContent className="bg-white border-gray-200 shadow-sm max-w-md">
          <div className="space-y-4">
            {showTrainerStatModal === 'clients' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Client Milestones</h2>
                    <p className="text-sm text-gray-500">{trainerStats?.activeClients || 0} total clients</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'trainer-first-client', target: 1, name: 'First Client', icon: '👤' },
                    { id: 'trainer-5-clients', target: 5, name: 'Growing Roster', icon: '👥' },
                    { id: 'trainer-10-clients', target: 10, name: 'Popular Trainer', icon: '🌟' },
                    { id: 'trainer-25-clients', target: 25, name: 'Client Magnet', icon: '💫' },
                    { id: 'trainer-50-clients', target: 50, name: 'Training Empire', icon: '👑' },
                  ].map((milestone) => {
                    const current = trainerStats?.activeClients || 0;
                    const earned = current >= milestone.target;
                    const progress = Math.min((current / milestone.target) * 100, 100);
                    return (
                      <div key={milestone.id} className={`p-3 rounded-lg ${earned ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{milestone.icon}</span>
                            <span className={`font-medium ${earned ? 'text-emerald-500' : 'text-gray-900'}`}>{milestone.name}</span>
                          </div>
                          <span className={`text-sm ${earned ? 'text-emerald-500' : 'text-gray-400'}`}>
                            {current}/{milestone.target}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {showTrainerStatModal === 'sessions' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-sky-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Session Milestones</h2>
                    <p className="text-sm text-gray-500">{trainerStats?.totalSessions || 0} total sessions</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'trainer-first-session', target: 1, name: 'Session One', icon: '🎯' },
                    { id: 'trainer-25-sessions', target: 25, name: 'Session Pro', icon: '📋' },
                    { id: 'trainer-100-sessions', target: 100, name: 'Session Master', icon: '🏆' },
                  ].map((milestone) => {
                    const current = trainerStats?.totalSessions || 0;
                    const earned = current >= milestone.target;
                    const progress = Math.min((current / milestone.target) * 100, 100);
                    return (
                      <div key={milestone.id} className={`p-3 rounded-lg ${earned ? 'bg-sky-500/20 border border-sky-500/30' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{milestone.icon}</span>
                            <span className={`font-medium ${earned ? 'text-sky-500' : 'text-gray-900'}`}>{milestone.name}</span>
                          </div>
                          <span className={`text-sm ${earned ? 'text-sky-500' : 'text-gray-400'}`}>
                            {current}/{milestone.target}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {showTrainerStatModal === 'revenue' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Revenue Milestones</h2>
                    <p className="text-sm text-gray-500">${Math.round(trainerStats?.totalEarnings || 0)} total earned</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'trainer-first-payment', target: 1, name: 'First Dollar', icon: '💵' },
                    { id: 'trainer-500-revenue', target: 500, name: 'Side Hustle', icon: '💰' },
                    { id: 'trainer-2500-revenue', target: 2500, name: 'Part Timer', icon: '💳' },
                  ].map((milestone) => {
                    const current = trainerStats?.totalEarnings || 0;
                    const earned = current >= milestone.target;
                    const progress = Math.min((current / milestone.target) * 100, 100);
                    return (
                      <div key={milestone.id} className={`p-3 rounded-lg ${earned ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{milestone.icon}</span>
                            <span className={`font-medium ${earned ? 'text-amber-500' : 'text-gray-900'}`}>{milestone.name}</span>
                          </div>
                          <span className={`text-sm ${earned ? 'text-amber-500' : 'text-gray-400'}`}>
                            ${Math.round(current)}/${milestone.target}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Gym Picker Dialog */}
      <Dialog open={showGymPicker} onOpenChange={setShowGymPicker}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-sky-500" />
              {user.gymName ? 'Change Gym' : 'Add Your Gym'}
            </DialogTitle>
            <DialogDescription>Search for your gym or add a new one</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={gymSearchText}
              onChange={(e) => setGymSearchText(e.target.value)}
              placeholder="Search or type gym name..."
              className="bg-gray-50 border-gray-200 text-gray-900"
              autoFocus
            />

            {gymSearchText.trim() && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {gyms
                  .filter((g) => g.name.toLowerCase().includes(gymSearchText.toLowerCase()))
                  .slice(0, 5)
                  .map((g) => (
                    <button
                      key={g.id}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm text-gray-900 flex items-center gap-2 border border-gray-100"
                      onClick={() => handleSelectGym(g.name)}
                    >
                      <Dumbbell className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <span>{g.name}</span>
                    </button>
                  ))}
                {!gyms.some((g) => g.name.toLowerCase() === gymSearchText.toLowerCase()) && gymSearchText.trim() && (
                  <button
                    className="w-full text-left px-3 py-2.5 hover:bg-sky-50 rounded-lg text-sm text-sky-600 flex items-center gap-2 border border-sky-100 bg-sky-50/50"
                    onClick={() => handleAddGym(gymSearchText)}
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <span>Add &quot;{gymSearchText.trim()}&quot;</span>
                  </button>
                )}
              </div>
            )}

            {user.gymName && (
              <Button
                variant="outline"
                className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={handleRemoveGym}
              >
                <X className="w-4 h-4 mr-2" />
                Remove Gym
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
