"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

type FaqBlock = {
  name: string;
  response: string;
  threshold: number;
  utterances: string[];
};

export default function AddFaqBlockDialog({ onSave } : { onSave: (block: FaqBlock) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [response, setResponse] = useState("");
  const [threshold, setThreshold] = useState(0.9);
  const [utterances, setUtterances] = useState<string[]>([""]);

  const addUtterance = () => {
    if (utterances.length >= 20) return;
    setUtterances([...utterances, ""]);
  };
  const updateUtterance = (idx: number, val: string) => {
    const copy = [...utterances];
    copy[idx] = val;
    setUtterances(copy);
  };
  const removeUtterance = (idx: number) => {
    const copy = [...utterances];
    copy.splice(idx, 1);
    setUtterances(copy.length ? copy : [""]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const block: FaqBlock = { name: name.trim(), response: response.trim(), threshold, utterances: utterances.filter(u => u.trim()) };
    onSave(block);
    setOpen(false);
    // reset
    setName(""); setResponse(""); setThreshold(0.9); setUtterances([""]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add blocks for FAQs & Guardrails
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new block</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Name</Label>
            <Input placeholder="Block name for FAQs & Guardrails" value={name} onChange={(e) => setName(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Put a name for this block</p>
          </div>

          <div>
            <Label>Response</Label>
            <Input placeholder="Forced responses for the given threshold and messages" value={response} onChange={(e) => setResponse(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Put a response for this block rule</p>
          </div>

          <div>
            <Label>Threshold for this rule</Label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={1} step={0.01} value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="flex-1" />
              <div className="w-16 text-sm text-slate-600">{threshold.toFixed(2)}</div>
            </div>
            <p className="text-xs text-slate-400 mt-2">A lower threshold increases the likelihood that sentences similar to the utterances will trigger this response, but it also raises the risk of unintended sentences matching this response</p>
          </div>

          <div>
            <Label>Utterances</Label>
            <div className="space-y-2">
              {utterances.map((u, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input placeholder="Example user phrase..." value={u} onChange={(e) => updateUtterance(idx, e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeUtterance(idx)}>✕</Button>
                </div>
              ))}
              <div>
                <Button variant="outline" size="sm" type="button" onClick={addUtterance}>+ Add utterance ({utterances.length}/20)</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
