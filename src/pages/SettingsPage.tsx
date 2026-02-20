/**
 * SettingsPage - Player preferences and app configuration.
 *
 * Includes theme toggle, sound settings, player name edit,
 * about section, and reset local data option.
 *
 * Route: /settings
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  User,
  Info,
  Trash2,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useGameStore } from "@/store/game-store";

export default function SettingsPage() {
  const { toast } = useToast();
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const clearGameState = useGameStore((s) => s.clearGameState);

  // Theme state (syncs with ThemeToggle component)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // Sound effects setting (stored in localStorage for future implementation)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem("sound-enabled");
    return stored !== "false"; // Default to true
  });

  // Notifications setting
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => {
      const stored = localStorage.getItem("notifications-enabled");
      return stored !== "false"; // Default to true
    }
  );

  // Player name editing
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(currentPlayer?.name ?? "");

  // Keep document class in sync with theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    toast({
      title: `Theme changed to ${next} mode`,
      duration: 2000,
    });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("sound-enabled", String(next));
    toast({
      title: next ? "Sound effects enabled" : "Sound effects disabled",
      duration: 2000,
    });
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem("notifications-enabled", String(next));
    toast({
      title: next ? "Notifications enabled" : "Notifications disabled",
      duration: 2000,
    });
  };

  const handleSaveName = () => {
    if (newName.trim() && newName.trim() !== currentPlayer?.name) {
      // For now, just show a toast - actual update would require Supabase sync
      toast({
        title: "Name update",
        description:
          "Name changes require re-joining the game. Your current progress will be preserved.",
        duration: 4000,
      });
    }
    setEditingName(false);
  };

  const handleResetData = () => {
    clearGameState();
    toast({
      title: "Data cleared",
      description: "All local game data has been reset.",
      duration: 3000,
    });
    // Navigate to home after reset
    window.location.href = "/";
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your preferences and app settings.
        </p>
      </div>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === "light" ? (
              <Sun className="h-5 w-5 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 text-blue-400" />
            )}
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the app looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme-toggle" className="text-sm font-medium">
                Dark Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              id="theme-toggle"
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound & Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-emerald-500" />
            Sound & Notifications
          </CardTitle>
          <CardDescription>
            Control sound effects and notification preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="space-y-0.5">
                <Label htmlFor="sound-toggle" className="text-sm font-medium">
                  Sound Effects
                </Label>
                <p className="text-xs text-muted-foreground">
                  Play sounds for game actions (coming soon)
                </p>
              </div>
            </div>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={toggleSound}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 text-muted-foreground" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="space-y-0.5">
                <Label
                  htmlFor="notifications-toggle"
                  className="text-sm font-medium"
                >
                  In-App Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Show toast messages for game events
                </p>
              </div>
            </div>
            <Switch
              id="notifications-toggle"
              checked={notificationsEnabled}
              onCheckedChange={toggleNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Player Profile Section */}
      {currentPlayer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Player Profile
            </CardTitle>
            <CardDescription>
              View and edit your player information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-name" className="text-sm font-medium">
                Display Name
              </Label>
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    id="player-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={20}
                    className="max-w-[200px]"
                  />
                  <Button size="sm" onClick={handleSaveName}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingName(false);
                      setNewName(currentPlayer.name);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium">
                    {currentPlayer.name}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingName(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Room Code</p>
                <p className="font-medium">{currentPlayer.roomCode}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Level</p>
                <p className="font-medium">{currentPlayer.currentLevel} / 50</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Profit</p>
                <p className="font-medium">
                  ${currentPlayer.totalProfit.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Budget</p>
                <p className="font-medium">
                  ${currentPlayer.budget.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-purple-500" />
            About
          </CardTitle>
          <CardDescription>
            Information about the Lemonade Stand game.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Platform</p>
              <p className="font-medium">Web App (PWA)</p>
            </div>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Credits</p>
            <p>
              Built for teen entrepreneurship education. Designed to teach
              business concepts through hands-on simulation.
            </p>
          </div>

          <Link to="/how-to-play">
            <Button variant="outline" className="w-full gap-2">
              <HelpCircle className="h-4 w-4" />
              How to Play Guide
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Actions here cannot be undone. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Reset All Local Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your local game data,
                  including your player profile, progress, and settings. You
                  will need to rejoin a room to play again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetData}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
