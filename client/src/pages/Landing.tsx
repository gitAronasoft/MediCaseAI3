import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Scale, Brain, Users } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mr-3">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-dark">LegalMed</h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Medical Case Management for Law Firms
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline your medical legal cases with AI-powered document analysis, 
            chronological bill review, and intelligent demand letter generation.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Document Analysis</h3>
              <p className="text-gray-600 text-sm">
                AI-powered extraction of key medical information from documents
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <Brain className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-gray-600 text-sm">
                Interactive chat interface for content editing and refinement
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">$</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Bill Management</h3>
              <p className="text-gray-600 text-sm">
                Chronological review and verification of medical bills
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Team Collaboration</h3>
              <p className="text-gray-600 text-sm">
                Secure document sharing and case collaboration tools
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
              <p className="text-gray-600 mb-6">
                Sign in to access your medical case management dashboard
              </p>
              <Button 
                onClick={handleLogin}
                size="lg" 
                className="w-full bg-primary hover:bg-primary-light"
              >
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
