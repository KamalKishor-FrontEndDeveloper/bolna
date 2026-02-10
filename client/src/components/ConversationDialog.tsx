import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Play, Download, DollarSign, Clock, Phone, User } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

interface ConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: any;
}

export function ConversationDialog({ open, onOpenChange, execution }: ConversationDialogProps) {
  if (!execution) return null;

  const formatTranscript = (transcript: string) => {
    if (!transcript) return [];
    
    const lines = transcript.split(/\n|assistant:|user:/).filter(line => line.trim());
    const formatted = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const isAssistant = i === 0 || line.includes('Support Agent') || line.includes('मुझे खेद है') || line.includes('धन्यवाद');
      formatted.push({
        speaker: isAssistant ? 'assistant' : 'user',
        message: line
      });
    }
    
    return formatted;
  };

  const conversationData = formatTranscript(execution.transcript || '');
  const recordingUrl = execution.telephony_data?.recording_url;
  const costBreakdown = execution.cost_breakdown;
  const telephonyData = execution.telephony_data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>Execution Details</span>
              <p className="text-xs font-normal text-slate-500 mt-1">ID: {execution.id}</p>
            </div>
            <StatusBadge status={execution.status} />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-auto pr-2">
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="shadow-none border-slate-200">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-500">Duration</p>
                </div>
                <p className="text-lg font-bold">{execution.conversation_time || 0}s</p>
              </CardContent>
            </Card>
            <Card className="shadow-none border-slate-200">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-500">Total Cost</p>
                </div>
                <p className="text-lg font-bold">${((execution.total_cost || 0) / 100).toFixed(3)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none border-slate-200">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-500">Call Type</p>
                </div>
                <p className="text-sm font-semibold capitalize">{telephonyData?.call_type || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none border-slate-200">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-500">Hangup By</p>
                </div>
                <p className="text-sm font-semibold">{telephonyData?.hangup_by || 'N/A'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown */}
          {costBreakdown && (
            <Card className="shadow-none border-slate-200">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold mb-3">Cost Breakdown</h3>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-500">LLM</p>
                    <p className="font-bold">${((costBreakdown.llm || 0) / 100).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-500">Synthesizer</p>
                    <p className="font-bold">${((costBreakdown.synthesizer || 0) / 100).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-500">Transcriber</p>
                    <p className="font-bold">${((costBreakdown.transcriber || 0) / 100).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-500">Network</p>
                    <p className="font-bold">${((costBreakdown.network || 0) / 100).toFixed(3)}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <p className="text-slate-500">Platform</p>
                    <p className="font-bold">${((costBreakdown.platform || 0) / 100).toFixed(3)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Telephony Data */}
          {telephonyData && (
            <Card className="shadow-none border-slate-200">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold mb-3">Call Details</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">To Number</p>
                    <p className="font-medium">{telephonyData.to_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">From Number</p>
                    <p className="font-medium">{telephonyData.from_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Provider</p>
                    <p className="font-medium capitalize">{telephonyData.provider || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Hangup Reason</p>
                    <p className="font-medium">{telephonyData.hangup_reason || 'N/A'}</p>
                  </div>
                  {telephonyData.recording_url && (
                    <div className="col-span-2">
                      <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => window.open(telephonyData.recording_url, '_blank')}>
                        <Play className="w-4 h-4" /> Play Recording
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extracted Data */}
          {execution.extracted_data && Object.keys(execution.extracted_data).length > 0 && (
            <Card className="shadow-none border-slate-200">
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold mb-3">Extracted Data</h3>
                <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto">
                  {JSON.stringify(execution.extracted_data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
          
          {/* Transcript */}
          <Card className="shadow-none border-slate-200">
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold mb-3">Conversation Transcript</h3>
              <div className="space-y-3 max-h-96 overflow-auto">
                {conversationData.length > 0 ? (
                  conversationData.map((item, index) => (
                    <div key={index} className={`flex ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-lg ${
                        item.speaker === 'user' 
                          ? 'bg-blue-500 text-white rounded-br-sm' 
                          : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                      }`}>
                        <p className="text-sm leading-relaxed">{item.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No transcript available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}