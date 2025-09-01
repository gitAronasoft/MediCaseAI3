import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Brain, 
  Send, 
  User, 
  Bot, 
  Download, 
  Edit3,
  Eye,
  MessageSquare,
  Calendar,
  User2,
  MapPin,
  Stethoscope,
  ClipboardList,
  AlertTriangle,
  DollarSign,
  Activity,
  Clock
} from "lucide-react";

// Safe Render Utility Functions
const renderValue = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

const renderArraySafely = (arr: any[], renderItem: (item: any, index: number) => JSX.Element) => {
  if (!Array.isArray(arr) || arr.length === 0) {
    return <p className="text-gray-500 text-sm">No data available</p>;
  }
  return arr.map(renderItem);
};

const renderObjectSafely = (obj: any) => {
  if (!obj || typeof obj !== "object") {
    return <span className="text-gray-500">No data</span>;
  }
  
  return (
    <div className="space-y-2">
      {Object.entries(obj).map(([key, value]: [string, any]) => (
        <div key={key} className="flex flex-col space-y-1">
          <span className="font-medium text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
          <span className="text-sm text-gray-700 ml-2">{renderValue(value)}</span>
        </div>
      ))}
    </div>
  );
};

// Simple Markdown Renderer Component
const MarkdownRenderer = ({ content }: { content: string }) => {
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentKey = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={currentKey++} className="text-lg font-semibold text-gray-900 mt-4 mb-2">
            {line.substring(4)}
          </h3>
        );
      }
      else if (line.startsWith('• ')) {
        elements.push(
          <div key={currentKey++} className="flex items-start space-x-2 mb-1">
            <span className="text-gray-600 mt-1">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.substring(2)) }} />
          </div>
        );
      }
      else if (line.trim() !== '') {
        elements.push(
          <p key={currentKey++} className="text-sm text-gray-700 mb-2" 
             dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
        );
      }
      else {
        elements.push(<div key={currentKey++} className="h-2" />);
      }
    }

    return elements;
  };

  const formatInlineMarkdown = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  };

  return <div className="text-sm">{renderMarkdown(content)}</div>;
};

interface DocumentReviewProps {
  documentId: string;
  onClose: () => void;
}

function DocumentReview({ documentId, onClose }: DocumentReviewProps) {
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "extracted" | "chat">("summary");
  const [isDownloading, setIsDownloading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: document, isLoading } = useQuery({
    queryKey: ["/api/documents", documentId],
    enabled: !!documentId,
  });

  const { data: chatHistory = [] } = useQuery({
    queryKey: ["/api/documents", documentId, "chat"],
    enabled: !!documentId,
  });

  const sendChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest(`/api/documents/${documentId}/chat`, "POST", {
        message,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId, "chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId] });
      setChatMessage("");
      toast({
        title: "Message sent",
        description: "AI is processing your request",
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

  const downloadMutation = useMutation({
    mutationFn: async () => {
      setIsDownloading(true);
      const response = await fetch(`/api/documents/${documentId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = (document as any)?.fileName || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Document is being downloaded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDownloading(false);
    },
  });

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendChatMutation.mutate(chatMessage.trim());
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading document...</div>;
  }

  if (!document) {
    return <div className="text-center py-8">Document not found</div>;
  }

  const doc = document as any;
  const extractedData = doc.extractedData || {};

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{doc.fileName}</h2>
            <p className="text-sm text-gray-600">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMutation.mutate()}
              disabled={isDownloading}
              data-testid="button-download"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} data-testid="button-close">
              <Eye className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4">
          <Button
            variant={activeTab === "summary" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("summary")}
            data-testid="tab-summary"
          >
            <FileText className="w-4 h-4 mr-2" />
            Summary
          </Button>
          <Button
            variant={activeTab === "extracted" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("extracted")}
            data-testid="tab-extracted"
          >
            <Brain className="w-4 h-4 mr-2" />
            Extracted Data
          </Button>
          <Button
            variant={activeTab === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("chat")}
            data-testid="tab-chat"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Chat
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {activeTab === "summary" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Document Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {doc.aiSummary ? (
                <MarkdownRenderer content={doc.aiSummary} />
              ) : (
                <p className="text-gray-500">No summary available</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "extracted" && (
          <div className="space-y-6">
            {/* Patient Information */}
            {extractedData.patientInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User2 className="w-5 h-5 mr-2 text-blue-600" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {extractedData.patientInfo.patientName && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Patient Name:</span>
                      <p className="text-neutral-dark">{renderValue(extractedData.patientInfo.patientName)}</p>
                    </div>
                  )}
                  {extractedData.patientInfo.dateOfBirth && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Date of Birth:</span>
                      <p className="text-neutral-dark">{renderValue(extractedData.patientInfo.dateOfBirth)}</p>
                    </div>
                  )}
                  {extractedData.patientInfo.gender && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Gender:</span>
                      <p className="text-neutral-dark">{renderValue(extractedData.patientInfo.gender)}</p>
                    </div>
                  )}
                  {extractedData.patientInfo.address && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Address:</span>
                      <p className="text-neutral-dark">{renderValue(extractedData.patientInfo.address)}</p>
                    </div>
                  )}
                  {extractedData.patientInfo.insurance && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Insurance:</span>
                      <p className="text-neutral-dark">{renderValue(extractedData.patientInfo.insurance)}</p>
                    </div>
                  )}
                  {extractedData.patientInfo.accidentDate && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Accident Date:</span>
                      <p className="text-neutral-dark">{renderValue(extractedData.patientInfo.accidentDate)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Medical Information */}
            {extractedData.medicalInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Stethoscope className="w-5 h-5 mr-2 text-green-600" />
                    Medical Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Injury Diagnoses */}
                  {extractedData.medicalInfo.injuryDiagnoses && extractedData.medicalInfo.injuryDiagnoses.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Injury Diagnoses:</span>
                      <ul className="list-disc list-inside text-neutral-dark mt-1 space-y-1">
                        {renderArraySafely(extractedData.medicalInfo.injuryDiagnoses, (diagnosis: any, i: number) => (
                          <li key={i} className="space-y-1">
                            {typeof diagnosis === 'object' && diagnosis !== null ? (
                              <div className="ml-4">
                                {diagnosis.diagnosis && <div><strong>Diagnosis:</strong> {renderValue(diagnosis.diagnosis)}</div>}
                                {diagnosis.icd10Code && <div><strong>ICD-10:</strong> {renderValue(diagnosis.icd10Code)}</div>}
                                {diagnosis.narrative && <div><strong>Description:</strong> {renderValue(diagnosis.narrative)}</div>}
                              </div>
                            ) : (
                              renderValue(diagnosis)
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Procedures Performed */}
                  {extractedData.medicalInfo.proceduresPerformed && extractedData.medicalInfo.proceduresPerformed.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Procedures Performed:</span>
                      <ul className="list-disc list-inside text-neutral-dark mt-1 space-y-1">
                        {renderArraySafely(extractedData.medicalInfo.proceduresPerformed, (procedure: any, i: number) => (
                          <li key={i} className="space-y-1">
                            {typeof procedure === 'object' && procedure !== null ? (
                              <div className="ml-4">
                                {procedure.procedure && <div><strong>Procedure:</strong> {renderValue(procedure.procedure)}</div>}
                                {procedure.cptCode && <div><strong>CPT Code:</strong> {renderValue(procedure.cptCode)}</div>}
                                {procedure.description && <div><strong>Description:</strong> {renderValue(procedure.description)}</div>}
                              </div>
                            ) : (
                              renderValue(procedure)
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Diagnostics */}
                  {extractedData.medicalInfo.diagnostics && extractedData.medicalInfo.diagnostics.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Diagnostic Tests:</span>
                      <ul className="list-disc list-inside text-neutral-dark mt-1 space-y-1">
                        {renderArraySafely(extractedData.medicalInfo.diagnostics, (diagnostic: any, i: number) => (
                          <li key={i} className="space-y-1">
                            {typeof diagnostic === 'object' && diagnostic !== null ? (
                              <div className="ml-4">
                                {diagnostic.test && <div><strong>Test:</strong> {renderValue(diagnostic.test)}</div>}
                                {diagnostic.results && <div><strong>Results:</strong> {renderValue(diagnostic.results)}</div>}
                                {diagnostic.significance && <div><strong>Legal Significance:</strong> {renderValue(diagnostic.significance)}</div>}
                              </div>
                            ) : (
                              renderValue(diagnostic)
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Treatment Recommendations */}
                  {extractedData.medicalInfo.treatmentRecommendations && extractedData.medicalInfo.treatmentRecommendations.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Treatment Recommendations:</span>
                      <ul className="list-disc list-inside text-neutral-dark mt-1">
                        {renderArraySafely(extractedData.medicalInfo.treatmentRecommendations, (rec: any, i: number) => (
                          <li key={i}>{renderValue(rec)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pain & Symptom Reports */}
            {extractedData.painSymptomReports && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-red-600" />
                    Pain & Symptom Reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {extractedData.painSymptomReports.painScaleReports && extractedData.painSymptomReports.painScaleReports.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Pain Scale Reports:</span>
                      <ul className="list-disc list-inside text-neutral-dark mt-1">
                        {renderArraySafely(extractedData.painSymptomReports.painScaleReports, (pain: any, i: number) => (
                          <li key={i}>{renderValue(pain)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {extractedData.painSymptomReports.functionalLimitations && extractedData.painSymptomReports.functionalLimitations.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Functional Limitations:</span>
                      <ul className="list-disc list-inside text-neutral-dark mt-1">
                        {renderArraySafely(extractedData.painSymptomReports.functionalLimitations, (limitation: any, i: number) => (
                          <li key={i}>{renderValue(limitation)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {extractedData.painSymptomReports.subjectiveComplaints && extractedData.painSymptomReports.subjectiveComplaints.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Subjective Complaints:</span>
                      <ul className="list-disc list-inside text-neutral-dark mt-1">
                        {renderArraySafely(extractedData.painSymptomReports.subjectiveComplaints, (complaint: any, i: number) => (
                          <li key={i}>{renderValue(complaint)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline (Chronology) */}
            {extractedData.timeline && extractedData.timeline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-purple-600" />
                    Medical Chronology
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {renderArraySafely(extractedData.timeline, (event: any, i: number) => (
                      <div key={i} className="border-l-2 border-purple-200 pl-4 py-2">
                        {typeof event === 'object' && event !== null ? (
                          <div className="space-y-2">
                            {event.eventDate && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-1" />
                                {renderValue(event.eventDate)}
                                {event.eventType && <Badge variant="outline" className="ml-2">{renderValue(event.eventType)}</Badge>}
                              </div>
                            )}
                            {event.facilityProvider && (
                              <div className="text-sm font-medium">{renderValue(event.facilityProvider)}</div>
                            )}
                            {event.narrativeSummary && (
                              <div className="text-sm text-gray-700">{renderValue(event.narrativeSummary)}</div>
                            )}
                            {event.cost && (
                              <div className="text-sm font-medium text-green-600">Cost: {renderValue(event.cost)}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm">{renderValue(event)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Provider Information */}
            {extractedData.providerInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                    Provider Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {renderObjectSafely(extractedData.providerInfo)}
                </CardContent>
              </Card>
            )}

            {/* Billing & Financials */}
            {extractedData.billingFinancials && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Billing & Financials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {extractedData.billingFinancials.serviceCharges && extractedData.billingFinancials.serviceCharges.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Service Charges:</span>
                      <ul className="list-disc list-inside text-neutral-dark mt-1 space-y-1">
                        {renderArraySafely(extractedData.billingFinancials.serviceCharges, (charge: any, i: number) => (
                          <li key={i} className="space-y-1">
                            {typeof charge === 'object' && charge !== null ? (
                              <div className="ml-4">
                                {charge.service && <div><strong>Service:</strong> {renderValue(charge.service)}</div>}
                                {charge.cptCode && <div><strong>CPT Code:</strong> {renderValue(charge.cptCode)}</div>}
                                {charge.amount && <div><strong>Amount:</strong> {renderValue(charge.amount)}</div>}
                              </div>
                            ) : (
                              renderValue(charge)
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {extractedData.billingFinancials.outstandingBalance && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Outstanding Balance:</span>
                      <p className="text-neutral-dark font-semibold">{renderValue(extractedData.billingFinancials.outstandingBalance)}</p>
                    </div>
                  )}
                  {extractedData.billingFinancials.paymentsAdjustments && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Payments & Adjustments:</span>
                      <p className="text-neutral-dark">{renderValue(extractedData.billingFinancials.paymentsAdjustments)}</p>
                    </div>
                  )}
                  {extractedData.billingFinancials.duplicateCharges && (
                    <div>
                      <span className="font-medium text-sm text-gray-600">Duplicate Charges:</span>
                      <p className="text-neutral-dark">{renderValue(extractedData.billingFinancials.duplicateCharges)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Prognosis & Future Care */}
            {extractedData.prognosisFutureCare && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-indigo-600" />
                    Prognosis & Future Care
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {renderObjectSafely(extractedData.prognosisFutureCare)}
                </CardContent>
              </Card>
            )}

            {/* Complications & Notes */}
            {extractedData.complicationsNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                    Complications & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {renderObjectSafely(extractedData.complicationsNotes)}
                </CardContent>
              </Card>
            )}

            {/* Key Findings */}
            {doc.keyFindings && doc.keyFindings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ClipboardList className="w-5 h-5 mr-2 text-orange-600" />
                    Key Legal Findings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-neutral-dark space-y-1">
                    {renderArraySafely(doc.keyFindings, (finding: any, i: number) => (
                      <li key={i}>{renderValue(finding)}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="space-y-4">
            {/* Chat History */}
            <Card className="h-96">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                  AI Document Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full">
                  <div className="space-y-4">
                    {Array.isArray(chatHistory) && chatHistory.length > 0 ? (
                      renderArraySafely(chatHistory as any[], (chat: any) => (
                        <div key={chat.id} className="space-y-2">
                          <div className="flex items-start space-x-3">
                            <User className="w-5 h-5 mt-1 text-blue-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">You</p>
                              <p className="text-sm text-gray-700">{renderValue(chat.userMessage)}</p>
                            </div>
                          </div>
                          {chat.aiResponse && (
                            <div className="flex items-start space-x-3 ml-6">
                              <Bot className="w-5 h-5 mt-1 text-green-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">AI Assistant</p>
                                <div className="text-sm text-gray-700">
                                  <MarkdownRenderer content={renderValue(chat.aiResponse)} />
                                </div>
                              </div>
                            </div>
                          )}
                          <Separator />
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No conversation yet. Start by asking a question about this document.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Input */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Ask a question about this document..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                    rows={3}
                    data-testid="input-chat-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || sendChatMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Ask questions about the medical data, request explanations, or get help with analysis.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default DocumentReview;
export { DocumentReview };