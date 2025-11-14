import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Palette, 
  User, 
  Shield, 
  Bell, 
  Key,
  ChevronRight,
  Download,
  Trash2
} from "lucide-react";

type SettingsCategory = "appearance" | "account" | "privacy" | "notifications" | "api";

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("appearance");
  const [settings, setSettings] = useState({
    appearance: {
      theme: "light",
      highContrast: false,
    },
    chat: {
      messageDensity: "comfortable",
      showTimestamps: true,
    },
    privacy: {
      shareData: false,
      analytics: true,
    },
    notifications: {
      email: true,
      push: true,
      desktop: false,
    },
  });

  const categories = [
    { id: "appearance" as const, name: "Appearance", icon: Palette },
    { id: "account" as const, name: "Account", icon: User },
    { id: "privacy" as const, name: "Privacy", icon: Shield },
    { id: "notifications" as const, name: "Notifications", icon: Bell },
    { id: "api" as const, name: "API & Keys", icon: Key },
  ];

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <div className="flex gap-2">
            <Button variant="outline">Reset</Button>
            <Button className="bg-primary hover:bg-primary-hover">
              Save changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <nav className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <category.icon className="w-4 h-4" />
                      {category.name}
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              {/* Appearance Settings */}
              {activeCategory === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Theme</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Appearance</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Switch between Light and Dark modes for the entire app.
                        </p>
                        <Select
                          value={settings.appearance.theme}
                          onValueChange={(value) => updateSetting("appearance", "theme", value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">High Contrast</Label>
                          <p className="text-sm text-muted-foreground">
                            Increase contrast for improved readability.
                          </p>
                        </div>
                        <Switch
                          checked={settings.appearance.highContrast}
                          onCheckedChange={(checked) => 
                            updateSetting("appearance", "highContrast", checked)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Chat Preferences</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Message Density</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Choose how compact messages appear in chat.
                        </p>
                        <Select
                          value={settings.chat.messageDensity}
                          onValueChange={(value) => updateSetting("chat", "messageDensity", value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compact">Compact</SelectItem>
                            <SelectItem value="comfortable">Comfortable</SelectItem>
                            <SelectItem value="spacious">Spacious</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Show Timestamps</Label>
                          <p className="text-sm text-muted-foreground">
                            Display time next to each message in conversations.
                          </p>
                        </div>
                        <Switch
                          checked={settings.chat.showTimestamps}
                          onCheckedChange={(checked) => 
                            updateSetting("chat", "showTimestamps", checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Settings */}
              {activeCategory === "privacy" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Data & Privacy</h2>
                    
                    <div className="space-y-4">
                      <Card className="p-4 bg-muted/50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium">Clear Chat History</p>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Permanently remove all your past chats from this device.
                        </p>
                      </Card>

                      <Card className="p-4 bg-muted/50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium">Export Data</p>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Download your messages as a JSON file.
                        </p>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeCategory === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Notifications</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive email updates about important events.
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.email}
                          onCheckedChange={(checked) => 
                            updateSetting("notifications", "email", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Get push notifications on your mobile device.
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.push}
                          onCheckedChange={(checked) => 
                            updateSetting("notifications", "push", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Desktop Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Show notifications on your desktop when the app is open.
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.desktop}
                          onCheckedChange={(checked) => 
                            updateSetting("notifications", "desktop", checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Settings */}
              {activeCategory === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Account Information</h2>
                    <p className="text-muted-foreground">
                      Manage your account settings and preferences.
                    </p>
                  </div>
                </div>
              )}

              {/* API Settings */}
              {activeCategory === "api" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">API & Keys</h2>
                    <p className="text-muted-foreground">
                      Manage API keys and integrations.
                    </p>
                  </div>
                </div>
              )}

              {/* About Section */}
              <div className="mt-12 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">About</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Legend of Calicdan</strong></p>
                  <p>Version 1.2.0 • Stable</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}