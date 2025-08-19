import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, DollarSign, Calendar, FileText } from "lucide-react";
import { insertMedicalBillSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertMedicalBillSchema.extend({
  serviceDate: z.string().min(1, "Service date is required"),
  billDate: z.string().min(1, "Bill date is required"),
  amount: z.string().min(1, "Amount is required"),
});

type FormData = z.infer<typeof formSchema>;

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  verified: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
  approved: "bg-blue-100 text-blue-800",
};

export default function MedicalBillsView() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cases = [] } = useQuery({
    queryKey: ["/api/cases"],
  });

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["/api/cases", selectedCaseId, "bills"],
    enabled: !!selectedCaseId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: "",
      amount: "",
      serviceDate: "",
      billDate: "",
      treatment: "",
      insurance: "",
      status: "pending",
      caseId: selectedCaseId,
    },
  });

  const createBillMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const billData = {
        ...data,
        caseId: selectedCaseId,
        serviceDate: new Date(data.serviceDate).toISOString(),
        billDate: new Date(data.billDate).toISOString(),
        amount: data.amount,
      };
      const response = await apiRequest("/api/bills", "POST", billData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", selectedCaseId, "bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Medical bill created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createBillMutation.mutate(data);
  };

  // Calculate summary statistics
  const totalAmount = bills.reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0);
  const verifiedAmount = bills
    .filter((bill: any) => bill.status === "verified")
    .reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0);
  const pendingAmount = bills
    .filter((bill: any) => bill.status === "pending")
    .reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0);
  const disputedAmount = bills
    .filter((bill: any) => bill.status === "disputed")
    .reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0);

  if (isLoading && selectedCaseId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading medical bills...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-dark">Medical Bills</h2>
          <p className="text-gray-600">Review and verify medical billing timeline</p>
        </div>
        
        {selectedCaseId && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-light">
                <Plus className="w-4 h-4 mr-2" />
                Add Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Medical Bill</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <FormControl>
                            <Input placeholder="Hospital/Clinic name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="serviceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bill Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="treatment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treatment/Service</FormLabel>
                        <FormControl>
                          <Input placeholder="Description of treatment" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insurance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance</FormLabel>
                          <FormControl>
                            <Input placeholder="Insurance information" {...field} />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="disputed">Disputed</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBillMutation.isPending}>
                      {createBillMutation.isPending ? "Creating..." : "Add Bill"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Case Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Case</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a case to view medical bills" />
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
          {/* Summary Statistics */}
          {bills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bills Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-neutral-dark">${totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Total Bills</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">${verifiedAmount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Verified</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">${pendingAmount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">${disputedAmount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Disputed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bills Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Medical Bills Chronological Review</CardTitle>
            </CardHeader>
            <CardContent>
              {bills.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No medical bills found</h3>
                  <p className="text-gray-600 mb-4">Add medical bills to track billing timeline.</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Bill
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bills
                    .sort((a: any, b: any) => new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime())
                    .map((bill: any) => (
                    <div key={bill.id} className="relative">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-medium text-neutral-dark">{bill.provider}</h4>
                                <Badge className={statusColors[bill.status as keyof typeof statusColors] || statusColors.pending}>
                                  {bill.status}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold text-neutral-dark">
                                  ${parseFloat(bill.amount).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {new Date(bill.billDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Service Date</p>
                                <p className="font-medium text-neutral-dark">
                                  {new Date(bill.serviceDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Treatment</p>
                                <p className="font-medium text-neutral-dark">{bill.treatment || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Insurance</p>
                                <p className="font-medium text-neutral-dark">{bill.insurance || "N/A"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <span className="sr-only">View details</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
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
    </div>
  );
}
