import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Trophy, Trash2, Loader2 } from 'lucide-react'
import { useGameStore } from '@/store/game-store'
import { useToast } from '@/hooks/use-toast'

export function TeamManager() {
  const [newTeamName, setNewTeamName] = useState('')
  const [isAddingTeam, setIsAddingTeam] = useState(false)
  const { 
    teams, 
    currentTeam, 
    gameMode,
    currentGameRoom,
    addTeam, 
    selectTeam, 
    setGameMode,
    clearLeaderboard,
    isAuthenticated
  } = useGameStore()
  
  const { toast } = useToast()

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim() || newTeamName.length > 20) return
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add teams.",
        variant: "destructive"
      })
      return
    }

    setIsAddingTeam(true)
    try {
      await addTeam(newTeamName)
      setNewTeamName('')
      toast({
        title: "Team added!",
        description: `${newTeamName} joined the competition.`
      })
    } catch (error) {
      toast({
        title: "Failed to add team",
        description: "Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsAddingTeam(false)
    }
  }

  const handleModeSwitch = () => {
    if (gameMode === 'single') {
      setGameMode('multi')
    } else {
      setGameMode('single')
    }
  }

  // Don't show if no game room is active
  if (!currentGameRoom) {
    return null
  }

  if (gameMode === 'single') {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" />
            Team Competition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-600 mb-3 text-sm">
            Ready to add teams to this game room? Switch to team mode!
          </p>
          <Button 
            onClick={handleModeSwitch}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Add Teams to Room
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Trophy className="h-5 w-5" />
          Team Competition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new team */}
        <form onSubmit={handleAddTeam} className="flex gap-2">
          <Input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Enter team name (max 20 chars)"
            maxLength={20}
            className="flex-1"
            disabled={isAddingTeam}
          />
          <Button 
            type="submit" 
            disabled={!newTeamName.trim() || isAddingTeam || !isAuthenticated}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {isAddingTeam ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Current team display */}
        {currentTeam && (
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: currentTeam.color }}
            />
            <span className="font-medium text-purple-800">
              Playing as: {currentTeam.name}
            </span>
          </div>
        )}

        {/* Team selection */}
        {teams.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-purple-700">Select Team:</h4>
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <Badge
                  key={team.id}
                  variant={currentTeam?.id === team.id ? "default" : "secondary"}
                  className="cursor-pointer hover:opacity-80 text-white font-medium"
                  style={{ 
                    backgroundColor: currentTeam?.id === team.id ? team.color : '#6b7280',
                    borderColor: team.color 
                  }}
                  onClick={() => selectTeam(team.id)}
                >
                  {team.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleModeSwitch}
            className="text-purple-600 border-purple-300 hover:bg-purple-50"
          >
            Single Player
          </Button>
          {teams.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearLeaderboard}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}