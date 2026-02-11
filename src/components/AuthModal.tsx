import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGameStore } from '@/store/game-store'
import { Loader2, Mail, KeyRound } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  
  const { sendOTP, verifyOTP, isAuthenticating } = useGameStore()
  const { toast } = useToast()
  
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    
    try {
      await sendOTP(email.trim())
      setStep('otp')
      toast({
        title: "Verification code sent!",
        description: `Check your email at ${email}`,
      })
    } catch (error) {
      toast({
        title: "Failed to send code",
        description: "Please check your email and try again.",
        variant: "destructive"
      })
    }
  }
  
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp.trim()) return
    
    try {
      await verifyOTP(email, otp.trim())
      toast({
        title: "Welcome!",
        description: "You're now logged in and can create/join game rooms.",
      })
      onSuccess?.()
      onClose()
      // Reset form
      setStep('email')
      setEmail('')
      setOtp('')
    } catch (error) {
      toast({
        title: "Invalid code",
        description: "Please check your verification code and try again.",
        variant: "destructive"
      })
    }
  }
  
  const handleClose = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'email' ? (
              <>
                <Mail className="h-5 w-5" />
                Sign in to create/join rooms
              </>
            ) : (
              <>
                <KeyRound className="h-5 w-5" />
                Enter verification code
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'email' ? (
          <div key="email">
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isAuthenticating}
                  autoFocus
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isAuthenticating}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isAuthenticating || !email.trim()}
                  className="flex-1"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send verification code'
                  )}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div key="otp">
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  disabled={isAuthenticating}
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Code sent to {email}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('email')}
                  disabled={isAuthenticating}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isAuthenticating || !otp.trim()}
                  className="flex-1"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}