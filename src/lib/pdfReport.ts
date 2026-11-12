import { jsPDF } from 'jspdf';
import type { AssessmentRecord } from '../shared/types';

export function downloadAssessmentPdf(assessment: AssessmentRecord) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed = 40) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 56) {
      doc.addPage();
      y = 52;
    }
  };

  const writeWrapped = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 41, 59]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(size + 6);
      doc.text(line, margin, y);
      y += size + 5;
    }
  };

  // Header
  doc.setFillColor(23, 105, 170);
  doc.rect(0, 0, pageWidth, 72, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('DermaAI — Informational Skin Assessment Summary', margin, 44);
  y = 98;

  // Prominent Medical Safety Notice
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.rect(margin, y, maxWidth, 56, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 53, 15);
  const disclaimerLines = doc.splitTextToSize(
    'IMPORTANT MEDICAL NOTICE: An AI assessment cannot diagnose or exclude skin cancer. Only a qualified healthcare professional can evaluate your lesion and determine whether further testing or a biopsy is needed.',
    maxWidth - 20
  ) as string[];
  let dy = y + 18;
  for (const l of disclaimerLines) {
    doc.text(l, margin + 10, dy);
    dy += 13;
  }
  y += 74;

  // Record Metadata
  writeWrapped(`Assessment ID: ${assessment.id}`, 9.5, true, [71, 85, 105]);
  writeWrapped(
    `Date & Time: ${new Date(assessment.createdAt).toLocaleString()}`,
    9.5,
    false,
    [71, 85, 105]
  );
  writeWrapped(
    `Image Metadata: ${assessment.imageMetadata.format} (${assessment.imageMetadata.width}x${assessment.imageMetadata.height}px) · Stored: ${assessment.imageStored ? 'Yes' : 'Deleted per privacy policy'}`,
    9.5,
    false,
    [71, 85, 105]
  );
  y += 10;

  // Model Status & Output
  writeWrapped('1. Model Assessment Status', 12, true, [23, 105, 170]);
  writeWrapped(
    `Provider: ${assessment.modelResult.providerName} (${assessment.modelResult.modelVersion})`,
    10,
    false
  );
  writeWrapped(assessment.modelResult.displayMessage, 10.5, true, [15, 23, 42]);

  if (assessment.modelResult.classificationAvailable && assessment.modelResult.probabilities) {
    for (const p of assessment.modelResult.probabilities) {
      writeWrapped(`• ${p.category}: ${(p.probability * 100).toFixed(1)}%`, 10);
    }
  }
  y += 8;

  // Patient Reported Information
  writeWrapped('2. Patient-Provided Context', 12, true, [23, 105, 170]);
  writeWrapped(
    `Age Range: ${assessment.patientContext.ageRange || 'Skipped'} | Body Location: ${assessment.patientContext.bodyLocation || 'Skipped'}`,
    10
  );
  writeWrapped(
    `Duration Present: ${assessment.patientContext.durationPresent || 'Skipped'} | Change Reported: ${assessment.patientContext.hasChanged || 'Skipped'}`,
    10
  );
  writeWrapped(
    `Symptoms: ${assessment.patientContext.symptoms.length > 0 ? assessment.patientContext.symptoms.join(', ') : 'None reported'}`,
    10
  );
  if (assessment.patientContext.personalHistory) {
    writeWrapped(`History Notes: ${assessment.patientContext.personalHistory}`, 10);
  }
  y += 8;

  // Warning Signs
  if (assessment.warningSigns.length > 0) {
    writeWrapped('3. Flagged Clinical Considerations', 12, true, [180, 83, 9]);
    for (const w of assessment.warningSigns) {
      writeWrapped(`• ${w}`, 10);
    }
    y += 8;
  }

  // Educational Summary
  writeWrapped('4. Plain-Language Educational Summary', 12, true, [23, 105, 170]);
  writeWrapped(assessment.geminiGuidance.plainLanguageSummary, 10);
  y += 4;
  writeWrapped('Limitations:', 10, true);
  writeWrapped(assessment.geminiGuidance.limitationsExplained, 10);
  y += 8;

  // Next Steps
  writeWrapped('5. Recommended Next Steps', 12, true, [23, 105, 170]);
  for (const step of assessment.recommendedNextSteps) {
    writeWrapped(`• ${step}`, 10);
  }
  y += 8;

  // Questions for Dermatologist
  if (assessment.geminiGuidance.questionsForDoctor.length > 0) {
    writeWrapped('6. Questions to Bring to Your Dermatologist', 12, true, [23, 105, 170]);
    for (const q of assessment.geminiGuidance.questionsForDoctor) {
      writeWrapped(`• ${q}`, 10);
    }
  }

  doc.save(`dermaai-summary-${assessment.id.slice(0, 8)}.pdf`);
}
