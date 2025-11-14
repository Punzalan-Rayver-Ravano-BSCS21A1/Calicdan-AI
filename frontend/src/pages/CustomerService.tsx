import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Paperclip, 
  Send, 
  MessageCircle, 
  Mail, 
  Phone, 
  Book, 
  Palette, 
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CustomerService() {
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    attachments: [] as File[],
  });
  const { toast } = useToast();

  const quickLinks = [
    {
      icon: Book,
      title: "Getting started",
      description: "Guide",
      action: () => {},
    },
    {
      icon: Palette,
      title: "Light & Dark mode",
      description: "How-to",
      action: () => {},
    },
    {
      icon: Shield,
      title: "Privacy controls",
      description: "Policy",
      action: () => {},
    },
  ];

  const contactOptions = [
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Get instant help from our support team",
      action: () => {},
    },
    {
      icon: Mail,
      title: "Email",
      description: "Send us a detailed message",
      action: () => {},
    },
    {
      icon: Phone,
      title: "Request Call",
      description: "Schedule a call with our team",
      action: () => {},
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and description fields.",
        variant: "destructive",
      });
      return;
    }

    // Simulate form submission
    toast({
      title: "Ticket Submitted",
      description: "We've received your support request and will get back to you soon.",
    });

    // Reset form
    setFormData({
      subject: "",
      description: "",
      attachments: [],
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customer Service</h1>
            <p className="text-muted-foreground mt-1">Legend of Calicdan</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Book className="w-4 h-4" />
              Help Center
            </Button>
            <Button className="bg-primary hover:bg-primary-hover flex items-center gap-2">
              <Send className="w-4 h-4" />
              Submit Ticket
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Describe your issue
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="subject" className="text-sm font-medium">
                    Brief subject
                  </Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      subject: e.target.value 
                    }))}
                    placeholder="Briefly describe your issue"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      description: e.target.value 
                    }))}
                    placeholder="Add details to help us troubleshoot..."
                    className="mt-2 min-h-[120px] resize-none"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Attachments</Label>
                  <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload" 
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Paperclip className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload files or drag and drop
                      </span>
                    </label>
                    
                    {formData.attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {formData.attachments.map((file, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between bg-muted p-2 rounded"
                          >
                            <span className="text-sm truncate">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  attachments: prev.attachments.filter((_, i) => i !== index)
                                }));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary-hover"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </form>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Quick links
              </h3>
              <div className="space-y-3">
                {quickLinks.map((link, index) => (
                  <button
                    key={index}
                    onClick={link.action}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                        <link.icon className="w-4 h-4 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {link.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {link.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Contact Options */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Contact options
              </h3>
              <div className="space-y-3">
                {contactOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={option.action}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-0.5">
                      <option.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {option.title}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}