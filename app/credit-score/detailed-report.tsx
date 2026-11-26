import React, { useEffect, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { CreditReportLoading, DetailedCreditReport } from '@/src/components/creditScore';
import { isRenderableCreditReport } from '@/src/config/creditScore';
import { useCreditReportStore } from '@/src/store/useCreditReportStore';
import { useCreditReportPdfDownload } from '@/src/services/creditScore/useCreditReportPdfDownload';

export default function DetailedCreditReportRoute() {
  const router = useRouter();
  const { report, pdfUrl } = useCreditReportStore();
  const [isGenerating, setIsGenerating] = useState(true);
  const { download, isDownloading } = useCreditReportPdfDownload(pdfUrl);
  useEffect(() => {
    const id = setTimeout(() => setIsGenerating(false), 1200);
    return () => clearTimeout(id);
  }, []);
  if (!isRenderableCreditReport(report)) return <Redirect href="/credit-score" />;
  if (isGenerating) return <CreditReportLoading detailed />;
  return (
    <DetailedCreditReport
      report={report}
      onBack={() => router.back()}
      onDownload={download}
      downloading={isDownloading}
    />
  );
}
