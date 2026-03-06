import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/use-network-status'

/**
 * Banner displayed at the top of the app when the browser is offline.
 * Automatically hides when connectivity is restored.
 */
export function NetworkStatus() {
  const isOnline = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="h-4 w-4" />
      You are offline. Your progress is saved locally and will sync when you reconnect.
    </div>
  )
}
