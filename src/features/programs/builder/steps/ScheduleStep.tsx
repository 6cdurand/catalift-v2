'use client';

// ScheduleStep.tsx — Program builder Step 3: Schedule (PLACEHOLDER for w2c)

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

interface ScheduleStepProps {
  onBack: () => void;
  onSave: () => void;
}

export function ScheduleStep({ onBack, onSave }: ScheduleStepProps) {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium mb-2">Schedule — w2c</h3>
          <p className="text-gray-500 mb-4">
            Fixed/Flexible scheduling, day assignment coming in w2c
          </p>
          <p className="text-sm text-gray-400">
            (Placeholder — w2a ships shell + Setup only)
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back to Build Days
        </Button>
        <Button onClick={onSave} className="flex-1">
          Save Program <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
