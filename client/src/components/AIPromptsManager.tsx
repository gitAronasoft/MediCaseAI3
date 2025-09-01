import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, MessageSquare, FileText, Wand2, PenTool } from "lucide-react";
import { z } from "zod";

const promptSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["document_analysis", "demand_letter", "chat_system", "document_editing"]),
  prompt: z.string().min(10, "Prompt must be at least 10 characters"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

type PromptFormData = z.infer<typeof promptSchema>;
type AiPrompt = {
  id: string;
  name: string;
  type: string;
  prompt: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

const promptTypes = [
  { value: "document_analysis", label: "Document Analysis", icon: FileText },
  { value: "demand_letter", label: "Demand Letter", icon: MessageSquare },
  { value: "chat_system", label: "Chat System", icon: Wand2 },
  { value: "document_editing", label: "Document Editing", icon: PenTool },
];

export function AIPromptsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AiPrompt | null>(null);

  // Fetch AI prompts
  const { data: prompts = [], isLoading } = useQuery<AiPrompt[]>({
    queryKey: ["/api/ai-prompts"],
  });

  // Form for creating/editing prompts
  const form = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: "",
      type: "document_analysis",
      prompt: "",
      description: "",
      isActive: true,
      isDefault: false,
    },
  });

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: async (data: PromptFormData) => {
      return apiRequest("/api/ai-prompts", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      toast({
        title: "Success",
        description: "AI prompt created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create AI prompt",
        variant: "destructive",
      });
    },
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromptFormData> }) => {
      return apiRequest(`/api/ai-prompts/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      toast({
        title: "Success",
        description: "AI prompt updated successfully",
      });
      setIsDialogOpen(false);
      setEditingPrompt(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI prompt",
        variant: "destructive",
      });
    },
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/ai-prompts/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      toast({
        title: "Success",
        description: "AI prompt deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete AI prompt",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PromptFormData) => {
    if (editingPrompt) {
      updatePromptMutation.mutate({ id: editingPrompt.id, data });
    } else {
      createPromptMutation.mutate(data);
    }
  };

  const handleEdit = (prompt: AiPrompt) => {
    setEditingPrompt(prompt);
    form.reset({
      name: prompt.name,
      type: prompt.type as any,
      prompt: prompt.prompt,
      description: prompt.description || "",
      isActive: prompt.isActive,
      isDefault: prompt.isDefault,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this AI prompt?")) {
      deletePromptMutation.mutate(id);
    }
  };

  const getTypeIcon = (type: string) => {
    const promptType = promptTypes.find(t => t.value === type);
    return promptType?.icon || MessageSquare;
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading AI prompts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Manage custom AI prompts for different tasks in your legal case management.
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingPrompt(null);
                form.reset();
              }}
              className="bg-primary hover:bg-blue-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPrompt ? "Edit AI Prompt" : "Create New AI Prompt"}
              </DialogTitle>
              <DialogDescription>
                {editingPrompt 
                  ? "Modify the AI prompt settings and content below."
                  : "Create a new custom AI prompt for your legal case management tasks."
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Medical Analysis Prompt" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {promptTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of this prompt's purpose" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your AI prompt here..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-6">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Active
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Set as Default
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPromptMutation.isPending || updatePromptMutation.isPending}
                  >
                    {createPromptMutation.isPending || updatePromptMutation.isPending
                      ? "Saving..."
                      : editingPrompt
                      ? "Update Prompt"
                      : "Create Prompt"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Prompts List */}
      {prompts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No AI prompts yet</p>
          <p className="text-sm">Create your first custom AI prompt to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt: AiPrompt) => {
            const Icon = getTypeIcon(prompt.type);
            return (
              <div
                key={prompt.id}
                className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon className="w-5 h-5 text-primary mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{prompt.name}</h4>
                        <Badge
                          variant={prompt.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {prompt.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {prompt.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {promptTypes.find(t => t.value === prompt.type)?.label}
                      </p>
                      {prompt.description && (
                        <p className="text-sm text-gray-600 mb-2">{prompt.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        {prompt.prompt.slice(0, 150)}
                        {prompt.prompt.length > 150 && "..."}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(prompt)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(prompt.id)}
                      disabled={deletePromptMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}