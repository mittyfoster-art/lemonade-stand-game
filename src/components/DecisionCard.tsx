import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'

interface DecisionCardProps {
  title: string
  description: string
  value: number
  min: number
  max: number
  step: number
  icon: React.ReactNode
  formatValue: (value: number) => string
  onChange: (value: number) => void
  color: string
}

export function DecisionCard({
  title,
  description,
  value,
  min,
  max,
  step,
  icon,
  formatValue,
  onChange,
  color
}: DecisionCardProps) {
  return (
    <Card className="transition-all duration-200 hover:shadow-lg border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg font-bold">
            {formatValue(value)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Slider
            value={[value]}
            onValueChange={(values) => onChange(values[0] ?? value)}
            min={min}
            max={max}
            step={step}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatValue(min)}</span>
            <span>{formatValue(max)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}