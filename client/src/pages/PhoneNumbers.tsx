import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Link as LinkIcon, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export default function PhoneNumbers() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { token, isLoading: authLoading } = useAuth();
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState("US");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [searchPattern, setSearchPattern] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const { data: phoneNumbers = [], isLoading } = useQuery({
        queryKey: ["/api/bolna/phone-numbers"],
        enabled: !!token && !authLoading,
    });

    const { data: agents = [] } = useQuery({
        queryKey: ["/api/bolna/agents"],
        enabled: !!token && !authLoading,
    });

    const searchMutation = useMutation({
        mutationFn: async () => {
            const params = new URLSearchParams({ country: selectedCountry });
            if (searchPattern) params.set('pattern', searchPattern);
            const res = await apiRequest('GET', `/api/bolna/phone-numbers/search?${params.toString()}`);
            return await res.json();
        },
        onSuccess: (data) => {
            setSearchResults(data || []);
            setIsSearching(false);
        },
        onError: (error: any) => {
            toast({ title: "Search failed", description: error.message, variant: "destructive" });
            setIsSearching(false);
        }
    });

    const buyMutation = useMutation({
        mutationFn: async (selectedNumber: string) => {
            const res = await apiRequest('POST', '/api/bolna/phone-numbers/buy', { 
                country: selectedCountry, 
                phone_number: selectedNumber 
            });
            return await res.json();
        },
        onSuccess: () => {
            toast({ title: "Phone number purchased successfully" });
            setIsBuyModalOpen(false);
            setPhoneNumber("");
            setSearchResults([]);
            queryClient.invalidateQueries({ queryKey: ["/api/bolna/phone-numbers"] });
        },
        onError: (error: any) => {
            toast({ title: "Failed to purchase number", description: error.message, variant: "destructive" });
        }
    });

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({ title: 'Copied', description: 'Phone number copied to clipboard' });
        } catch (e) {
            toast({ title: 'Copy failed', description: 'Unable to copy', variant: 'destructive' });
        }
    };

    const formatDate = (iso?: string) => {
        if (!iso) return '-';
        return format(new Date(iso), 'dd MMM yyyy, HH:mm');
    };

    const getAgentName = (agentId?: string) => {
        if (!agentId) return '-';
        const agent = agents.find((a: any) => a.id === agentId || a.agent_id === agentId);
        return agent?.agent_config?.agent_name || agent?.agent_name || 'Unknown Agent';
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Phone Numbers</h1>
                        <p className="text-sm text-muted-foreground">Manage your purchased phone numbers and inbound agents</p>
                    </div>
                    <Dialog open={isBuyModalOpen} onOpenChange={setIsBuyModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> Buy Number
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Search & Buy Phone Number</DialogTitle>
                                <DialogDescription>
                                    Search for available phone numbers and purchase them
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div className="flex gap-3">
                                    <div className="grid gap-2 w-32">
                                        <label className="text-sm font-medium">Country</label>
                                        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="US">US</SelectItem>
                                                <SelectItem value="IN">IN</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2 flex-1">
                                        <label className="text-sm font-medium">Pattern (Optional)</label>
                                        <Input
                                            placeholder="3-digit prefix (e.g., 415)"
                                            value={searchPattern}
                                            onChange={(e) => setSearchPattern(e.target.value)}
                                            maxLength={3}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">&nbsp;</label>
                                        <Button 
                                            onClick={() => { setIsSearching(true); searchMutation.mutate(); }} 
                                            disabled={searchMutation.isPending}
                                        >
                                            {searchMutation.isPending ? "Searching..." : "Search"}
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                                    {searchMutation.isPending ? (
                                        <div className="p-8 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">
                                            {isSearching ? "No numbers found" : "Search for available numbers"}
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {searchResults.map((num: any, idx: number) => (
                                                <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                                    <div className="flex-1">
                                                        <div className="font-mono text-sm font-medium">{num.phone_number}</div>
                                                        <div className="text-xs text-slate-500">
                                                            {num.region}{num.locality ? `, ${num.locality}` : ''}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-medium">${num.price}</span>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => buyMutation.mutate(num.phone_number)}
                                                            disabled={buyMutation.isPending}
                                                        >
                                                            Buy
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-3 border-b flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Your Phone Numbers</span>
                        {phoneNumbers && phoneNumbers.length > 0 && (
                            <span className="text-sm text-slate-500">{phoneNumbers.length} number{phoneNumbers.length !== 1 ? 's' : ''}</span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="p-12 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : phoneNumbers && phoneNumbers.length > 0 ? (
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10 border-b">
                                    <TableRow>
                                        <TableHead className="text-xs uppercase text-slate-500 w-[180px]">Phone Number</TableHead>
                                        <TableHead className="text-xs uppercase text-slate-500 w-[140px]">Provider</TableHead>
                                        <TableHead className="text-xs uppercase text-slate-500 w-[200px]">Linked Agent</TableHead>
                                        <TableHead className="text-xs uppercase text-slate-500 w-[120px]">Price</TableHead>
                                        <TableHead className="text-xs uppercase text-slate-500 w-[140px]">Renewal Date</TableHead>
                                        <TableHead className="text-xs uppercase text-slate-500 w-[160px]">Created At</TableHead>
                                        <TableHead className="text-xs uppercase text-slate-500 w-[120px]">Status</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {phoneNumbers.map((num: any) => (
                                        <TableRow key={num.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-mono text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-slate-400" />
                                                    <span>{num.phone_number}</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(num.phone_number)} 
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700 capitalize">
                                                    {num.telephony_provider || '-'}
                                                </span>
                                            </TableCell>

                                            <TableCell className="text-sm text-slate-700">
                                                {num.agent_id ? (
                                                    <div className="flex items-center gap-2">
                                                        <LinkIcon className="w-4 h-4 text-green-500" />
                                                        <span>{getAgentName(num.agent_id)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">Not linked</span>
                                                )}
                                            </TableCell>

                                            <TableCell className="text-sm font-medium text-slate-700">
                                                {num.price || '-'}
                                            </TableCell>

                                            <TableCell className="text-sm text-slate-600">
                                                {num.renewal_at || '-'}
                                            </TableCell>

                                            <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                                                {formatDate(num.created_at)}
                                            </TableCell>

                                            <TableCell>
                                                {num.rented ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-xs font-medium text-green-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-12 text-center">
                                <Phone className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 mb-2">No Phone Numbers</h3>
                                <p className="text-slate-500">You haven't purchased any phone numbers yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
