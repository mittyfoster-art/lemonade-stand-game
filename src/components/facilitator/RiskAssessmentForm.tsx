import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { SCORING_MAX } from '@/types'
import type { RiskManagementInput } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RiskAssessmentFormProps {
  /** ID of the team being assessed */
  teamId: string
  /** Display name of the team being assessed */
  teamName: string
  /** Existing score to pre-populate the form (e.g. when editing) */
  initialValues?: Pick<RiskManagementInput, 'productionAdjustment' | 'pricingStrategy' | 'budgetReserves' | 'notes'>
  /** Called when the facilitator saves a valid score */
  onSave: (score: RiskManagementInput) => void
  /** Name or ID of the facilitator performing the assessment */
  assessedBy?: string
}

/** Per-sub-score min/max bounds */
const SUB_SCORE_MIN = 0
const SUB_SCORE_MAX = 5

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a value between min and max inclusive */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Returns a Tailwind text-color class based on how close the total is to the
 * maximum risk management score (15).
 */
function getTotalColor(total: number): string {
  const ratio = total / SCORING_MAX.RISK_MANAGEMENT
  if (ratio >= 0.8) return 'text-green-700'
  if (ratio >= 0.5) return 'text-yellow-700'
  return 'text-red-600'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ScoreSliderProps {
  id: string
  label: string
  description: string
  value: number
  onChange: (value: number) => void
}

function ScoreSlider({ id, label, description, value, onChange }: ScoreSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label} ({SUB_SCORE_MIN}–{SUB_SCORE_MAX})
        </Label>
        <Badge variant="outline" className="min-w-[2.5rem] justify-center text-sm font-bold">
          {value}
        </Badge>
      </div>
      <Slider
        id={id}
        min={SUB_SCORE_MIN}
        max={SUB_SCORE_MAX}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(clamp(v, SUB_SCORE_MIN, SUB_SCORE_MAX))}
        aria-label={label}
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Form for facilitators to enter risk management assessment scores for a team.
 * Provides slider inputs for three sub-categories (0–5 each), shows a running
 * total (0–15), an optional notes field, and a save button.
 *
 * Scores are validated to ensure each sub-score stays within 0–5 and the total
 * stays within 0–15 before calling `onSave`.
 *
 * @see spec/03_UI_COMPONENTS.md Section 5
 * @see spec/01_SCORING_SYSTEM.md Section 4
 */
export function RiskAssessmentForm({
  teamId,
  teamName,
  initialValues,
  onSave,
  assessedBy = '',
}: RiskAssessmentFormProps) {
  const [productionAdjustment, setProductionAdjustment] = useState(
    initialValues?.productionAdjustment ?? 0,
  )
  const [pricingStrategy, setPricingStrategy] = useState(
    initialValues?.pricingStrategy ?? 0,
  )
  const [budgetReserves, setBudgetReserves] = useState(
    initialValues?.budgetReserves ?? 0,
  )
  const [notes, setNotes] = useState(initialValues?.notes ?? '')

  const total = productionAdjustment + pricingStrategy + budgetReserves

  const handleSave = useCallback(() => {
    const clamped: RiskManagementInput = {
      teamId,
      productionAdjustment: clamp(productionAdjustment, SUB_SCORE_MIN, SUB_SCORE_MAX),
      pricingStrategy: clamp(pricingStrategy, SUB_SCORE_MIN, SUB_SCORE_MAX),
      budgetReserves: clamp(budgetReserves, SUB_SCORE_MIN, SUB_SCORE_MAX),
      total: clamp(total, 0, SCORING_MAX.RISK_MANAGEMENT),
      notes: notes.trim(),
      assessedBy,
      assessedAt: Date.now(),
    }
    onSave(clamped)
  }, [teamId, productionAdjustment, pricingStrategy, budgetReserves, total, notes, assessedBy, onSave])

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl">RISK MANAGEMENT ASSESSMENT</CardTitle>
        {teamName && (
          <p className="text-sm text-muted-foreground">Team: {teamName}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sub-score sliders */}
        <ScoreSlider
          id={`${teamId}-production`}
          label="Production Adjustment"
          description="Adjusted cup production for weather forecasts and demand scenarios"
          value={productionAdjustment}
          onChange={setProductionAdjustment}
        />

        <ScoreSlider
          id={`${teamId}-pricing`}
          label="Pricing Strategy"
          description="Responded to market conditions and competitive pressure"
          value={pricingStrategy}
          onChange={setPricingStrategy}
        />

        <ScoreSlider
          id={`${teamId}-budget`}
          label="Budget Reserves"
          description="Maintained reserves and avoided over-investing in a single round"
          value={budgetReserves}
          onChange={setBudgetReserves}
        />

        {/* Total display */}
        <div className="flex items-center justify-between rounded-lg border bg-white/60 p-3">
          <span className="text-sm font-semibold">Total Risk Score</span>
          <span className={cn('text-lg font-bold', getTotalColor(total))}>
            {total}/{SCORING_MAX.RISK_MANAGEMENT}
          </span>
        </div>

        {/* Optional notes */}
        <div className="space-y-2">
          <Label htmlFor={`${teamId}-notes`} className="text-sm font-medium">
            Notes (optional)
          </Label>
          <Textarea
            id={`${teamId}-notes`}
            placeholder="Additional observations about the team's risk management..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Save button */}
        <Button onClick={handleSave} className="w-full" size="lg">
          Save Score
        </Button>
      </CardContent>
    </Card>
  )
}
