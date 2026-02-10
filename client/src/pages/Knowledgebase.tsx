import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useKnowledgebases, useCreateKnowledgebase, useDeleteKnowledgebase } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, Loader2, Trash2, FileText, Globe, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { useToast } from '@/hooks/use-toast';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const { toast } = useToast();

  const handleFileSelect = (file?: File | null) => {
    if (!file) return;
    const allowed = ['application/pdf', 'text/plain'];
    const maxBytes = 20 * 1024 * 1024;
    if (!allowed.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.txt')) {
      toast({ title: 'Unsupported file type', description: 'Only PDF and TXT files are allowed.', variant: 'destructive' });
      return;
    }
    if (file.size > maxBytes) {
      toast({ title: 'File too large', description: 'Maximum supported file size is 20MB.', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input first
    if (kbType === 'file' && !selectedFile) {
      toast({ title: "Missing file", description: "Must provide either 'file' or 'url' parameter", variant: 'destructive' });
      return;
    }
    if (kbType === 'url' && !formData.url) {
      toast({ title: "Missing URL", description: "Must provide either 'file' or 'url' parameter", variant: 'destructive' });
      return;
    }

    // If a file was selected, build FormData and send as multipart/form-data
    if (selectedFile) {
      const fd = new FormData();
      fd.append('file', selectedFile, selectedFile.name);
      if (formData.knowledgebase_name) fd.append('knowledgebase_name', formData.knowledgebase_name);
      createKb(fd as any, {
        onSuccess: () => {
          setIsOpen(false);
          setFormData({ knowledgebase_name: '', url: '' });
          setSelectedFile(null);
        },
        onError: (err: any) => {
          toast({ title: 'Creation failed', description: err?.message || 'Failed to create knowledge base', variant: 'destructive' });
        }
      });
      return;
    }

    // Fallback: send JSON (URL-based ingestion)
    createKb({ url: formData.url, knowledgebase_name: formData.knowledgebase_name }, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({ knowledgebase_name: '', url: '' });
      },
      onError: (err: any) => {
        toast({ title: 'Creation failed', description: err?.message || 'Failed to create knowledge base', variant: 'destructive' });
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
                <Plus className="w-4 h-4" /> Add Knowledge Base
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
                  <div>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
                      onDrop={(e) => { e.preventDefault(); setIsDragActive(false); const f = e.dataTransfer?.files?.[0]; handleFileSelect(f || null); }}
                      className={`border-2 border-dashed rounded-xl p-8 text-center space-y-2 transition-colors ${isDragActive ? 'border-blue-400 bg-slate-50' : 'border-slate-200'}`}
                      role="button"
                      tabIndex={0}
                    >
                      <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-400">PDF, TXT up to 20MB</p>

                      <div className="mt-3 flex items-center justify-center gap-3">
                        <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf,text/plain" onChange={(e) => { const f = e.target.files && e.target.files[0]; handleFileSelect(f || null); }} />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Choose File</Button>

                        {selectedFile && (
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-600 truncate">{selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} aria-label="Remove file">✕</Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isCreating && selectedFile && (
                      <div className="mt-2">
                        <div className="h-2 bg-slate-100 rounded overflow-hidden">
                          <div className="h-2 bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Uploading...</div>
                      </div>
                    )}
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
                  <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
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
        <div className="mt-4">
      
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-full table-fixed">
              <thead className="bg-white">
                <tr>
                  <th className="text-left p-4 text-xs text-slate-500">RAG ID</th>
                  <th className="text-left p-4 text-xs text-slate-500">Source</th>
                  <th className="text-left p-4 text-xs text-slate-500">Type</th>
                  <th className="text-left p-4 text-xs text-slate-500">Created</th>
                  <th className="text-left p-4 text-xs text-slate-500">Status</th>
                  <th className="text-left p-4 text-xs text-slate-500">Delete</th>
                </tr>
              </thead>
              <tbody>
                {knowledgebases.map((kb: any) => {
                  const source = kb.file_name || kb.source_url || 'Unknown';
                  const ext = kb.file_name ? (String(kb.file_name).split('.').pop() || '').toLowerCase() : '';
                  const type = kb.source_url ? 'Website' : (ext === 'pdf' ? 'Pdf' : ext ? ext.toUpperCase() : 'File');
                  return (
                    <tr key={kb.rag_id} className="border-t last:border-b hover:bg-slate-50">
                      <td className="p-4 align-middle text-sm font-mono text-slate-600 truncate">{kb.rag_id}</td>
                      <td className="p-4 align-middle text-sm truncate">{source}</td>
                      <td className="p-4 align-middle text-sm">{type}</td>
                      <td className="p-4 align-middle text-sm text-slate-500">{kb.humanized_created_at || format(new Date(kb.created_at), 'MMM d, yyyy')}</td>
                      <td className="p-4 align-middle"> <StatusBadge status={kb.status || 'processing'} /></td>
                      <td className="p-4 align-middle">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Knowledge Base</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this knowledge base? This action cannot be undone.
                                <br /><br />
                                <strong>Source:</strong> {source}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteKb(kb.rag_id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
