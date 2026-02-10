import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

export default function TransferCallDialog({ trigger, onSave }: { trigger?: React.ReactNode, onSave?: (tool: any, params: any) => void }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('Use this tool to transfer the call');
  const [phone, setPhone] = useState('');
  const [messages, setMessages] = useState<Array<{ language: string; text: string }>>([{ language: 'English', text: "Sure, I'll transfer the call for you. Please wait a moment" }]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [useCustomServer, setUseCustomServer] = useState(false);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [errorPhone, setErrorPhone] = useState('');

  // Add message via inline editor
  const [addOpen, setAddOpen] = useState(false);
  const [addLang, setAddLang] = useState('English');
  const [addText, setAddText] = useState('');

  const openAdd = () => {
    setAddLang('English');
    setAddText('');
    setAddOpen(true);
  };
  const confirmAdd = () => {
    const next = [...messages, { language: addLang, text: addText }];
    setMessages(next);
    setSelectedIdx(next.length - 1);
    setAddOpen(false);
  };

  const updateMessage = (idx: number, text: string) => {
    const c = [...messages]; c[idx] = { ...c[idx], text }; setMessages(c);
  };
  const save = () => {
    if (!phone.trim()) { setErrorPhone('Please fill out this field.'); return; }

    const tool = {
      name: 'transfer_call_support',
      key: 'transfer_call',
      description,
      parameters: {
        type: 'object',
        properties: { call_sid: { type: 'string', description: 'unique call id' } },
        required: ['call_sid']
      }
    };

    const params = {
      method: useCustomServer ? 'POST' : 'GET',
      url: useCustomServer ? (serverUrl || null) : null,
      api_token: useCustomServer ? (apiToken || null) : null,
      param: JSON.stringify({ call_transfer_number: phone, call_sid: '%(call_sid)s' })
    };

    onSave?.(tool, params);
    setOpen(false);
    // reset
    setPhone(''); setDescription('Use this tool to transfer the call'); setMessages([{ language: 'English', text: "Sure, I'll transfer the call for you. Please wait a moment" }]); setSelectedIdx(0); setUseCustomServer(false); setServerUrl(null); setApiToken(null); setErrorPhone('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Transfer Call</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer call configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Description (Prompt)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <Label>Transfer to phone number</Label>
            <Input value={phone} onChange={(e) => { setPhone(e.target.value); setErrorPhone(''); }} placeholder="+19876543210" />
            {errorPhone && <div className="text-xs text-red-600 mt-1">{errorPhone}</div>}
          </div>

          <div>
            <Label>Pre-tool message</Label>
            <div className="flex items-center gap-2">
              {messages.map((m, i) => (
                <button key={i} type="button" onClick={() => setSelectedIdx(i)} className={`px-3 py-1 rounded-md ${selectedIdx === i ? 'bg-primary text-white' : 'bg-slate-100'}`}>
                  {m.language}
                </button>
              ))}
              {!addOpen ? (
                <Button variant="outline" size="sm" onClick={openAdd}>+ Add</Button>
              ) : null}
            </div>

            {/* Inline add editor */}
            {addOpen && (
              <div className="mt-3 p-3 border rounded-md bg-slate-50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Language</Label>
                    <Select onValueChange={(v: string) => setAddLang(v)} defaultValue={addLang}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                        <SelectItem value="Bengali">Bengali</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="Gujarati">Gujarati</SelectItem>
                        <SelectItem value="Indonesian">Indonesian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Message</Label>
                    <Input value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="Pre-tool message..." />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={confirmAdd}>Save</Button>
                </div>
              </div>
            )}

            <div className="mt-2">
              <Textarea value={messages[selectedIdx]?.text || ''} onChange={(e) => updateMessage(selectedIdx, e.target.value)} />
            </div>
          </div>

          <div className="pt-2 border-t">
            <Label>Receive transfer call on your own server URL</Label>
            <div className="flex items-center gap-3 mt-2">
              <input type="checkbox" checked={useCustomServer} onChange={(e) => setUseCustomServer(Boolean(e.target.checked))} />
              <div className="text-sm text-slate-500">Use your own custom logic for transfer call</div>
            </div>

            {useCustomServer && (
              <div className="mt-3 grid grid-cols-1 gap-3">
                <Input placeholder="https://your-server/transfer" value={serverUrl || ''} onChange={(e) => setServerUrl(e.target.value || null)} />
                <Input placeholder="API token (optional)" value={apiToken || ''} onChange={(e) => setApiToken(e.target.value || null)} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save transfer call</Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
