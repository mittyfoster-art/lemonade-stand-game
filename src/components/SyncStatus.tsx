import { useGameStore } from '@/store/game-store'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useRef } from 'react'
import { toast } from '@/hooks/use-toast'

/**
 * Sync status indicator shown in the app layout. Displays the current
 * sync state (synced / syncing / failed) and offers a manual retry button
 * when sync permanently fails after all retries are exhausted.
 */
export function SyncStatus() {
  const isSyncing = useGameStore((s) => s.isSyncing)
  const lastSyncError = useGameStore((s) => s.lastSyncError)
  const retrySyncManually = useGameStore((s) => s.retrySyncManually)
  const currentPlayer = useGameStore((s) => s.currentPlayer)
  const prevErrorRef = useRef<string | null>(null)

  // Show toast when a new sync error appears
  useEffect(() => {
    if (lastSyncError && lastSyncError !== prevErrorRef.current) {
      toast({
        title: 'Sync failed',
        description: lastSyncError,
        variant: 'destructive',
      })
    }
    prevErrorRef.current = lastSyncError
  }, [lastSyncError])

  // Only show when a player is active
  if (!currentPlayer) return null

  if (lastSyncError) {
    return (
      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">Not saved</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          onClick={retrySyncManually}
          title="Retry sync"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs font-medium hidden sm:inline">Saving...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-4 w-4" />
      <span className="text-xs font-medium hidden sm:inline">Saved</span>
    </div>
  )
}
