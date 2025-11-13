import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Conversations",
      description: "Get intelligent responses and assistance for any task or question.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Experience instant responses with our optimized chat interface.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your conversations are protected with enterprise-grade security.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      <div className="container mx-auto px-6">
        {/* Hero Section */}
        <div className="pt-20 pb-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
              Meet your AI Chat Assistant
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              A clean, fast, and reliable chatbot interface inspired by modern tools. 
              Ask questions, brainstorm ideas, and get work done faster.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-3 text-lg"
                onClick={() => navigate("/chat")}
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-3 text-lg"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="pb-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              Why Choose Our AI Assistant?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 text-center border-border shadow-soft hover:shadow-medium transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Product Preview Area */}
        <div className="pb-20">
          <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-to-r from-accent/30 to-primary/10 border-accent">
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              Product Preview Area
            </h3>
            <p className="text-muted-foreground">
              Experience the power of AI-driven conversations with our intuitive interface.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}