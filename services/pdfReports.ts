import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TrainingSession, RunSession, Athlete, AppSettings } from '../types';
import { TEST_TYPES } from '../constants';

// Helper to get time from run data
const getRunTime = (run: RunSession): number | null => {
  if (!run.data || run.data.length === 0) return null;
  const lastPoint = run.data[run.data.length - 1];
  return lastPoint.timestamp / 1000; // Convert ms to seconds
};

// Helper to get max speed
const getMaxSpeed = (run: RunSession): number => {
  if (!run.data || run.data.length === 0) return 0;
  return Math.max(...run.data.map(d => d.speed));
};

// Helper to add header
const addHeader = (doc: jsPDF, title: string) => {
  doc.setFillColor(55, 53, 47); // #37352F
  doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LaserSpeed Pro', 14, 15);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 25);

  // Add date
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });

  doc.setTextColor(0, 0, 0); // Reset to black
};

// Helper to add footer
const addFooter = (doc: jsPDF, pageNumber: number) => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(155, 154, 151); // #9B9A97
  doc.text(
    `Page ${pageNumber} • LaserSpeed Pro Report`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  );
};

// Session Summary Report
export const generateSessionReport = (
  session: TrainingSession,
  athletes: Athlete[],
  settings: AppSettings
) => {
  const doc = new jsPDF();
  let yPos = 45;

  // Header
  addHeader(doc, 'Training Session Report');

  // Session Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(session.name, 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 119, 116);
  doc.text(`Date: ${new Date(session.date).toLocaleDateString()}`, 14, yPos);
  yPos += 5;
  doc.text(`Total Runs: ${session.runs.length}`, 14, yPos);
  yPos += 5;
  doc.text(`Athletes: ${session.athleteIds.length}`, 14, yPos);
  yPos += 10;

  doc.setTextColor(0, 0, 0);

  // Runs Table
  if (session.runs.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Session Runs', 14, yPos);
    yPos += 7;

    const tableData = session.runs.map((run, index) => {
      const athlete = athletes.find(a => a.id === run.athleteId);
      const time = getRunTime(run);
      const maxSpeed = getMaxSpeed(run);
      const testLabel = TEST_TYPES[run.config.type]?.label || run.config.type;

      return [
        `#${session.runs.length - index}`,
        athlete?.name || 'Unknown',
        testLabel,
        time ? `${time.toFixed(3)}s` : 'N/A',
        `${maxSpeed.toFixed(2)} m/s`,
        run.notes || '-'
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Athlete', 'Test Type', 'Time', 'Max Speed', 'Notes']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [55, 53, 47],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 53, 47]
      },
      alternateRowStyles: {
        fillColor: [247, 247, 245]
      },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Personal Bests Section
  const personalBests = new Map<string, { athlete: string; testType: string; time: number }>();

  session.runs.forEach(run => {
    const athlete = athletes.find(a => a.id === run.athleteId);
    const time = getRunTime(run);
    if (!athlete || !time) return;

    const key = `${run.athleteId}_${run.config.type}`;
    const existing = personalBests.get(key);

    if (!existing || time < existing.time) {
      personalBests.set(key, {
        athlete: athlete.name,
        testType: TEST_TYPES[run.config.type]?.label || run.config.type,
        time
      });
    }
  });

  if (personalBests.size > 0) {
    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Best Times This Session', 14, yPos);
    yPos += 7;

    const pbData = Array.from(personalBests.values()).map(pb => [
      pb.athlete,
      pb.testType,
      `${pb.time.toFixed(3)}s`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Athlete', 'Test Type', 'Best Time']],
      body: pbData,
      theme: 'striped',
      headStyles: {
        fillColor: [16, 185, 129], // Green
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244]
      },
      margin: { left: 14, right: 14 }
    });
  }

  // Footer
  addFooter(doc, 1);

  // Save
  doc.save(`${session.name.replace(/\s/g, '_')}_Report.pdf`);
};

// Athlete Progress Report
export const generateAthleteReport = (
  athlete: Athlete,
  allSessions: TrainingSession[],
  settings: AppSettings
) => {
  const doc = new jsPDF();
  let yPos = 45;

  // Header
  addHeader(doc, 'Athlete Progress Report');

  // Athlete Info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(athlete.name, 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 119, 116);

  if (athlete.email) {
    doc.text(`Email: ${athlete.email}`, 14, yPos);
    yPos += 5;
  }
  if (athlete.gender) {
    doc.text(`Gender: ${athlete.gender}`, 14, yPos);
    yPos += 5;
  }
  if (athlete.primaryEvent) {
    doc.text(`Primary Event: ${athlete.primaryEvent}`, 14, yPos);
    yPos += 5;
  }

  yPos += 5;
  doc.setTextColor(0, 0, 0);

  // Get all runs for this athlete
  const athleteRuns = allSessions
    .flatMap(s => s.runs.map(r => ({ ...r, sessionDate: s.date, sessionName: s.name })))
    .filter(r => r.athleteId === athlete.id)
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

  // Statistics
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Career Statistics', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Runs: ${athleteRuns.length}`, 14, yPos);
  yPos += 5;
  doc.text(`Sessions: ${new Set(athleteRuns.map(r => r.sessionDate)).size}`, 14, yPos);
  yPos += 10;

  // Personal Bests by Test Type
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Personal Bests', 14, yPos);
  yPos += 7;

  const personalBests = new Map<string, { testType: string; time: number; date: string }>();

  athleteRuns.forEach(run => {
    const time = getRunTime(run);
    if (!time) return;

    const existing = personalBests.get(run.config.type);
    if (!existing || time < existing.time) {
      personalBests.set(run.config.type, {
        testType: TEST_TYPES[run.config.type]?.label || run.config.type,
        time,
        date: run.sessionDate
      });
    }
  });

  if (personalBests.size > 0) {
    const pbData = Array.from(personalBests.values()).map(pb => [
      pb.testType,
      `${pb.time.toFixed(3)}s`,
      new Date(pb.date).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Test Type', 'Best Time', 'Date Achieved']],
      body: pbData,
      theme: 'striped',
      headStyles: {
        fillColor: [55, 53, 47],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [247, 247, 245]
      },
      margin: { left: 14, right: 14 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Recent Activity (Last 10 runs)
  if (athleteRuns.length > 0) {
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      addFooter(doc, 1);
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Activity (Last 10 Runs)', 14, yPos);
    yPos += 7;

    const recentRuns = athleteRuns.slice(0, 10);
    const recentData = recentRuns.map(run => {
      const time = getRunTime(run);
      const maxSpeed = getMaxSpeed(run);
      const testLabel = TEST_TYPES[run.config.type]?.label || run.config.type;

      return [
        new Date(run.sessionDate).toLocaleDateString(),
        testLabel,
        time ? `${time.toFixed(3)}s` : 'N/A',
        `${maxSpeed.toFixed(2)} m/s`
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Test Type', 'Time', 'Max Speed']],
      body: recentData,
      theme: 'striped',
      headStyles: {
        fillColor: [55, 53, 47],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [247, 247, 245]
      },
      margin: { left: 14, right: 14 }
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }

  // Save
  doc.save(`${athlete.name.replace(/\s/g, '_')}_Progress_Report.pdf`);
};

// Comparison Report for Multiple Athletes
export const generateComparisonReport = (
  athletes: Athlete[],
  allSessions: TrainingSession[],
  testType: string,
  testLabel: string
) => {
  const doc = new jsPDF();
  let yPos = 45;

  // Header
  addHeader(doc, 'Athletes Comparison Report');

  // Report Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${testLabel} Comparison`, 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 119, 116);
  doc.text(`Comparing ${athletes.length} Athletes`, 14, yPos);
  yPos += 10;
  doc.setTextColor(0, 0, 0);

  // Build comparison table
  const comparisonData = athletes.map(athlete => {
    const runs = allSessions
      .flatMap(s => s.runs)
      .filter(r => r.athleteId === athlete.id && r.config.type === testType);

    const times = runs.map(r => getRunTime(r)).filter((t): t is number => t !== null);
    const speeds = runs.map(r => getMaxSpeed(r));

    const bestTime = times.length > 0 ? Math.min(...times) : null;
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    const totalRuns = runs.length;

    return [
      athlete.name,
      athlete.gender || '-',
      totalRuns.toString(),
      bestTime ? `${bestTime.toFixed(3)}s` : 'N/A',
      avgTime ? `${avgTime.toFixed(3)}s` : 'N/A',
      `${maxSpeed.toFixed(2)} m/s`
    ];
  });

  // Sort by best time
  comparisonData.sort((a, b) => {
    const timeA = a[3] === 'N/A' ? Infinity : parseFloat(a[3]);
    const timeB = b[3] === 'N/A' ? Infinity : parseFloat(b[3]);
    return timeA - timeB;
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Athlete', 'Gender', 'Total Runs', 'Best Time', 'Avg Time', 'Max Speed']],
    body: comparisonData,
    theme: 'striped',
    headStyles: {
      fillColor: [55, 53, 47],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [247, 247, 245]
    },
    margin: { left: 14, right: 14 }
  });

  // Footer
  addFooter(doc, 1);

  // Save
  doc.save(`${testLabel.replace(/\s/g, '_')}_Comparison_Report.pdf`);
};
