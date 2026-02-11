import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function LoadingSimulation() {
  return (
    <Card className="border-2">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
        <h3 className="text-xl font-bold mb-2">🍋 Running Your Lemonade Stand...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Customers are discovering your stand, tasting your lemonade, and making their decisions. 
          Let's see how your business choices work out!
        </p>
        <div className="mt-6 flex gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </CardContent>
    </Card>
  )
}