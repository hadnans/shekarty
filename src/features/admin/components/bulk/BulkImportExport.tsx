'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Download, FileText, AlertCircle, CheckCircle2, ClipboardPaste } from 'lucide-react';
import { type Lang } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ============================================
// BULK IMPORT / EXPORT
// ============================================

interface BulkImportExportProps {
  lang: Lang;
}

// Helper: poll import job (defined outside component to avoid ordering issues)
async function pollImportJobFn(jobId: string, setStatus: (s: 'idle' | 'previewing' | 'importing' | 'success' | 'error') => void, setProgress: (p: number) => void) {
  try {
    const result = await adminApi.getImportJob(jobId);
    const job = result.data;
    if (job && job.status === 'completed') {
      setStatus('success');
      setProgress(100);
    } else if (job && job.status === 'failed') {
      setStatus('error');
    } else if (job) {
      setProgress(Math.round((job.processedRows / job.totalRows) * 100));
      setTimeout(() => pollImportJobFn(jobId, setStatus, setProgress), 2000);
    }
  } catch {
    // Ignore polling errors
  }
}

export default function BulkImportExport({ lang }: BulkImportExportProps) {
  const [importType, setImportType] = useState('products');
  const [exportType, setExportType] = useState('products');
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'previewing' | 'importing' | 'success' | 'error'>('idle');
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: adminApi.bulkImport,
    onSuccess: (result) => {
      setImportStatus('success');
      setImportProgress(100);
      if (result.data?.id) {
        pollImportJobFn(result.data.id, setImportStatus, setImportProgress);
      }
    },
    onError: (err: Error) => {
      setImportStatus('error');
      setImportError(err.message);
      setImportProgress(0);
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: adminApi.bulkExport,
    onSuccess: (result) => {
      if (result.data?.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.data.downloadUrl;
        link.download = `${exportType}-export.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
  });

  const handlePreview = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        setPreviewData(parsed);
      } else {
        setPreviewData([parsed]);
      }
      setImportStatus('previewing');
    } catch {
      setImportStatus('error');
      setImportError('Invalid JSON format');
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      setImportStatus('importing');
      setImportProgress(10);
      importMutation.mutate({ type: importType, file: selectedFile });
    } else if (jsonInput) {
      const blob = new Blob([jsonInput], { type: 'application/json' });
      const file = new File([blob], `import-${importType}.json`, { type: 'application/json' });
      setImportStatus('importing');
      setImportProgress(10);
      importMutation.mutate({ type: importType, file });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setJsonInput(content);
      };
      reader.readAsText(file);
    }
  };

  const resetImport = () => {
    setImportStatus('idle');
    setPreviewData(null);
    setImportProgress(0);
    setImportError('');
    setJsonInput('');
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminBulk')}</h2>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">{t(lang, 'adminImport')}</TabsTrigger>
          <TabsTrigger value="export">{t(lang, 'adminExport')}</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Upload className="size-4" />
                {t(lang, 'adminImport')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Import type */}
              <div className="space-y-2">
                <Label>{t(lang, 'adminImportType')}</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="products">{t(lang, 'adminProducts')}</SelectItem>
                    <SelectItem value="categories">{t(lang, 'adminCategories')}</SelectItem>
                    <SelectItem value="inventory">{t(lang, 'adminInventory')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* File upload */}
              <div className="space-y-2">
                <Label>{t(lang, 'adminUploadFile')}</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileChange}
                    className="max-w-xs"
                  />
                  {selectedFile && (
                    <span className="text-xs text-muted-foreground truncate">{selectedFile.name}</span>
                  )}
                </div>
              </div>

              {/* JSON paste */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ClipboardPaste className="size-4" />
                  {t(lang, 'adminPasteJson')}
                </Label>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`[{"nameEn": "...", "nameAr": "...", ...}]`}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>

              {/* Preview button */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handlePreview} disabled={!jsonInput}>
                  <FileText className="size-4 me-1.5" />
                  {t(lang, 'adminImportPreview')}
                </Button>
                {importStatus === 'idle' && (
                  <Button size="sm" onClick={handleImport} disabled={!jsonInput && !selectedFile}>
                    <Upload className="size-4 me-1.5" />
                    {t(lang, 'adminImport')}
                  </Button>
                )}
              </div>

              {/* Preview table */}
              {previewData && importStatus === 'previewing' && (
                <div className="rounded-lg border border-border overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {Object.keys(previewData[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {Object.keys(previewData[0] || {}).map((key) => (
                            <td key={key} className="px-3 py-2 whitespace-nowrap truncate max-w-48">
                              {String(row[key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <p className="text-xs text-muted-foreground p-2">
                      Showing 10 of {previewData.length} rows
                    </p>
                  )}
                </div>
              )}

              {/* Import with confirmation after preview */}
              {importStatus === 'previewing' && (
                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={handleImport}>
                    <Upload className="size-4 me-1.5" />
                    {t(lang, 'adminImport')} ({previewData?.length} rows)
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetImport}>
                    {t(lang, 'cancel')}
                  </Button>
                </div>
              )}

              {/* Progress */}
              {importStatus === 'importing' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t(lang, 'adminImportProgress')}</p>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}

              {/* Success */}
              {importStatus === 'success' && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <p className="text-sm text-emerald-600 font-medium">{t(lang, 'adminImportComplete')}</p>
                  <Button variant="outline" size="sm" onClick={resetImport}>
                    {t(lang, 'done')}
                  </Button>
                </div>
              )}

              {/* Error */}
              {importStatus === 'error' && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <AlertCircle className="size-5 text-red-600" />
                  <p className="text-sm text-red-600 font-medium">{importError || t(lang, 'adminImportFailed')}</p>
                  <Button variant="outline" size="sm" onClick={resetImport}>
                    {t(lang, 'tryAgain')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Download className="size-4" />
                {t(lang, 'adminExport')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t(lang, 'adminExportType')}</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="products">{t(lang, 'adminProducts')}</SelectItem>
                    <SelectItem value="categories">{t(lang, 'adminCategories')}</SelectItem>
                    <SelectItem value="orders">{t(lang, 'adminOrders')}</SelectItem>
                    <SelectItem value="customers">{t(lang, 'adminCustomers')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                onClick={() => exportMutation.mutate(exportType)}
                disabled={exportMutation.isPending}
              >
                <Download className="size-4 me-1.5" />
                {exportMutation.isPending ? t(lang, 'loading') : t(lang, 'adminDownload')}
              </Button>

              {exportMutation.isError && (
                <p className="text-sm text-destructive">
                  {exportMutation.error?.message || t(lang, 'error')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
