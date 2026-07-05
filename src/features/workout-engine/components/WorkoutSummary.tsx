'use client';

import { Check, Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BlockMemoryCard from './BlockMemoryCard';
import type { SummaryData } from '../lib/summarize-blocks';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

interface WorkoutSummaryProps {
  data: SummaryData;
  onClose: () => void;
}

export function WorkoutSummary({ data, onClose }: WorkoutSummaryProps) {
  const bs = data.blocksSummary;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Workout Complete</h1>
          <Button onClick={onClose} className="bg-sky-500 hover:bg-sky-600 h-9 px-5">
            Done
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
        <div className="max-w-sm mx-auto space-y-3">
          {/* Compact Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-sky-400 to-sky-600 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{data.name}</p>
            </div>
          </div>

          {/* Session Time */}
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Session Time</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm mt-0.5">
              <span className="text-gray-900 font-medium">
                {data.startTime ? new Date(data.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-900 font-medium">
                {data.endTime ? new Date(data.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}
              </span>
            </div>
          </div>

          {/* Compact Stats Row — 4th tile is block-aware */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{formatTime(data.duration || 0)}</p>
              <p className="text-[10px] text-gray-500">Duration</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{Math.round(data.totalVolume || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">kg Vol</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-purple-500">{data.exercises || 0}</p>
              <p className="text-[10px] text-gray-500">Exercises</p>
            </div>
            {(() => {
              const sets = data.sets || 0;
              if (bs && bs.totalCardioDistanceKm >= 0.1 && bs.totalCardioDistanceKm >= bs.totalCircuitRounds / 4) {
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-500">{bs.totalCardioDistanceKm.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500">km Cardio</p>
                  </div>
                );
              }
              if (bs && bs.totalCircuitRounds > 0) {
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-orange-500">{bs.totalCircuitRounds}</p>
                    <p className="text-[10px] text-gray-500">Rounds</p>
                  </div>
                );
              }
              if (bs && sets === 0 && bs.totalCardioMinutes >= 1) {
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-green-500">{Math.round(bs.totalCardioMinutes)}</p>
                    <p className="text-[10px] text-gray-500">min Cardio</p>
                  </div>
                );
              }
              return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-cyan-500">{sets}</p>
                  <p className="text-[10px] text-gray-500">Sets</p>
                </div>
              );
            })()}
          </div>

          {/* Block summary chips */}
          {bs?.hasNonStrengthWork && (
            <div className="flex flex-wrap gap-1.5">
              {bs.cardio.map((c, i) => {
                const km = c.distanceMeters >= 100 ? `${(c.distanceMeters / 1000).toFixed(2)}km` : null;
                const min = c.seconds >= 30 ? `${Math.round(c.seconds / 60)}min` : null;
                return (
                  <Badge key={`c-${i}`} className="text-[10px] bg-green-500/15 text-green-700 border border-green-500/30">
                    🏃 {c.activity}{(km || min) ? ` · ${km || min}` : ''}
                  </Badge>
                );
              })}
              {bs.circuit.map((c, i) => (
                <Badge key={`x-${i}`} className="text-[10px] bg-orange-500/15 text-orange-700 border border-orange-500/30">
                  ⚡ {c.style}
                  {c.roundsCompleted > 0 && ` · ${c.roundsCompleted}${c.roundsTarget ? `/${c.roundsTarget}` : ''} rds`}
                </Badge>
              ))}
              {bs.warmupCount > 0 && (
                <Badge className="text-[10px] bg-yellow-500/15 text-yellow-700 border border-yellow-500/30">
                  🔥 {bs.warmupCount} warm-up{bs.warmupCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}

          {/* Block memory cards — creative per-block visualizations */}
          {(() => {
            const blocks = data.blocks || [];
            const interesting = blocks.filter(
              (b) => b?.type === 'cardio' || b?.type === 'circuit' || b?.type === 'warmup' || b?.type === 'cooldown'
            );
            if (interesting.length === 0) return null;
            return (
              <div className="space-y-2.5">
                {interesting.map((block, idx) => (
                  <BlockMemoryCard key={block.id || idx} block={block} />
                ))}
              </div>
            );
          })()}

          {/* New PRs */}
          {data.pbs && data.pbs.length > 0 && (
            <div className="bg-linear-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-xl p-3">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <Trophy className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-amber-800 text-sm">{data.pbs.length} New PR{data.pbs.length > 1 ? 's' : ''}!</span>
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                {data.pbs.map((pb, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-white border border-amber-300 text-amber-900 text-[11px]">{pb}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Coach fallback feedback */}
          <div className="bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-indigo-700 text-sm">AI Coach</span>
            </div>
            <p className="text-xs text-gray-800 leading-relaxed">
              {(() => {
                if (bs && bs.totalCardioDistanceKm >= 0.5) {
                  return `${bs.totalCardioDistanceKm.toFixed(2)}km logged in ${formatTime(data.duration)} — solid aerobic effort. Recover well.`;
                }
                if (bs && bs.totalCircuitRounds > 0) {
                  return `${bs.totalCircuitRounds} circuit round${bs.totalCircuitRounds > 1 ? 's' : ''} completed across ${bs.circuit.length} block${bs.circuit.length > 1 ? 's' : ''}. Conditioning earned.`;
                }
                if (bs && bs.totalCardioMinutes >= 5) {
                  return `${Math.round(bs.totalCardioMinutes)} minutes of cardio in the books. Keep stacking aerobic base.`;
                }
                if (data.totalVolume > 5000) {
                  return `Solid session — ${Math.round(data.totalVolume).toLocaleString()}kg total volume across ${data.exercises} exercises. Keep pushing.`;
                }
                if (bs && bs.warmupCount > 0 && data.sets === 0 && data.totalVolume === 0) {
                  return `${bs.warmupCount} warm-up block${bs.warmupCount > 1 ? 's' : ''} done — mobility matters. Stack the real work next.`;
                }
                return `${data.exercises} exercises, ${data.sets} sets completed. Every rep counts — keep showing up.`;
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
