import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, Trophy } from 'lucide-react'
import { useGameStore } from '@/store/game-store'
import { ScoreBreakdown } from '@/components/scoring'
import { calculateProfitRanks, calculateMultiFactorScore, calculateSpoilageRate } from '@/lib/scoring'
import type { GameResult } from '@/types'

interface ResultsDisplayProps {
  result: GameResult
  onPlayAgain: () => void
}

/**
 * Displays simulation results including financial metrics, feedback, and
 * (in multi-team mode) a full multi-factor score breakdown via ScoreBreakdown.
 */
export function ResultsDisplay({ result, onPlayAgain }: ResultsDisplayProps) {
  const { cupsSold, revenue, costs, profit, feedback } = result
  const { currentTeam, gameMode, getLeaderboard, teams, riskManagementScores } = useGameStore()

  const isProfit = profit > 0
  const profitColor = isProfit ? 'text-green-600' : 'text-red-600'
  const ProfitIcon = isProfit ? TrendingUp : TrendingDown

  // Get team ranking if in multi-team mode
  const leaderboard = gameMode === 'multi' ? getLeaderboard() : []
  const teamRank = currentTeam ? leaderboard.findIndex(team => team.id === currentTeam.id) + 1 : 0

  // Calculate multi-factor score for the current team in multi-team mode
  const multiFactorData = (() => {
    if (gameMode !== 'multi' || !currentTeam || teams.length === 0) return null

    const profitRanks = calculateProfitRanks(teams)
    const rankEntry = profitRanks.find(r => r.teamId === currentTeam.id)
    if (!rankEntry) return null

    const riskScore = riskManagementScores.get(currentTeam.id)?.total ?? 0
    const score = calculateMultiFactorScore(currentTeam, rankEntry.rank, riskScore)
    const spoilageRate = calculateSpoilageRate(currentTeam.roundHistory)
    const profitableRounds = currentTeam.roundHistory.filter(r => r.profit > 0).length
    const totalRounds = currentTeam.roundHistory.length

    return {
      score,
      profitRank: rankEntry.rank,
      spoilageRate,
      profitableRounds,
      totalRounds,
    }
  })()
  
  return (
    <div className="space-y-6">
      {/* Main Results */}
      <Card className="border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <DollarSign className="w-8 h-8 text-primary" />
            Business Results
          </CardTitle>
          <CardDescription>
            {currentTeam ? (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: currentTeam.color }}
                />
                <span className="font-medium">{currentTeam.name}</span>
                {teamRank > 0 && (
                  <Badge variant="outline" className="ml-2">
                    <Trophy className="w-3 h-3 mr-1" />
                    Rank #{teamRank}
                  </Badge>
                )}
              </div>
            ) : (
              "Here's how your lemonade stand performed!"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Cups Sold */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-600">{cupsSold}</div>
              <div className="text-sm text-blue-700">Cups Sold</div>
            </div>
            
            {/* Revenue */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-600">${revenue.toFixed(2)}</div>
              <div className="text-sm text-green-700">Revenue</div>
            </div>
            
            {/* Costs */}
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <AlertCircle className="w-8 h-8 mx-auto text-orange-600 mb-2" />
              <div className="text-2xl font-bold text-orange-600">${costs.toFixed(2)}</div>
              <div className="text-sm text-orange-700">Total Costs</div>
            </div>
            
            {/* Profit */}
            <div className={`text-center p-4 rounded-lg ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
              <ProfitIcon className={`w-8 h-8 mx-auto mb-2 ${isProfit ? 'text-green-600' : 'text-red-600'}`} />
              <div className={`text-2xl font-bold ${profitColor}`}>
                ${Math.abs(profit).toFixed(2)}
              </div>
              <div className={`text-sm ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                {isProfit ? 'Profit!' : 'Loss'}
              </div>
            </div>
          </div>
          
          {/* Profit Summary */}
          <div className="mt-6 text-center">
            <Badge 
              variant={isProfit ? "default" : "destructive"} 
              className="text-lg px-4 py-2"
            >
              {isProfit ? `🎉 You made $${profit.toFixed(2)} profit!` : `📚 You lost $${Math.abs(profit).toFixed(2)}`}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">💡 What Happened?</CardTitle>
          <CardDescription>
            Learn from your business decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {feedback.map((item, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="text-lg">💡</div>
                <div className="flex-1 text-sm leading-relaxed">{item}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Multi-Factor Score Breakdown (multi-team mode only) */}
      {gameMode === 'multi' && currentTeam && multiFactorData && (
        <ScoreBreakdown
          score={multiFactorData.score}
          teamName={currentTeam.name}
          profitRank={multiFactorData.profitRank}
          totalTeams={teams.length}
          profitableRounds={multiFactorData.profitableRounds}
          totalRounds={multiFactorData.totalRounds}
          spoilageRate={multiFactorData.spoilageRate}
        />
      )}

      {/* Play Again Button */}
      <div className="text-center">
        <Button
          onClick={onPlayAgain}
          size="lg"
          className="text-lg px-8 py-3"
        >
          🍋 Start New Day
        </Button>
      </div>
    </div>
  )
}