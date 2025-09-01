import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertCaseSchema, type Case } from "../../../shared/schema";
import { z } from "zod";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  User,
  Hash,
  Clock,
  Edit,
  Upload,
  Download,
  Brain,
  Trash2,
} from "lucide-react";
import DocumentsView from "@/components/DocumentsView";
import MedicalBillsView from "@/components/MedicalBillsView";

// Create update schema that excludes createdBy field for updates
const updateCaseSchema = insertCaseSchema.omit({ createdBy: true });
type UpdateCaseFormData = z.infer<typeof updateCaseSchema>;

export default function CaseDetailsPage() {
  const { caseId } = useParams();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: [`/api/cases/${caseId}`],
    enabled: !!caseId,
  });

  const { data: caseDocuments = [], isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/cases/${caseId}/documents`],
    enabled: !!caseId,
  });

  const { data: caseBills = [], isLoading: billsLoading } = useQuery({
    queryKey: [`/api/cases/${caseId}/bills`],
    enabled: !!caseId,
  });

  // Form for editing case
  const form = useForm<UpdateCaseFormData>({
    resolver: zodResolver(updateCaseSchema),
    defaultValues: {
      clientName: "",
      caseNumber: "",
      caseType: "",
      status: "active",
      description: "",
    },
  });

  // Update form when caseData changes
  useEffect(() => {
    if (caseData && typeof caseData === 'object') {
      const data = caseData as Case;
      form.reset({
        clientName: data.clientName || "",
        caseNumber: data.caseNumber || "",
        caseType: data.caseType || "",
        status: data.status || "active",
        description: data.description || "",
      });
    }
  }, [caseData, form]);

  // Mutation for updating case
  const updateCaseMutation = useMutation({
    mutationFn: async (data: UpdateCaseFormData) => {
      const response = await apiRequest(`/api/cases/${caseId}`, "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Case Updated",
        description: "Case details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update case.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateCaseFormData) => {
    updateCaseMutation.mutate(data);
  };

  if (caseLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading case details...</div>
        </div>
      </Layout>
    );
  }

  if (!caseData || typeof caseData !== 'object') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Case Not Found</h2>
            <p className="text-gray-600 mb-4">The requested case could not be found.</p>
            <Link href="/cases">
              <Button>Back to Cases</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const totalDocuments = Array.isArray(caseDocuments) ? caseDocuments.length : 0;
  const processedDocuments = Array.isArray(caseDocuments) ? caseDocuments.filter((doc: any) => doc.aiProcessed).length : 0;
  const totalBills = Array.isArray(caseBills) ? caseBills.length : 0;
  const totalBillAmount = Array.isArray(caseBills) ? caseBills.reduce((sum: number, bill: any) => {
    const amount = parseFloat(String(bill.amount || '0').replace(/[^0-9.-]/g, ''));
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0) : 0;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/cases">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Cases
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-2xl font-bold text-neutral-dark">{(caseData as any)?.clientName || 'Unknown'}</h1>
              <p className="text-gray-600">{(caseData as any)?.caseType || 'Unknown'} • Case #{(caseData as any)?.caseNumber || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={(caseData as any)?.status === 'active' ? 'default' : 'secondary'} className="text-sm">
              {(caseData as any)?.status || 'Unknown'}
            </Badge>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Case
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Case Details</DialogTitle>
                  <DialogDescription>
                    Update the case information below. All fields are required except description.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="clientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., John Smith" {...field} />
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
                              <Input placeholder="e.g., CASE-2024-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="caseType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Case Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Personal Injury" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter case description..."
                              className="min-h-[100px]"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateCaseMutation.isPending}
                        className="bg-primary hover:bg-blue-600 text-white"
                      >
                        {updateCaseMutation.isPending ? "Updating..." : "Update Case"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Case Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Documents</p>
                  <p className="text-2xl font-bold text-neutral-dark">{totalDocuments}</p>
                  <p className="text-xs text-gray-500">{processedDocuments} AI processed</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Medical Bills</p>
                  <p className="text-2xl font-bold text-neutral-dark">{totalBills}</p>
                  <p className="text-xs text-gray-500">${totalBillAmount.toFixed(2)} total</p>
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
                  <p className="text-sm font-medium text-gray-600">Created</p>
                  <p className="text-2xl font-bold text-neutral-dark">
                    {new Date((caseData as any)?.createdAt || Date.now()).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date((caseData as any)?.createdAt || Date.now()).getFullYear()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                  <p className="text-2xl font-bold text-neutral-dark">
                    {new Date((caseData as any)?.updatedAt || Date.now()).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.ceil((Date.now() - new Date((caseData as any)?.updatedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))} days ago
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Case Details */}
        <Card>
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Client Name</span>
                </div>
                <p className="text-neutral-dark">{(caseData as any)?.clientName || 'Unknown'}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <Hash className="w-4 h-4" />
                  <span>Case Number</span>
                </div>
                <p className="text-neutral-dark">{(caseData as any)?.caseNumber || 'N/A'}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  <span>Case Type</span>
                </div>
                <p className="text-neutral-dark">{(caseData as any)?.caseType || 'Unknown'}</p>
              </div>
            </div>
            
            {(caseData as any)?.description && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-600">Description</h4>
                <p className="text-neutral-dark leading-relaxed">{(caseData as any)?.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Documents and Bills */}
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Documents ({totalDocuments})</span>
            </TabsTrigger>
            <TabsTrigger value="bills" className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Medical Bills ({totalBills})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6">
            <CaseDocumentsView caseId={caseId!} documents={Array.isArray(caseDocuments) ? caseDocuments : []} isLoading={documentsLoading} />
          </TabsContent>

          <TabsContent value="bills" className="space-y-6">
            <CaseBillsView caseId={caseId!} bills={Array.isArray(caseBills) ? caseBills : []} isLoading={billsLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Simplified documents view for case details
function CaseDocumentsView({ caseId, documents, isLoading }: { caseId: string; documents: any[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const handleDownload = async (documentId: string, fileName: string) => {
    if (downloadingIds.has(documentId)) return;
    
    setDownloadingIds(prev => new Set(prev.add(documentId)));
    try {
      // Use fetch directly for file downloads to avoid JSON parsing issues
      const response = await fetch(`/api/documents/${documentId}/download`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete document");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const handleDeleteDocument = (documentId: string) => {
    setDeletingDocumentId(documentId);
  };

  const confirmDelete = () => {
    if (deletingDocumentId) {
      deleteDocumentMutation.mutate(deletingDocumentId);
      setDeletingDocumentId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading documents...</div>;
  }

  if (!Array.isArray(documents) || documents.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No documents uploaded</h3>
          <p className="text-gray-600 mb-4">Upload documents to get started with AI analysis.</p>
          <Link href="/documents">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Documents
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc: any) => (
        <Card key={doc.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-neutral-dark mb-1">{doc.fileName}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    <span>{doc.mimeType}</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  {doc.aiProcessed && doc.aiSummary && (
                    <p className="text-sm text-gray-700 mb-2">{doc.aiSummary}</p>
                  )}
                  <div className="flex items-center space-x-2">
                    {doc.aiProcessed ? (
                      <Badge variant="secondary" className="text-xs">
                        <Brain className="w-3 h-3 mr-1" />
                        AI Processed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Pending Analysis
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {doc.aiProcessed && (
                  <Link href={`/documents/${doc.id}`}>
                    <Button variant="outline" size="sm">
                      <Brain className="w-4 h-4 mr-2" />
                      View AI Analysis
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownload(doc.id, doc.fileName)}
                  disabled={downloadingIds.has(doc.id)}
                  data-testid="button-download"
                >
                  {downloadingIds.has(doc.id) ? (
                    <Brain className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {downloadingIds.has(doc.id) ? "Downloading..." : "Download"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid={`button-delete-${doc.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDocumentId} onOpenChange={(open) => !open && setDeletingDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone and will permanently remove the document from both the database and cloud storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Simplified bills view for case details
function CaseBillsView({ caseId, bills, isLoading }: { caseId: string; bills: any[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="text-center py-8">Loading medical bills...</div>;
  }

  if (!Array.isArray(bills) || bills.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No medical bills found</h3>
          <p className="text-gray-600 mb-4">Add medical bills to track case expenses.</p>
          <Link href="/bills">
            <Button>
              <DollarSign className="w-4 h-4 mr-2" />
              Manage Bills
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = bills.reduce((sum: number, bill: any) => {
    const amount = parseFloat(String(bill.amount || '0').replace(/[^0-9.-]/g, ''));
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Bills Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-neutral-dark">${totalAmount.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Total Amount</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-dark">{bills.length}</p>
              <p className="text-sm text-gray-600">Total Bills</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                ${bills.filter((b: any) => b.status === 'verified').reduce((s: number, b: any) => {
                  const amount = parseFloat(String(b.amount || '0').replace(/[^0-9.-]/g, ''));
                  return s + (isNaN(amount) ? 0 : amount);
                }, 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">Verified</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <div className="space-y-4">
        {bills.map((bill: any) => (
          <Card key={bill.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-dark mb-1">{bill.provider}</h4>
                    <p className="text-sm text-gray-600 mb-2">{bill.treatment}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Service: {new Date(bill.serviceDate).toLocaleDateString()}</span>
                      <span>Billed: {new Date(bill.billDate).toLocaleDateString()}</span>
                      {bill.insurance && <span>Insurance: {bill.insurance}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-neutral-dark">${parseFloat(String(bill.amount || '0').replace(/[^0-9.-]/g, '')).toFixed(2)}</p>
                  <Badge variant={bill.status === 'verified' ? 'default' : bill.status === 'pending' ? 'secondary' : 'destructive'}>
                    {bill.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}