import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check } from "lucide-react";
import { useExecution } from "@/hooks/use-bolna";
import { useState } from "react";

interface RawDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string | null;
  agentId?: string;
}

export function RawDataDialog({ open, onOpenChange, executionId, agentId }: RawDataDialogProps) {
  const { data: execution, isLoading } = useExecution(executionId, agentId);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (execution) {
      navigator.clipboard.writeText(JSON.stringify(execution, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Raw Execution Data</DialogTitle>
              <p className="text-sm font-normal text-muted-foreground mt-1">
                Complete JSON response from ThinkVoiceAPI
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleCopy}
              disabled={!execution}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-md bg-slate-950 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : execution ? (
            <pre className="text-xs text-green-400 font-mono overflow-auto">
              {JSON.stringify(execution, null, 2)}
            </pre>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No execution data available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
