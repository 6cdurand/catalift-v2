'use client';

// BuildDaysStep.tsx — Program builder Step 2: Build Days (PLACEHOLDER for w2b)

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

interface BuildDaysStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function BuildDaysStep({ onContinue, onBack }: BuildDaysStepProps) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium mb-2">Build Days — w2b</h3>
          <p className="text-gray-500 mb-4">
            WorkoutDayBuilder, Add-Exercise, Block Library coming in w2b
          </p>
          <p className="text-sm text-gray-400">
            (Placeholder — w2a ships shell + Setup only)
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back to Setup
        </Button>
        <Button onClick={onContinue} className="flex-1">
          Continue to Schedule <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
