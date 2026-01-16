import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useKnowledgebases, useCreateKnowledgebase, useDeleteKnowledgebase } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, Loader2, Trash2, FileText, Globe, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Knowledgebase() {
  const { data: knowledgebases, isLoading } = useKnowledgebases();
  const { mutate: createKb, isPending: isCreating } = useCreateKnowledgebase();
  const { mutate: deleteKb } = useDeleteKnowledgebase();
  const [isOpen, setIsOpen] = useState(false);
  const [kbType, setKbType] = useState<"file" | "url">("file");
  const [formData, setFormData] = useState({
    knowledgebase_name: "",
    url: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createKb(formData, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({ knowledgebase_name: "", url: "" });
      }
    });
  };

  return (
    <Layout>
      <PageHeader 
        title="Knowledge Base" 
        description="Manage documents and websites for your agents to use as context"
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Knowledge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Knowledge Base</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    placeholder="e.g. Product Documentation" 
                    value={formData.knowledgebase_name}
                    onChange={(e) => setFormData({...formData, knowledgebase_name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setKbType("file")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${kbType === "file" ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <FileText className="w-4 h-4" /> PDF File
                  </button>
                  <button
                    type="button"
                    onClick={() => setKbType("url")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${kbType === "url" ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Globe className="w-4 h-4" /> Website URL
                  </button>
                </div>

                {kbType === "file" ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400">PDF, TXT up to 10MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Website URL</Label>
                    <Input 
                      placeholder="https://docs.yourcompany.com" 
                      value={formData.url}
                      onChange={(e) => setFormData({...formData, url: e.target.value})}
                      required
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Knowledge Base
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : !knowledgebases || knowledgebases.length === 0 ? (
        <EmptyState 
          icon={BookOpen} 
          title="No Knowledge Found" 
          description="Upload documents or crawl websites to provide context for your AI agents."
          actionLabel="Add Knowledge"
          onAction={() => setIsOpen(true)}
        />
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {knowledgebases.map((kb: any) => (
            <Card key={kb.rag_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    {kb.source_url ? <Globe className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={kb.status || 'Active'} />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                      onClick={() => deleteKb(kb.rag_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-3 truncate">{kb.knowledgebase_name || "Untitled Knowledge"}</CardTitle>
                <CardDescription className="truncate">
                  {kb.source_url || kb.file_name || "No source information"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Created {format(new Date(kb.created_at), "MMM d, yyyy")}</span>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-3">
                <span className="text-[10px] font-mono text-slate-400 truncate w-full">RAG ID: {kb.rag_id}</span>
              </CardFooter>
            </Card>
          ))}
        </motion.div>
      )}
    </Layout>
  );
}
