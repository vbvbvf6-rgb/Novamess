import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Bell, Moon, Lock, Shield, Smartphone, Save, Sun, Palette, MessageSquare, Database, Edit3, CheckCircle } from "lucide-react";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const AVATAR_COLORS = [
  "#3B82F6", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6",
  "#06B6D4", "#EF4444", "#F97316", "#14B8A6", "#84CC16",
  "#6366F1", "#A855F7", "#E11D48", "#059669", "#D97706",
];

const STATUS_PRESETS = [
  { emoji: "💬", text: "Available" },
  { emoji: "🔕", text: "Do not disturb" },
  { emoji: "📍", text: "At the office" },
  { emoji: "🏠", text: "Working from home" },
  { emoji: "🚗", text: "Commuting" },
  { emoji: "😴", text: "Sleeping" },
  { emoji: "🎮", text: "Gaming" },
  { emoji: "🎧", text: "Listening to music" },
];

export default function Settings() {
  const { isDark, toggleTheme } = useAppContext();
  const { data: user } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");
  const [avatarColor, setAvatarColor] = useState("#3B82F6");
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setStatusText((user as any).statusText || "");
      setAvatarColor(user.avatarColor || "#3B82F6");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const changed =
      displayName !== (user.displayName || "") ||
      bio !== (user.bio || "") ||
      statusText !== ((user as any).statusText || "") ||
      avatarColor !== (user.avatarColor || "#3B82F6");
    setHasChanges(changed);
  }, [displayName, bio, statusText, avatarColor, user]);

  const handleSave = () => {
    updateMe.mutate(
      { data: { displayName, bio, avatarColor, statusText } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
          setHasChanges(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          toast({ title: "Profile saved", description: "Your changes have been saved." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <SettingsIcon className="text-primary" size={22} /> Settings
        </h1>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateMe.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? "Saved!" : "Save changes"}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl w-full mx-auto scrollbar-thin space-y-6">

        {/* Profile Section */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Edit3 size={14} /> My Profile
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {/* Avatar Preview + Color Picker */}
            <div className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg"
                  style={{ backgroundColor: avatarColor }}
                >
                  {displayName[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-semibold">{displayName || "Your name"}</p>
                  {statusText && <p className="text-sm text-muted-foreground">{statusText}</p>}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Avatar Color</Label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        avatarColor === color ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <Label htmlFor="displayName" className="text-sm font-medium mb-1 block">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="bg-background"
                />
              </div>
              <div>
                <Label htmlFor="bio" className="text-sm font-medium mb-1 block">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>
            </div>

            {/* Status */}
            <div className="p-4">
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Input
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's on your mind?"
                className="bg-background mb-3"
              />
              <div className="flex flex-wrap gap-2">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset.text}
                    onClick={() => setStatusText(`${preset.emoji} ${preset.text}`)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      statusText === `${preset.emoji} ${preset.text}`
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border hover:border-primary/50 hover:bg-secondary"
                    }`}
                  >
                    {preset.emoji} {preset.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Palette size={14} /> Appearance
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  {isDark ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <Label className="text-base font-medium cursor-pointer" onClick={toggleTheme}>
                    {isDark ? "Dark Mode" : "Light Mode"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isDark ? "Currently using dark theme" : "Currently using light theme"}
                  </p>
                </div>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                  <Smartphone size={20} />
                </div>
                <div>
                  <Label className="text-base font-medium">Reduce Animations</Label>
                  <p className="text-sm text-muted-foreground">Disable complex visual effects</p>
                </div>
              </div>
              <Switch checked={false} />
            </div>
          </div>
        </section>

        {/* Chats Settings */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <MessageSquare size={14} /> Chats
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-base font-medium">Save to Gallery</h3>
                  <p className="text-sm text-muted-foreground">Auto-save received photos</p>
                </div>
              </div>
              <Switch checked={false} />
            </div>
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-base font-medium">Storage Usage</h3>
                  <p className="text-sm text-muted-foreground">Manage cached data and media</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>124 MB</span>
                <span>›</span>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/10 text-teal-500 rounded-lg">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-medium">Default Mute</h3>
                  <p className="text-sm text-muted-foreground">Mute new chats by default</p>
                </div>
              </div>
              <Switch checked={false} />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Bell size={14} /> Notifications
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                  <Bell size={20} />
                </div>
                <div>
                  <Label className="text-base font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive messages when app is closed</p>
                </div>
              </div>
              <Switch checked={true} />
            </div>
            
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
                  <Bell size={20} />
                </div>
                <div>
                  <Label className="text-base font-medium">Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">Play sounds for incoming messages</p>
                </div>
              </div>
              <Switch checked={true} />
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Lock size={14} /> Privacy & Security
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-medium">Privacy Settings</h3>
                  <p className="text-sm text-muted-foreground">Control who can see your activity</p>
                </div>
              </div>
              <span className="text-muted-foreground">›</span>
            </div>
            
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-medium">Blocked Users</h3>
                  <p className="text-sm text-muted-foreground">Manage your blocked contacts</p>
                </div>
              </div>
              <span className="text-muted-foreground">›</span>
            </div>
          </div>
        </section>

        <div className="flex justify-center pt-6 pb-12">
          <button className="text-destructive hover:bg-destructive/10 px-6 py-3 rounded-xl font-bold transition-colors">
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}
