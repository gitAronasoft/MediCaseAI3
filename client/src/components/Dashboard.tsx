import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase,
  DollarSign,
  FileText,
  Brain,
  TrendingUp,
  Upload,
  Plus,
} from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCaseSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertCaseSchema.omit({ createdBy: true }).extend({
  clientName: z.string().min(1, "Client name is required"),
  caseNumber: z.string().min(1, "Case number is required"),
  caseType: z.string().min(1, "Case type is required"),
  description: z.string().optional(),
});

function RecentProcessing() {
  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents'],
    enabled: true
  });

  const recentProcessed = Array.isArray(documents) ? 
    documents.filter((doc: any) => doc.aiProcessed).slice(0, 3) : [];

  if (recentProcessed.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent document processing</p>
        <p className="text-xs mt-1">Upload documents to see AI analysis results</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentProcessed.map((doc: any) => (
        <div key={doc.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-dark truncate">
              {doc.fileName}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {doc.aiSummary?.substring(0, 80)}...
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                AI Processed
              </Badge>
              <span className="text-xs text-gray-500">
                {new Date(doc.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary-light">
              View
            </Button>
          </div>
        </div>
      ))}
      <div className="pt-2">
        <Link href="/documents">
          <Button variant="outline" size="sm" className="w-full">
            View All Documents
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface DashboardStats {
  activeCases: number;
  pendingBills: string;
  documentsProcessed: number;
  aiExtractions: number;
}

export default function Dashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["/api/cases"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const recentCases = Array.isArray(cases) ? cases.slice(0, 3) : [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      caseNumber: "",
      caseType: "",
      description: "",
      status: "active",
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Add createdBy field from user data
      const caseData = {
        ...data,
        createdBy: user?.id || ""
      };
      const response = await apiRequest("/api/cases", "POST", caseData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Case created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create case",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createCaseMutation.mutate(data);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Case Management Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage medical cases, documents, and billing efficiently</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              try {
                const response = await fetch('/api/demo/populate', { method: 'POST' });
                if (response.ok) {
                  window.location.reload();
                }
              } catch (error) {
                console.error('Failed to populate demo data:', error);
              }
            }}
            variant="outline"
            className="border-secondary text-secondary hover:bg-secondary hover:text-white"
          >
            Add Demo Data
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-600 text-white hover:text-white transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                <Plus className="w-4 h-4 mr-2" />
                New Case
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Case</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter client name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="caseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Case Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., MED-2024-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="caseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select case type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Personal Injury - Motor Vehicle Accident">Personal Injury - Motor Vehicle Accident</SelectItem>
                            <SelectItem value="Medical Malpractice - Surgical Error">Medical Malpractice - Surgical Error</SelectItem>
                            <SelectItem value="Workers Compensation - Workplace Injury">Workers Compensation - Workplace Injury</SelectItem>
                            <SelectItem value="Product Liability">Product Liability</SelectItem>
                            <SelectItem value="Slip and Fall">Slip and Fall</SelectItem>
                            <SelectItem value="Medical Negligence">Medical Negligence</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the case..."
                            className="resize-none"
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={createCaseMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-primary hover:bg-primary-light"
                      disabled={createCaseMutation.isPending}
                    >
                      {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Cases</p>
                    <p className="text-3xl font-bold text-neutral-dark">
                      {stats?.activeCases || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Bills</p>
                    <p className="text-3xl font-bold text-neutral-dark">
                      {stats?.pendingBills || "$0"}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Documents Processed</p>
                    <p className="text-3xl font-bold text-neutral-dark">
                      {stats?.documentsProcessed || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Extractions</p>
                    <p className="text-3xl font-bold text-neutral-dark">
                      {stats?.aiExtractions || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Recent Cases and Document Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Cases */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Cases</CardTitle>
                  <Link href="/cases">
                    <Button variant="link" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {casesLoading ? (
                  <div className="text-center py-4">Loading cases...</div>
                ) : recentCases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No cases found</p>
                    <p className="text-sm">Create your first case to get started</p>
                  </div>
                ) : (
                  recentCases.map((caseItem: any) => (
                    <Link key={caseItem.id} href={`/cases/${caseItem.id}`}>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {caseItem.clientName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-dark">{caseItem.clientName}</h4>
                            <p className="text-sm text-gray-600">{caseItem.caseType} • {caseItem.caseNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={caseItem.status === 'active' ? 'default' : 'secondary'}>
                            {caseItem.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(caseItem.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Document Processing Center</CardTitle>
                <p className="text-sm text-gray-600">Upload and analyze case documents with AI</p>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors mb-6">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-neutral-dark mb-2">Drop files here to upload</h4>
                  <p className="text-gray-600 mb-4">Support for PDF, DOC, DOCX, and image files</p>
                  <Link href="/documents">
                    <Button>
                      Choose Files
                    </Button>
                  </Link>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-neutral-dark">Recent Processing</h4>
                  <RecentProcessing />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
