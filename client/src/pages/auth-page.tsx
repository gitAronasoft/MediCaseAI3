import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Redirect } from "wouter";
import { Scale, Shield, FileText, Brain } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Left side - Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex-col justify-center text-white">
        <div className="max-w-md">
          <div className="flex items-center mb-8">
            <Scale className="h-10 w-10 mr-3" />
            <h1 className="text-3xl font-bold">LegalMed</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            AI-Powered Medical Legal Case Management
          </h2>
          
          <p className="text-xl mb-8 text-blue-100">
            Streamline your medical legal workflow with intelligent document analysis, 
            case management, and AI-powered insights.
          </p>

          <div className="space-y-4">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-3 text-blue-200" />
              <span className="text-lg">Smart document analysis and extraction</span>
            </div>
            <div className="flex items-center">
              <Brain className="h-6 w-6 mr-3 text-blue-200" />
              <span className="text-lg">AI-powered case insights</span>
            </div>
            <div className="flex items-center">
              <Shield className="h-6 w-6 mr-3 text-blue-200" />
              <span className="text-lg">Secure case and document management</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="w-full">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to your account to continue managing your cases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Enter your username"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
    </div>
  );
}