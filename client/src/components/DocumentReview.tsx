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
  ClipboardList
} from "lucide-react";

interface DocumentReviewProps {
  documentId: string;
  onClose: () => void;
}

export function DocumentReview({ documentId, onClose }: DocumentReviewProps) {
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "extracted" | "chat">("summary");
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

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    sendChatMutation.mutate(chatMessage.trim());
  };

  if (isLoading || !document) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  const docData = document as any;
  const extractedData = docData.extractedData || {};

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-dark">{docData.fileName}</h2>
          <div className="flex items-center space-x-4 mt-2">
            <Badge variant={docData.aiProcessed ? "default" : "secondary"} 
                   className={docData.aiProcessed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
              {docData.aiProcessed ? "AI Processed" : "Processing"}
            </Badge>
            <span className="text-sm text-gray-600">
              {new Date(docData.createdAt).toLocaleDateString()}
            </span>
            <span className="text-sm text-gray-600">
              {(docData.fileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "summary" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          Summary
        </button>
        <button
          onClick={() => setActiveTab("extracted")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "extracted" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <ClipboardList className="w-4 h-4 inline mr-2" />
          Extracted Data
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "chat" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          AI Editor
        </button>
      </div>

      {/* Content Based on Active Tab */}
      {activeTab === "summary" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-primary" />
              AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {docData.aiSummary || "AI analysis not yet complete. The document is being processed."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "extracted" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Information */}
          {(extractedData.patientInfo || extractedData.patientName || extractedData.employeeName) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User2 className="w-5 h-5 mr-2 text-blue-600" />
                  Patient/Individual Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {extractedData.patientInfo?.names && extractedData.patientInfo.names.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Patient Names:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.patientInfo.names.map((name: string, i: number) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.patientInfo?.ages && extractedData.patientInfo.ages.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Ages:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.patientInfo.ages.map((age: string, i: number) => (
                        <li key={i}>{age}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.patientInfo?.addresses && extractedData.patientInfo.addresses.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Addresses:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.patientInfo.addresses.map((address: string, i: number) => (
                        <li key={i}>{address}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.patientInfo?.insuranceInfo && extractedData.patientInfo.insuranceInfo.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Insurance:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.patientInfo.insuranceInfo.map((insurance: string, i: number) => (
                        <li key={i}>{insurance}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.patientName && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Patient Name:</span>
                    <p className="text-neutral-dark">{extractedData.patientName}</p>
                  </div>
                )}
                {extractedData.employeeName && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Employee Name:</span>
                    <p className="text-neutral-dark">{extractedData.employeeName}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Medical Information */}
          {(extractedData.medicalInfo || extractedData.diagnosis || extractedData.injuryType || extractedData.procedure) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Stethoscope className="w-5 h-5 mr-2 text-red-600" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {extractedData.medicalInfo?.diagnoses && extractedData.medicalInfo.diagnoses.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Diagnoses:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.medicalInfo.diagnoses.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.medicalInfo?.procedures && extractedData.medicalInfo.procedures.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Procedures:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.medicalInfo.procedures.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.medicalInfo?.medications && extractedData.medicalInfo.medications.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Medications:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.medicalInfo.medications.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.medicalInfo?.providers && extractedData.medicalInfo.providers.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Providers:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.medicalInfo.providers.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.diagnosis && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Diagnosis:</span>
                    {Array.isArray(extractedData.diagnosis) ? (
                      <ul className="list-disc list-inside text-neutral-dark">
                        {extractedData.diagnosis.map((d: string, i: number) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-neutral-dark">{extractedData.diagnosis}</p>
                    )}
                  </div>
                )}
                {extractedData.injuryType && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Injury Type:</span>
                    <p className="text-neutral-dark">{extractedData.injuryType}</p>
                  </div>
                )}
                {extractedData.procedure && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Procedure:</span>
                    <p className="text-neutral-dark">{extractedData.procedure}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline Information */}
          {(extractedData.timeline || extractedData.dateOfService || extractedData.surgeryDate || extractedData.incidentDate) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-green-600" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {extractedData.timeline?.dates && extractedData.timeline.dates.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Timeline Events:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.timeline.dates.map((date: string, i: number) => (
                        <li key={i}>{date}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.timeline?.servicesPeriod && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Services Period:</span>
                    <p className="text-neutral-dark">{extractedData.timeline.servicesPeriod}</p>
                  </div>
                )}
                {extractedData.dateOfService && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Date of Service:</span>
                    <p className="text-neutral-dark">{extractedData.dateOfService}</p>
                  </div>
                )}
                {extractedData.surgeryDate && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Surgery Date:</span>
                    <p className="text-neutral-dark">{extractedData.surgeryDate}</p>
                  </div>
                )}
                {extractedData.incidentDate && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Incident Date:</span>
                    <p className="text-neutral-dark">{extractedData.incidentDate}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Location Information */}
          {(extractedData.locations || extractedData.provider || extractedData.location) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-purple-600" />
                  Location & Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {extractedData.locations?.facilities && extractedData.locations.facilities.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Facilities:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.locations.facilities.map((facility: string, i: number) => (
                        <li key={i}>{facility}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.locations?.addresses && extractedData.locations.addresses.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Addresses:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.locations.addresses.map((address: string, i: number) => (
                        <li key={i}>{address}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.provider && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Provider:</span>
                    <p className="text-neutral-dark">{extractedData.provider}</p>
                  </div>
                )}
                {extractedData.location && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Location:</span>
                    <p className="text-neutral-dark">{extractedData.location}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          {(extractedData.keyFindings || extractedData.complications || extractedData.witnesses) && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-orange-600" />
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {extractedData.keyFindings && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Key Findings:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.keyFindings.map((finding: string, i: number) => (
                        <li key={i}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.complications && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Complications:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.complications.map((complication: string, i: number) => (
                        <li key={i}>{complication}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.witnesses && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Witnesses:</span>
                    <ul className="list-disc list-inside text-neutral-dark">
                      {extractedData.witnesses.map((witness: string, i: number) => (
                        <li key={i}>{witness}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          {extractedData.additionalDetails && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-orange-600" />
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {extractedData.additionalDetails.keyFindings && extractedData.additionalDetails.keyFindings.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Key Findings:</span>
                    <ul className="list-disc list-inside text-neutral-dark mt-1">
                      {extractedData.additionalDetails.keyFindings.map((finding: string, i: number) => (
                        <li key={i}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.additionalDetails.costs && extractedData.additionalDetails.costs.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Costs:</span>
                    <ul className="list-disc list-inside text-neutral-dark mt-1">
                      {extractedData.additionalDetails.costs.map((cost: string, i: number) => (
                        <li key={i}>{cost}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {extractedData.additionalDetails.complications && extractedData.additionalDetails.complications.length > 0 && (
                  <div>
                    <span className="font-medium text-sm text-gray-600">Complications:</span>
                    <ul className="list-disc list-inside text-neutral-dark mt-1">
                      {extractedData.additionalDetails.complications.map((complication: string, i: number) => (
                        <li key={i}>{complication}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fallback message if no extracted data */}
          {(!extractedData || Object.keys(extractedData).length === 0) && (
            <Card className="lg:col-span-2">
              <CardContent className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Extracted Data Processing</h3>
                <p className="text-gray-600">
                  The document analysis is complete, but extracted data may still be processing. 
                  Try refreshing or check the AI Editor tab for detailed information.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Edit3 className="w-5 h-5 mr-2 text-primary" />
                  AI Document Editor
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Give AI commands to modify, extract, or analyze this document
                </p>
              </CardHeader>
              <CardContent>
                {/* Chat History */}
                <ScrollArea className="h-64 mb-4 p-4 border rounded-lg bg-gray-50">
                  {(chatHistory as any[]).length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Start a conversation with AI to edit this document</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(chatHistory as any[]).map((chat: any) => (
                        <div
                          key={chat.id}
                          className={`flex items-start space-x-3 ${
                            chat.role === "user" ? "justify-end" : ""
                          }`}
                        >
                          {chat.role === "assistant" && (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              chat.role === "user"
                                ? "bg-primary text-white ml-auto"
                                : "bg-white border"
                            }`}
                          >
                            <p className="text-sm">{chat.content}</p>
                          </div>
                          {chat.role === "user" && (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="flex space-x-2">
                  <Textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask AI to modify, extract data, or analyze this document..."
                    className="flex-1 min-h-[80px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || sendChatMutation.isPending}
                    className="self-end"
                  >
                    {sendChatMutation.isPending ? (
                      <Brain className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Commands Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>Suggested Commands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  "Extract all medical diagnoses from this document",
                  "Summarize the key findings in bullet points",
                  "Create a timeline of events mentioned",
                  "Identify any missing information",
                  "Rewrite the summary to emphasize legal implications",
                  "Find all mentions of costs or billing amounts",
                  "Extract contact information for all providers"
                ].map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full text-left justify-start text-xs h-auto p-2 whitespace-normal"
                    onClick={() => setChatMessage(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default DocumentReview;