'use client';

// GGH Admin — Loyalty Program Manager
// List programs, create/edit, view transactions per customer

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Pencil, Trash2, Eye, Star, ArrowUpRight } from 'lucide-react';
import { type Lang, type Piastres, formatPriceWithCurrency } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LOYALTY_TIERS } from '@/lib/loyalty/tiers';

// ============================================
// TYPES
// ============================================

interface LoyaltyProgramData {
  id: string;
  nameEn: string;
  nameAr: string;
  type: string;
  pointsPerPiastre: number;
  pointsValue: number;
  minRedemption: number;
  maxAccumulation: number | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TransactionData {
  id: string;
  customerId: string;
  programId: string;
  orderId: string | null;
  points: number;
  type: string;
  descriptionEn: string;
  descriptionAr: string;
  expiresAt: string | null;
  createdAt: string;
}

interface LoyaltyProgramManagerProps {
  lang: Lang;
}

// ============================================
// TIER / TYPE DISPLAY COLORS
// ============================================

const TIER_COLORS: Record<string, string> = {
  retail: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400',
  wholesale: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  vip: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
};

const TX_TYPE_COLORS: Record<string, string> = {
  earn: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30',
  redeem: 'bg-red-50 text-red-700 dark:bg-red-950/30',
  bonus: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30',
  expire: 'bg-gray-50 text-gray-700 dark:bg-gray-950/30',
  adjust: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function LoyaltyProgramManager({ lang }: LoyaltyProgramManagerProps) {
  const [activeTab, setActiveTab] = useState('programs');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: programsResponse, isLoading: isProgramsLoading } = useQuery({
    queryKey: ['admin-loyalty-programs'],
    queryFn: () => adminApi.getLoyaltyPrograms(),
  });

  const programs: LoyaltyProgramData[] = useMemo(
    () => programsResponse?.data ?? [],
    [programsResponse]
  );

  const { data: transactionsResponse, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['admin-loyalty-transactions', selectedProgramId],
    queryFn: () => adminApi.getLoyaltyTransactions({ programId: selectedProgramId! }),
    enabled: !!selectedProgramId && showTransactionsDialog,
  });

  const transactions: TransactionData[] = useMemo(
    () => transactionsResponse?.data ?? [],
    [transactionsResponse]
  );

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.createLoyaltyProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-programs'] });
      setShowCreateDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.updateLoyaltyProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-programs'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteLoyaltyProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-programs'] });
    },
  });

  const activePrograms = useMemo(() => programs.filter((p) => p.isActive).length, [programs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {lang === 'ar' ? 'برنامج الولاء' : 'Loyalty Program'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === 'ar' ? 'إدارة برامج النقاط والمكافآت' : 'Manage points & rewards programs'}
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              {lang === 'ar' ? 'برنامج جديد' : 'New Program'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{lang === 'ar' ? 'إنشاء برنامج ولاء' : 'Create Loyalty Program'}</DialogTitle>
            </DialogHeader>
            <CreateProgramForm lang={lang} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{lang === 'ar' ? 'إجمالي البرامج' : 'Total Programs'}</p>
              <p className="text-2xl font-bold text-foreground">{isProgramsLoading ? '...' : programs.length}</p>
            </div>
            <div className="size-10 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"><Award className="size-5" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{lang === 'ar' ? 'برامج نشطة' : 'Active Programs'}</p>
              <p className="text-2xl font-bold text-foreground">{isProgramsLoading ? '...' : activePrograms}</p>
            </div>
            <div className="size-10 rounded-lg flex items-center justify-center shrink-0 bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30"><Star className="size-5" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">{lang === 'ar' ? 'مستويات الولاء' : 'Loyalty Tiers'}</p>
            <div className="flex flex-wrap gap-2">
              {LOYALTY_TIERS.map((tier) => (
                <Badge key={tier.name} className={TIER_COLORS[tier.name]} variant="secondary">
                  {lang === 'ar' ? tier.nameAr : tier.nameEn}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programs">{lang === 'ar' ? 'البرامج' : 'Programs'}</TabsTrigger>
          <TabsTrigger value="tiers">{lang === 'ar' ? 'المستويات' : 'Tiers'}</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          {isProgramsLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t(lang, 'loading')}</div>
          ) : programs.length > 0 ? (
            <div className="space-y-3">
              {programs.map((program) => (
                <Card key={program.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{lang === 'ar' ? program.nameAr : program.nameEn}</p>
                          <Badge variant={program.isActive ? 'default' : 'outline'} className="text-xs shrink-0">
                            {program.isActive ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'متوقف' : 'Inactive')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs shrink-0">{program.type}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{lang === 'ar' ? 'نقطة/جنيه' : 'Pts/EGP'}: {program.pointsPerPiastre}</span>
                          <span>{lang === 'ar' ? 'قيمة النقطة' : 'Pt Value'}: {formatPriceWithCurrency(program.pointsValue as Piastres, lang)}</span>
                          <span>{lang === 'ar' ? 'حد الاستبدال' : 'Min Redeem'}: {program.minRedemption}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedProgramId(program.id); setShowTransactionsDialog(true); }} aria-label="View transactions"><Eye className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => { setSelectedProgramId(program.id); setShowEditDialog(true); }} aria-label="Edit"><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(program.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{lang === 'ar' ? 'لا توجد برامج ولاء' : 'No loyalty programs yet'}</div>
          )}
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          {LOYALTY_TIERS.map((tier) => (
            <Card key={tier.name} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${TIER_COLORS[tier.name]}`}><Star className="size-6" /></div>
                  <div className="min-w-0 space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{lang === 'ar' ? tier.nameAr : tier.nameEn}</p>
                      <Badge variant="secondary" className="text-xs">{lang === 'ar' ? 'الحد الأدنى' : 'Min'}: {tier.minPoints} {lang === 'ar' ? 'نقاط' : 'pts'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{lang === 'ar' ? tier.benefitsAr : tier.benefitsEn}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-600 font-medium">{tier.earnMultiplier}x {lang === 'ar' ? 'معدل الربح' : 'earn rate'}</span>
                      <ArrowUpRight className="size-3" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Transactions Dialog */}
      <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'معاملات البرنامج' : 'Program Transactions'}</DialogTitle></DialogHeader>
          {isTransactionsLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t(lang, 'loading')}</div>
          ) : transactions.length > 0 ? (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={TX_TYPE_COLORS[tx.type]} variant="secondary">{tx.type}</Badge>
                        <p className="text-sm text-foreground truncate">{lang === 'ar' ? tx.descriptionAr : tx.descriptionEn}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${tx.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points} {lang === 'ar' ? 'نقطة' : 'pts'}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">{lang === 'ar' ? 'لا توجد معاملات' : 'No transactions found'}</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'تعديل البرنامج' : 'Edit Program'}</DialogTitle></DialogHeader>
          {selectedProgramId && (
            <EditProgramForm
              lang={lang}
              program={programs.find((p) => p.id === selectedProgramId)!}
              onSubmit={(data) => updateMutation.mutate({ id: selectedProgramId, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// CREATE PROGRAM FORM
// ============================================

interface CreateProgramFormProps {
  lang: Lang;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}

function CreateProgramForm({ lang, onSubmit, isLoading }: CreateProgramFormProps) {
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState('points');
  const [pointsPerPiastre, setPointsPerPiastre] = useState('0.01');
  const [pointsValue, setPointsValue] = useState('100');
  const [minRedemption, setMinRedemption] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      nameEn, nameAr, type,
      pointsPerPiastre: parseFloat(pointsPerPiastre),
      pointsValue: parseInt(pointsValue),
      minRedemption: parseInt(minRedemption),
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2"><Label>{lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label><Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required /></div>
      <div className="space-y-2"><Label>{lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
      <div className="space-y-2">
        <Label>{lang === 'ar' ? 'نوع البرنامج' : 'Program Type'}</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="points">Points</SelectItem>
            <SelectItem value="cashback">Cashback</SelectItem>
            <SelectItem value="tiered">Tiered</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>{lang === 'ar' ? 'نقاط لكل جنيه' : 'Points per EGP'}</Label><Input type="number" step="0.001" value={pointsPerPiastre} onChange={(e) => setPointsPerPiastre(e.target.value)} /></div>
      <div className="space-y-2"><Label>{lang === 'ar' ? 'قيمة النقطة (قروش)' : 'Point Value (piastres)'}</Label><Input type="number" value={pointsValue} onChange={(e) => setPointsValue(e.target.value)} /></div>
      <div className="space-y-2"><Label>{lang === 'ar' ? 'حد الاستبدال الأدنى' : 'Min Redemption'}</Label><Input type="number" value={minRedemption} onChange={(e) => setMinRedemption(e.target.value)} /></div>
      <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>{lang === 'ar' ? 'نشط' : 'Active'}</Label></div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (lang === 'ar' ? 'جاري...' : 'Creating...') : (lang === 'ar' ? 'إنشاء' : 'Create Program')}
      </Button>
    </form>
  );
}

// ============================================
// EDIT PROGRAM FORM
// ============================================

interface EditProgramFormProps {
  lang: Lang;
  program: LoyaltyProgramData;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}

function EditProgramForm({ lang, program, onSubmit, isLoading }: EditProgramFormProps) {
  const [nameEn, setNameEn] = useState(program.nameEn);
  const [nameAr, setNameAr] = useState(program.nameAr);
  const [type, setType] = useState(program.type);
  const [pointsPerPiastre, setPointsPerPiastre] = useState(String(program.pointsPerPiastre));
  const [pointsValue, setPointsValue] = useState(String(program.pointsValue));
  const [minRedemption, setMinRedemption] = useState(String(program.minRedemption));
  const [isActive, setIsActive] = useState(program.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      nameEn, nameAr, type,
      pointsPerPiastre: parseFloat(pointsPerPiastre),
      pointsValue: parseInt(pointsValue),
      minRedemption: parseInt(minRedemption),
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2"><Label>{lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label><Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required /></div>
      <div className="space-y-2"><Label>{lang === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
      <div className="space-y-2">
        <Label>{lang === 'ar' ? 'نوع البرنامج' : 'Program Type'}</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="points">Points</SelectItem>
            <SelectItem value="cashback">Cashback</SelectItem>
            <SelectItem value="tiered">Tiered</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>{lang === 'ar' ? 'نقاط لكل جنيه' : 'Points per EGP'}</Label><Input type="number" step="0.001" value={pointsPerPiastre} onChange={(e) => setPointsPerPiastre(e.target.value)} /></div>
      <div className="space-y-2"><Label>{lang === 'ar' ? 'قيمة النقطة (قروش)' : 'Point Value (piastres)'}</Label><Input type="number" value={pointsValue} onChange={(e) => setPointsValue(e.target.value)} /></div>
      <div className="space-y-2"><Label>{lang === 'ar' ? 'حد الاستبدال الأدنى' : 'Min Redemption'}</Label><Input type="number" value={minRedemption} onChange={(e) => setMinRedemption(e.target.value)} /></div>
      <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>{lang === 'ar' ? 'نشط' : 'Active'}</Label></div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (lang === 'ar' ? 'جاري...' : 'Updating...') : (lang === 'ar' ? 'تحديث' : 'Update Program')}
      </Button>
    </form>
  );
}
