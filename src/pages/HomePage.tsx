import { useState } from 'react'
import { DollarSign, Star, Megaphone, Play, RotateCcw, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DecisionCard } from '@/components/DecisionCard'
import { ResultsDisplay } from '@/components/ResultsDisplay'
import { LoadingSimulation } from '@/components/LoadingSimulation'
import { TeamManager } from '@/components/TeamManager'
import { Leaderboard } from '@/components/Leaderboard'
import DailyScenario from '@/components/DailyScenario'
import { GameRoomManager } from '@/components/GameRoomManager'
import { useGameStore } from '@/store/game-store'

function HomePage() {
  const { 
    budget, 
    currentDecision, 
    result, 
    isSimulating,
    day,
    currentTeam,
    gameMode,
    teams,
    currentScenario,
    currentGameRoom,
    updateDecision,
    runSimulation,
    resetGame,
    startNewDay
  } = useGameStore()

  const canAffordMarketing = currentDecision.marketing <= (budget - 20) // Reserve $20 for fixed costs
  const remainingBudget = budget - 20 - currentDecision.marketing

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-6xl">🍋</div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Lemonade Stand Business
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Make smart business decisions to run the most successful lemonade stand! 
            Day <Badge variant="outline" className="text-lg font-bold mx-1">{day}</Badge> 
            with <Badge variant="outline" className="text-lg font-bold mx-1">${budget}</Badge> budget.
            {currentGameRoom && (
              <span className="block mt-1 text-sm text-blue-600 font-medium">
                Room: {currentGameRoom.name} ({currentGameRoom.id})
              </span>
            )}
            {currentTeam && (
              <span className="block mt-1 text-base">
                Playing as: <Badge 
                  className="text-white font-medium"
                  style={{ backgroundColor: currentTeam.color }}
                >
                  {currentTeam.name}
                </Badge>
              </span>
            )}
          </p>
        </div>

        {/* Game Room Manager */}
        <GameRoomManager />

        {/* Game Content */}
        {isSimulating ? (
          <div className="max-w-2xl mx-auto">
            <LoadingSimulation />
          </div>
        ) : result ? (
          <div className="max-w-4xl mx-auto">
            <ResultsDisplay result={result} onPlayAgain={startNewDay} />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* Team Management and Leaderboard */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <TeamManager />
              <Leaderboard />
            </div>

            {/* Day and Budget Display */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="border-2 bg-card/50 backdrop-blur">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="text-xl font-bold">Business Day</h3>
                      <p className="text-muted-foreground">Current operating day</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">Day {day}</div>
                    <div className="text-sm text-muted-foreground">
                      {budget > 100 ? '📈 Profitable!' : budget < 100 ? '📉 Watch budget!' : '💰 Starting fresh'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 bg-card/50 backdrop-blur">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="text-xl font-bold">Your Budget</h3>
                      <p className="text-muted-foreground">Available to spend today</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${budget >= 50 ? 'text-green-600' : budget >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                      ${budget}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      After costs: ${remainingBudget >= 0 ? remainingBudget.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Scenario */}
            {currentScenario && (
              <DailyScenario scenario={currentScenario} day={day} />
            )}

            {/* Decision Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Price Decision */}
              <DecisionCard
                title="Cup Price"
                description="How much will you charge per cup?"
                value={currentDecision.price}
                min={0.25}
                max={2.00}
                step={0.05}
                icon={<DollarSign className="w-6 h-6 text-white" />}
                formatValue={(value) => `$${value.toFixed(2)}`}
                onChange={(price) => updateDecision({ price })}
                color="bg-green-500"
              />

              {/* Quality Decision */}
              <DecisionCard
                title="Lemonade Quality"
                description="Higher quality costs more per cup to make"
                value={currentDecision.quality}
                min={1}
                max={5}
                step={1}
                icon={<Star className="w-6 h-6 text-white" />}
                formatValue={(value) => {
                  const qualities = ['Basic', 'Good', 'Great', 'Premium', 'Gourmet'];
                  const costs = ['$0.10', '$0.12', '$0.15', '$0.20', '$0.28'];
                  return `${value}/5 (${qualities[value - 1]}) - ${costs[value - 1]}/cup`;
                }}
                onChange={(quality) => updateDecision({ quality })}
                color="bg-yellow-500"
              />

              {/* Marketing Decision */}
              <DecisionCard
                title="Marketing Budget"
                description="How much will you spend on advertising?"
                value={currentDecision.marketing}
                min={0}
                max={Math.min(30, Math.max(0, budget - 20))}
                step={1}
                icon={<Megaphone className="w-6 h-6 text-white" />}
                formatValue={(value) => `$${value}`}
                onChange={(marketing) => updateDecision({ marketing })}
                color="bg-blue-500"
              />
            </div>

            {/* Warning for over-budget */}
            {!canAffordMarketing && (
              <Card className="mb-6 border-orange-200 bg-orange-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <p className="font-semibold text-orange-800">Budget Warning!</p>
                    <p className="text-sm text-orange-700">
                      You don't have enough budget for this much marketing. Reduce your marketing spend to continue.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low budget warning */}
            {budget < 30 && budget > 20 && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="text-2xl">🚨</div>
                  <div>
                    <p className="font-semibold text-red-800">Low Budget Alert!</p>
                    <p className="text-sm text-red-700">
                      Your budget is getting low. Make wise decisions to turn a profit and continue playing!
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game over warning */}
            {budget <= 20 && (
              <Card className="mb-6 border-red-300 bg-red-100">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="text-2xl">💀</div>
                  <div>
                    <p className="font-semibold text-red-900">Game Over!</p>
                    <p className="text-sm text-red-800">
                      You don't have enough budget to cover the minimum $20 fixed costs. Reset the game to start over.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={runSimulation}
                disabled={!canAffordMarketing || budget <= 20 || (gameMode === 'multi' && !currentTeam)}
                size="lg"
                className="text-lg px-8 py-3 bg-primary hover:bg-primary/90"
              >
                <Play className="w-5 h-5 mr-2" />
                {budget <= 20 ? 'Insufficient Budget' : 'Start Your Business Day!'}
              </Button>
              
              <Button
                onClick={resetGame}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-3"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                {budget <= 20 ? 'Start Over' : 'Reset Game'}
              </Button>
            </div>

            {/* Team Selection Warning */}
            {gameMode === 'multi' && !currentTeam && teams.length > 0 && (
              <Card className="mt-4 border-amber-200 bg-amber-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="text-2xl">👥</div>
                  <div>
                    <p className="font-semibold text-amber-800">Select a Team</p>
                    <p className="text-sm text-amber-700">
                      Choose which team is playing this round from the team manager above.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Instructions */}
            <Card className="mt-8 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">🎯 How to Play</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>💰 Price:</strong> Lower prices attract more customers, but you make less per cup.</p>
                <p><strong>⭐ Quality:</strong> Higher quality costs more but creates happier customers who buy more.</p>
                <p><strong>📢 Marketing:</strong> Spending on ads brings more people to your stand.</p>
                <p><strong>🎲 Random Events:</strong> Weather and other factors will affect your sales too!</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage 