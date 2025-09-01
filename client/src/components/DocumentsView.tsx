import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import DocumentReview from "@/components/DocumentReview";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Upload, Eye, Brain, Download, CheckCircle, Trash2 } from "lucide-react";
import type { UploadResult } from "@uppy/core";

export default function DocumentsView() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cases = [] } = useQuery({
    queryKey: ["/api/cases"],
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/cases", selectedCaseId, "documents"],
    enabled: !!selectedCaseId,
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/documents", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", selectedCaseId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setDocumentObjectMutation = useMutation({
    mutationFn: async ({ documentId, objectURL }: { documentId: string; objectURL: string }) => {
      const response = await apiRequest(`/api/documents/${documentId}/object`, "PUT", { objectURL });
      return response.json();
    },
  });

  const analyzeDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      // Add to analyzing set when starting
      setAnalyzingIds(prev => new Set(prev.add(documentId)));
      
      const response = await apiRequest(`/api/documents/${documentId}/analyze`, "POST");
      const result = await response.json();
      return { documentId, ...result };
    },
    onSuccess: (result) => {
      // Remove from analyzing set when complete
      setAnalyzingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(result.documentId);
        return newSet;
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/cases", selectedCaseId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Enhanced success message with extraction details
      const analysis = result.analysis;
      let description = "Document processed successfully!";
      
      if (analysis?.documentIntelligence) {
        const di = analysis.documentIntelligence;
        description = `Extracted content from ${di.pages} page(s). Found ${di.tablesFound} tables and ${di.keyValuePairsFound} key-value pairs.`;
      }
      
      if (analysis?.searchIndexed) {
        description += " Document is now searchable.";
      }
      
      toast({
        title: "Analysis Complete",
        description,
      });
    },
    onError: (error: Error, variables) => {
      // Remove from analyzing set on error
      setAnalyzingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables);
        return newSet;
      });
      
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze the document. Please check if the file is a valid PDF or image.",
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", selectedCaseId, "documents"] });
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

  const handleDownload = async (documentId: string, fileName: string) => {
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
    }
  };

  const handleView = async (documentId: string) => {
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
      
      // Open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to view document",
        variant: "destructive",
      });
    }
  };

  // Handle direct file upload to our server, which then uploads to Azure
  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0 && selectedCaseId) {
      let successfulUploads = 0;
      let failedUploads = 0;
      
      // Process all successful files, not just the first one
      for (const file of result.successful) {
        try {
          // The response should contain the object path from our server
          const uploadResponse = file.response;
          
          if (!uploadResponse?.body?.objectPath) {
            throw new Error("Upload response missing object path");
          }

          // Create document record
          const documentData = {
            caseId: selectedCaseId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            objectPath: uploadResponse.body.objectPath,
          };

          await createDocumentMutation.mutateAsync(documentData);
          successfulUploads++;
        } catch (error) {
          console.error("Error creating document record:", error);
          failedUploads++;
        }
      }
      
      // Show appropriate success/error message based on results
      if (successfulUploads > 0) {
        toast({
          title: "Success",
          description: `${successfulUploads} document${successfulUploads > 1 ? 's' : ''} uploaded successfully${failedUploads > 0 ? ` (${failedUploads} failed)` : ''}`,
        });
      }
      
      if (failedUploads > 0 && successfulUploads === 0) {
        toast({
          title: "Error",
          description: "Failed to upload documents",
          variant: "destructive",
        });
      }
    }
  };

  // If reviewing a document, show the review interface
  if (reviewingDocumentId) {
    return (
      <DocumentReview
        documentId={reviewingDocumentId}
        onClose={() => setReviewingDocumentId(null)}
      />
    );
  }

  if (isLoading && selectedCaseId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-dark">Documents</h2>
          <p className="text-gray-600">Upload and manage case documents</p>
        </div>
      </div>

      {/* Case Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Case</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a case to view documents" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(cases) ? cases.map((caseItem: any) => (
                <SelectItem key={caseItem.id} value={caseItem.id}>
                  {caseItem.clientName} - {caseItem.caseNumber}
                </SelectItem>
              )) : []}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCaseId && (
        <>
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Document Processing</CardTitle>
              <p className="text-sm text-gray-600">Upload documents for intelligent analysis and data extraction</p>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors mb-6">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-neutral-dark mb-2">Drop files here to upload</h4>
                <p className="text-gray-600 mb-4">Support for PDF, DOC, DOCX, and image files</p>
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={104857600} // 100MB

                  onComplete={handleUploadComplete}
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Choose Files</span>
                  </div>
                </ObjectUploader>
              </div>

              {/* AI Processing Workflow Steps */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-sm mb-1">1. Upload</h4>
                  <p className="text-xs text-gray-600">Secure cloud storage</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-sm mb-1">2. AI Analysis</h4>
                  <p className="text-xs text-gray-600">Extract key information</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-medium text-sm mb-1">3. Structure Data</h4>
                  <p className="text-xs text-gray-600">Organize findings</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="font-medium text-sm mb-1">4. Ready</h4>
                  <p className="text-xs text-gray-600">Available for review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Case Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {(documents as any[]).length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                  <p className="text-gray-600">Upload documents to get started with AI analysis.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(documents as any[]).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-neutral-dark">{doc.fileName}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            {doc.aiProcessed ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                AI Processed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                Processing
                              </Badge>
                            )}
                          </div>
                          {doc.aiSummary && (
                            <p className="text-sm text-gray-600 mt-1 max-w-md truncate">
                              {doc.aiSummary}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!doc.aiProcessed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => analyzeDocumentMutation.mutate(doc.id)}
                            disabled={analyzingIds.has(doc.id)}
                          >
                            <Brain className="w-4 h-4 mr-1" />
                            {analyzingIds.has(doc.id) ? "Analyzing..." : "Analyze"}
                          </Button>
                        )}
                        {doc.aiProcessed ? (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => setReviewingDocumentId(doc.id)}
                            className="bg-primary text-white hover:bg-blue-600 hover:text-white transition-all duration-200"
                          >
                            <Brain className="w-4 h-4 mr-1" />
                            Review & Edit
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleView(doc.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownload(doc.id, doc.fileName)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${doc.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      
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
