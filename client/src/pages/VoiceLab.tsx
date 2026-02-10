import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mic, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface Voice {
  id: string;
  voice_id: string;
  provider: string;
  name: string;
  model: string;
  accent: string;
}

export default function VoiceLab() {
  const { data, isLoading, error } = useQuery<Voice[] | { voices?: Voice[]; data?: Voice[] }>({
    queryKey: ["/api/bolna/voices"],
  });
  
  const voices = Array.isArray(data) ? data : (data?.voices || data?.data || []);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modelName, setModelName] = useState("");
  const [modelUrl, setModelUrl] = useState("");

  const addModelMutation = useMutation({
    mutationFn: async (data: { custom_model_name: string; custom_model_url: string }) => {
      const token = localStorage.getItem('token');
      const res = await fetch("/api/bolna/models/custom", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Custom LLM model added successfully" });
      setModelName("");
      setModelUrl("");
      queryClient.invalidateQueries({ queryKey: ["/user/model/all"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleAddModel = () => {
    if (!modelName.trim() || !modelUrl.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    addModelMutation.mutate({ custom_model_name: modelName, custom_model_url: modelUrl });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <Layout>
      <PageHeader 
        title="Voice Lab" 
        description="Browse voices and add custom LLM models for your agents"
      />

      {/* Add Custom LLM Model Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Custom LLM Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name</Label>
              <Input
                id="modelName"
                placeholder="e.g., Customer-care Model"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelUrl">Model URL</Label>
              <Input
                id="modelUrl"
                type="url"
                placeholder="https://custom.llm.model/v1"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleAddModel} 
            disabled={addModelMutation.isPending}
            className="mt-4"
          >
            {addModelMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Add Model</>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Available Voices</h2>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-red-500">
          Failed to load voices
        </div>
      )}

      {voices && (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {voices.map((voice) => (
            <motion.div key={voice.id} variants={item}>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Mic className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {voice.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {voice.accent}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {voice.provider}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {voice.model}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {voices && voices.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No voices available
        </div>
      )}
    </Layout>
  );
}
