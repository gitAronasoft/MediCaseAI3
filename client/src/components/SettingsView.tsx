import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Settings, Lock, Mail, UserCircle, Cloud, Bot } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { AIPromptsManager } from "./AIPromptsManager";

const profileSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
});

const apiKeySchema = z.object({
  openaiApiKey: z.string().optional(),
  useAzureOpenAI: z.boolean().optional(),
  azureOpenAIEndpoint: z.string().optional(),
  azureOpenAIApiKey: z.string().optional(),
  azureOpenAIVersion: z.string().optional(),
  azureModelDeployment: z.string().optional(),
}).refine((data) => {
  if (data.useAzureOpenAI) {
    return data.azureOpenAIEndpoint && data.azureOpenAIApiKey && data.azureModelDeployment;
  } else {
    return data.openaiApiKey;
  }
}, {
  message: "Please fill in all required fields for your selected AI provider",
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type ApiKeyFormData = z.infer<typeof apiKeySchema>;

export default function SettingsView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const apiKeyForm = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      openaiApiKey: "",
      useAzureOpenAI: false,
      azureOpenAIEndpoint: "",
      azureOpenAIApiKey: "",
      azureOpenAIVersion: "2024-02-15-preview",
      azureModelDeployment: "",
    },
  });

  const watchUseAzure = apiKeyForm.watch("useAzureOpenAI");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("PUT", "/api/user/profile", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await apiRequest("PUT", "/api/user/password", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async (data: ApiKeyFormData) => {
      const response = await apiRequest("PUT", "/api/user/api-key", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI configuration updated successfully",
      });
      apiKeyForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI configuration",
        variant: "destructive",
      });
    },
  });

  const testApiMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/test/azure-api", {});
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.working !== false) {
        toast({
          title: "Azure API Test Successful",
          description: data.message,
        });
      } else {
        toast({
          title: "Azure API Test Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Azure API Test Failed",
        description: error.message || "Failed to test Azure API connectivity",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  const onApiKeySubmit = (data: ApiKeyFormData) => {
    updateApiKeyMutation.mutate(data);
  };

  const testAzureAPI = () => {
    testApiMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-dark">Settings</h2>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <UserCircle className="w-5 h-5 text-primary" />
              <CardTitle>Profile Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter username" 
                          className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address"
                          className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-blue-600 text-white hover:text-white transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle>Change Password</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter current password"
                          className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter new password"
                          className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Confirm new password"
                          className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-blue-600 text-white hover:text-white transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                    disabled={updatePasswordMutation.isPending}
                  >
                    {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <UserCircle className="w-5 h-5 text-primary" />
            <CardTitle>Account Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <User className="w-4 h-4" />
                  <span>User ID</span>
                </div>
                <p className="text-neutral-dark font-mono text-sm bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded transition-colors duration-200 cursor-default">
                  {user?.id || 'N/A'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <UserCircle className="w-4 h-4" />
                  <span>Username</span>
                </div>
                <p className="text-neutral-dark">{user?.username || 'N/A'}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </div>
                <p className="text-neutral-dark">{user?.email || 'N/A'}</p>
              </div>
            </div>

            {/* AI Provider Settings */}
            <div className="border-t pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Cloud className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium">AI Provider Configuration</h3>
              </div>
              <Form {...apiKeyForm}>
                <form onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)} className="space-y-6">
                  
                  {/* Provider Selection */}
                  <FormField
                    control={apiKeyForm.control}
                    name="useAzureOpenAI"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">AI Provider</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="openai"
                                checked={!field.value}
                                onChange={() => field.onChange(false)}
                                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                              />
                              <label htmlFor="openai" className="text-sm font-medium">
                                OpenAI API
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="azure"
                                checked={field.value}
                                onChange={() => field.onChange(true)}
                                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                              />
                              <label htmlFor="azure" className="text-sm font-medium">
                                Azure OpenAI
                              </label>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* OpenAI Configuration */}
                  {!watchUseAzure && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900">OpenAI Configuration</h4>
                      <FormField
                        control={apiKeyForm.control}
                        name="openaiApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input 
                                type="password"
                                placeholder="sk-..."
                                className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-600 mt-1">
                              Get your API key from{" "}
                              <a 
                                href="https://platform.openai.com/api-keys" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                OpenAI Platform
                              </a>
                            </p>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Azure OpenAI Configuration */}
                  {watchUseAzure && (
                    <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <h4 className="font-medium text-orange-900">Azure OpenAI Configuration</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={apiKeyForm.control}
                          name="azureOpenAIEndpoint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Azure Endpoint</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://your-resource.openai.azure.com"
                                  className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={apiKeyForm.control}
                          name="azureOpenAIApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Azure API Key</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password"
                                  placeholder="Your Azure OpenAI key"
                                  className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={apiKeyForm.control}
                          name="azureModelDeployment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model Deployment Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="gpt-4o"
                                  className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={apiKeyForm.control}
                          name="azureOpenAIVersion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Version</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="2024-02-15-preview"
                                  className="hover:border-primary/50 focus:border-primary transition-colors duration-200"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <p className="text-xs text-gray-600">
                        Configure your Azure OpenAI resource from{" "}
                        <a 
                          href="https://portal.azure.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Azure Portal
                        </a>
                      </p>
                    </div>
                  )}

                  <div className="flex justify-start space-x-4">
                    <Button
                      type="submit"
                      className="bg-primary hover:bg-blue-600 text-white hover:text-white transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                      disabled={updateApiKeyMutation.isPending}
                    >
                      {updateApiKeyMutation.isPending ? "Updating..." : "Update AI Configuration"}
                    </Button>

                    {watchUseAzure && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testAzureAPI}
                        disabled={testApiMutation.isPending}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                      >
                        {testApiMutation.isPending ? "Testing..." : "Test Azure API"}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Prompts Configuration Section */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-primary" />
            <CardTitle>AI Prompts Configuration</CardTitle>
          </div>
          <p className="text-sm text-gray-600">Customize AI prompts for different tasks</p>
        </CardHeader>
        <CardContent>
          <AIPromptsManager />
        </CardContent>
      </Card>
    </div>
  );
}