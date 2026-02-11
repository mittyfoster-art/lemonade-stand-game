import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Target, MapPin } from 'lucide-react'

interface DailyScenario {
  id: string
  title: string
  story: string
  hint: string
  targetMarket: string
  deceptionLevel: 'low' | 'medium' | 'high'
  optimalDecision: {
    priceRange: [number, number]
    qualityRange: [number, number]
    marketingRange: [number, number]
  }
  weatherEffect: number
  marketCondition: string
}

interface DailyScenarioProps {
  scenario: DailyScenario
  day: number
}

export default function DailyScenario({ scenario, day }: DailyScenarioProps) {
  const difficultyColor = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200'
  }

  const difficultyEmoji = {
    low: '😊',
    medium: '🤔',
    high: '😈'
  }

  return (
    <Card className="mb-6 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-orange-800 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Day {day}: {scenario.title}
          </CardTitle>
          <Badge className={`${difficultyColor[scenario.deceptionLevel]} font-semibold`}>
            {difficultyEmoji[scenario.deceptionLevel]} {scenario.deceptionLevel.toUpperCase()} Challenge
          </Badge>
        </div>
        <CardDescription className="text-sm text-orange-600">
          <Target className="w-4 h-4 inline mr-1" />
          Target Market: {scenario.targetMarket}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Story */}
        <div className="bg-white rounded-lg p-4 border border-orange-200">
          <h4 className="font-semibold text-orange-800 mb-2">📖 Today's Situation</h4>
          <p className="text-gray-700 leading-relaxed">{scenario.story}</p>
        </div>

        {/* Hint */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Strategic Hint
          </h4>
          <p className="text-blue-700 text-sm italic">{scenario.hint}</p>
        </div>

        {/* Market Condition */}
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <h4 className="font-semibold text-purple-800 mb-1 text-sm">Market Analysis</h4>
          <p className="text-purple-700 text-sm">{scenario.marketCondition}</p>
        </div>

        {/* Deception Level Warning */}
        {scenario.deceptionLevel === 'high' && (
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <p className="text-red-700 text-sm font-medium">
              ⚠️ <strong>High Deception Alert:</strong> This scenario is designed to mislead you! 
              The obvious choice might not be the best one. Think carefully about what customers really want.
            </p>
          </div>
        )}
        
        {scenario.deceptionLevel === 'medium' && (
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <p className="text-yellow-700 text-sm font-medium">
              🤔 <strong>Medium Challenge:</strong> There are some hidden factors at play. 
              The situation might not be exactly what it seems on the surface.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}