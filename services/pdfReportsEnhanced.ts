import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TrainingSession, RunSession, Athlete, AppSettings, DataPoint } from '../types';
import { TEST_TYPES } from '../constants';

// Helper to get time from run data
const getRunTime = (run: RunSession): number | null => {
  if (!run.data || run.data.length === 0) return null;
  const lastPoint = run.data[run.data.length - 1];
  return lastPoint.timestamp / 1000;
};

// Helper to get max speed
const getMaxSpeed = (run: RunSession): number => {
  if (!run.data || run.data.length === 0) return 0;
  return Math.max(...run.data.map(d => d.speed));
};

// Calculate split times (every 10m)
const calculateSplits = (data: DataPoint[]): { distance: number; time: number; speed: number }[] => {
  const splits: { distance: number; time: number; speed: number }[] = [];
  const splitDistances = [10, 20, 30, 40, 50, 60]; // meters

  splitDistances.forEach(targetDist => {
    // Find the data point closest to this distance
    const idx = data.findIndex(d => d.distance >= targetDist);
    if (idx === -1) return;

    // Interpolate for exact distance
    if (idx === 0) {
      splits.push({
        distance: targetDist,
        time: data[idx].timestamp / 1000,
        speed: data[idx].speed
      });
    } else {
      const p1 = data[idx - 1];
      const p2 = data[idx];
      const frac = (targetDist - p1.distance) / (p2.distance - p1.distance);
      const interpolatedTime = p1.timestamp + frac * (p2.timestamp - p1.timestamp);
      const interpolatedSpeed = p1.speed + frac * (p2.speed - p1.speed);

      splits.push({
        distance: targetDist,
        time: interpolatedTime / 1000,
        speed: interpolatedSpeed
      });
    }
  });

  return splits;
};

// Generate velocity curve as canvas and return as base64
const generateVelocityGraph = (
  data: DataPoint[],
  width: number = 800,
  height: number = 500
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Get data bounds
  const maxDist = Math.max(...data.map(d => d.distance));
  const maxSpeed = Math.max(...data.map(d => d.speed));
  const roundedMaxSpeed = Math.ceil(maxSpeed * 1.1); // Add 10% headroom

  const padding = 80;
  const graphWidth = width - 2 * padding;
  const graphHeight = height - 2 * padding;

  // Draw grid lines (both horizontal and vertical)
  ctx.strokeStyle = '#E9E9E7';
  ctx.lineWidth = 2;

  // Horizontal grid lines
  for (let i = 0; i <= 10; i++) {
    const y = padding + (graphHeight / 10) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Vertical grid lines
  for (let i = 0; i <= 10; i++) {
    const x = padding + (graphWidth / 10) * i;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Draw axes (thicker)
  ctx.strokeStyle = '#37352F';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw velocity curve (thicker and smoother)
  ctx.strokeStyle = '#3B82F6'; // Blue color for better visibility
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  data.forEach((point, i) => {
    const x = padding + (point.distance / maxDist) * graphWidth;
    const y = height - padding - (point.speed / roundedMaxSpeed) * graphHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Fill area under curve
  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  data.forEach((point) => {
    const x = padding + (point.distance / maxDist) * graphWidth;
    const y = height - padding - (point.speed / roundedMaxSpeed) * graphHeight;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(padding + graphWidth, height - padding);
  ctx.closePath();
  ctx.fill();

  // Draw data points
  ctx.fillStyle = '#1E40AF';
  data.forEach((point) => {
    const x = padding + (point.distance / maxDist) * graphWidth;
    const y = height - padding - (point.speed / roundedMaxSpeed) * graphHeight;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw labels with better fonts
  ctx.fillStyle = '#37352F';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';

  // Title
  ctx.fillText('Velocity Profile', width / 2, 30);

  // X-axis label
  ctx.font = 'bold 16px Arial';
  ctx.fillText('Distance (meters)', width / 2, height - 15);

  // Y-axis label
  ctx.save();
  ctx.translate(20, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Speed (m/s)', 0, 0);
  ctx.restore();

  // Axis values (larger and clearer)
  ctx.font = '14px Arial';
  ctx.fillStyle = '#37352F';

  // Y-axis values
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 10; i++) {
    const speedValue = (roundedMaxSpeed / 10) * (10 - i);
    const y = padding + (graphHeight / 10) * i;
    ctx.fillText(speedValue.toFixed(1), padding - 15, y);
  }

  // X-axis values
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 10; i++) {
    const distValue = (maxDist / 10) * i;
    const x = padding + (graphWidth / 10) * i;
    ctx.fillText(distValue.toFixed(0), x, height - padding + 10);
  }

  // Add max speed indicator
  const maxSpeedPoint = data.reduce((max, point) => point.speed > max.speed ? point : max, data[0]);
  const maxX = padding + (maxSpeedPoint.distance / maxDist) * graphWidth;
  const maxY = height - padding - (maxSpeedPoint.speed / roundedMaxSpeed) * graphHeight;

  // Draw max speed marker
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(maxX, maxY);
  ctx.lineTo(maxX, height - padding);
  ctx.stroke();
  ctx.setLineDash([]);

  // Max speed label
  ctx.fillStyle = '#EF4444';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Max: ${maxSpeedPoint.speed.toFixed(2)} m/s`, maxX, maxY - 15);

  return canvas.toDataURL('image/png');
};

// Helper to add header
const addHeader = (doc: jsPDF, title: string) => {
  doc.setFillColor(55, 53, 47);
  doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LaserSpeed Pro', 14, 15);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 25);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });

  doc.setTextColor(0, 0, 0);
};

// Helper to add footer
const addFooter = (doc: jsPDF, pageNumber: number) => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(155, 154, 151);
  doc.text(
    `Page ${pageNumber} • LaserSpeed Pro Report`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  );
};

// Enhanced Session Summary Report
export const generateSessionReport = (
  session: TrainingSession,
  athletes: Athlete[],
  settings: AppSettings
) => {
  const doc = new jsPDF();
  let yPos = 45;
  let pageNumber = 1;

  // Header
  addHeader(doc, 'Detailed Training Session Report');

  // Session Info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(session.name, 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 119, 116);
  doc.text(`Date: ${new Date(session.date).toLocaleDateString()} ${new Date(session.date).toLocaleTimeString()}`, 14, yPos);
  yPos += 5;
  doc.text(`Total Runs: ${session.runs.length}`, 14, yPos);
  yPos += 5;
  doc.text(`Athletes: ${session.athleteIds.length}`, 14, yPos);
  yPos += 10;

  doc.setTextColor(0, 0, 0);

  // Detailed Run Breakdown
  session.runs.forEach((run, index) => {
    const athlete = athletes.find(a => a.id === run.athleteId);
    const time = getRunTime(run);
    const maxSpeed = getMaxSpeed(run);
    const testLabel = TEST_TYPES[run.config.type]?.label || run.config.type;
    const splits = calculateSplits(run.data);

    // Check if we need a new page
    if (yPos > 220) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber++;
      yPos = 20;
    }

    // Run header
    doc.setFillColor(247, 247, 245);
    doc.rect(14, yPos - 5, doc.internal.pageSize.width - 28, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Run #${session.runs.length - index}: ${athlete?.name || 'Unknown'} - ${testLabel}`, 16, yPos);
    yPos += 10;

    // Run details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Time: ${time ? time.toFixed(3) + 's' : 'N/A'}`, 16, yPos);
    doc.text(`Max Speed: ${maxSpeed.toFixed(2)} m/s`, 70, yPos);
    doc.text(`Date: ${new Date(run.date).toLocaleTimeString()}`, 130, yPos);
    yPos += 5;

    if (run.notes) {
      doc.setTextColor(120, 119, 116);
      doc.text(`Notes: ${run.notes}`, 16, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }

    yPos += 3;

    // Split times table
    if (splits.length > 0) {
      const splitData = splits.map(split => [
        `${split.distance}m`,
        `${split.time.toFixed(3)}s`,
        `${split.speed.toFixed(2)} m/s`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Distance', 'Time', 'Speed at Split']],
        body: splitData,
        theme: 'plain',
        headStyles: {
          fillColor: [233, 233, 231],
          textColor: [55, 53, 47],
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [55, 53, 47]
        },
        margin: { left: 16, right: 16 },
        tableWidth: 80
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;
    }

    // Velocity graph
    if (run.data.length > 0) {
      if (yPos > 180) {
        addFooter(doc, pageNumber);
        doc.addPage();
        pageNumber++;
        yPos = 20;
      }

      try {
        const graphImage = generateVelocityGraph(run.data);
        doc.addImage(graphImage, 'PNG', 10, yPos, 190, 120);
        yPos += 125;
      } catch (error) {
        console.error('Failed to generate graph:', error);
      }
    }

    yPos += 5;
  });

  // Summary stats on last page
  if (yPos > 200) {
    addFooter(doc, pageNumber);
    doc.addPage();
    pageNumber++;
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Session Summary', 14, yPos);
  yPos += 10;

  // Personal bests this session
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
        fillColor: [16, 185, 129],
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

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }

  doc.save(`${session.name.replace(/\s/g, '_')}_Detailed_Report.pdf`);
};

// Enhanced Athlete Progress Report
export const generateAthleteReport = (
  athlete: Athlete,
  allSessions: TrainingSession[],
  settings: AppSettings
) => {
  const doc = new jsPDF();
  let yPos = 45;
  let pageNumber = 1;

  addHeader(doc, 'Comprehensive Athlete Report');

  // Athlete Info
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(athlete.name, 14, yPos);
  yPos += 10;

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
  if (athlete.dob) {
    const age = new Date().getFullYear() - new Date(athlete.dob).getFullYear();
    doc.text(`Age: ${age} years`, 14, yPos);
    yPos += 5;
  }

  yPos += 8;
  doc.setTextColor(0, 0, 0);

  // Get all runs
  const athleteRuns = allSessions
    .flatMap(s => s.runs.map(r => ({ ...r, sessionDate: s.date, sessionName: s.name })))
    .filter(r => r.athleteId === athlete.id)
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

  // Career stats
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Career Statistics', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Runs: ${athleteRuns.length}`, 14, yPos);
  yPos += 5;
  doc.text(`Sessions: ${new Set(athleteRuns.map(r => r.sessionDate)).size}`, 14, yPos);
  yPos += 5;
  doc.text(`Test Types: ${new Set(athleteRuns.map(r => r.config.type)).size}`, 14, yPos);
  yPos += 10;

  // Personal Bests
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Personal Bests', 14, yPos);
  yPos += 8;

  const personalBests = new Map<string, { testType: string; time: number; date: string; maxSpeed: number }>();

  athleteRuns.forEach(run => {
    const time = getRunTime(run);
    const maxSpeed = getMaxSpeed(run);
    if (!time) return;

    const existing = personalBests.get(run.config.type);
    if (!existing || time < existing.time) {
      personalBests.set(run.config.type, {
        testType: TEST_TYPES[run.config.type]?.label || run.config.type,
        time,
        date: run.sessionDate,
        maxSpeed
      });
    }
  });

  if (personalBests.size > 0) {
    const pbData = Array.from(personalBests.values()).map(pb => [
      pb.testType,
      `${pb.time.toFixed(3)}s`,
      `${pb.maxSpeed.toFixed(2)} m/s`,
      new Date(pb.date).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Test Type', 'Best Time', 'Max Speed', 'Date']],
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

  // Detailed recent runs (last 5 with graphs)
  if (athleteRuns.length > 0) {
    if (yPos > 200) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber++;
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Runs (Detailed)', 14, yPos);
    yPos += 10;

    const recentRuns = athleteRuns.slice(0, 5);

    recentRuns.forEach((run, idx) => {
      if (yPos > 200) {
        addFooter(doc, pageNumber);
        doc.addPage();
        pageNumber++;
        yPos = 20;
      }

      const time = getRunTime(run);
      const maxSpeed = getMaxSpeed(run);
      const testLabel = TEST_TYPES[run.config.type]?.label || run.config.type;
      const splits = calculateSplits(run.data);

      // Run header
      doc.setFillColor(247, 247, 245);
      doc.rect(14, yPos - 5, doc.internal.pageSize.width - 28, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${testLabel} - ${new Date(run.sessionDate).toLocaleDateString()}`, 16, yPos);
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Time: ${time ? time.toFixed(3) + 's' : 'N/A'}  |  Max Speed: ${maxSpeed.toFixed(2)} m/s`, 16, yPos);
      yPos += 5;

      if (run.notes) {
        doc.setTextColor(120, 119, 116);
        doc.text(`Notes: ${run.notes}`, 16, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 5;
      }

      yPos += 3;

      // Splits
      if (splits.length > 0 && yPos < 230) {
        const splitData = splits.map(s => [
          `${s.distance}m`,
          `${s.time.toFixed(3)}s`,
          `${s.speed.toFixed(2)} m/s`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Distance', 'Time', 'Speed']],
          body: splitData,
          theme: 'plain',
          headStyles: {
            fillColor: [233, 233, 231],
            textColor: [55, 53, 47],
            fontStyle: 'bold',
            fontSize: 8
          },
          bodyStyles: {
            fontSize: 8
          },
          margin: { left: 16 },
          tableWidth: 70
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Velocity graph
      if (run.data.length > 0 && yPos < 160) {
        try {
          const graphImage = generateVelocityGraph(run.data);
          doc.addImage(graphImage, 'PNG', 10, yPos, 190, 120);
          yPos += 125;
        } catch (error) {
          console.error('Failed to generate graph:', error);
        }
      }

      yPos += 10;
    });
  }

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }

  doc.save(`${athlete.name.replace(/\s/g, '_')}_Comprehensive_Report.pdf`);
};

// Comparison Report (keep similar to before but enhanced)
export const generateComparisonReport = (
  athletes: Athlete[],
  allSessions: TrainingSession[],
  testType: string,
  testLabel: string
) => {
  const doc = new jsPDF();
  let yPos = 45;

  addHeader(doc, 'Athletes Comparison Report');

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

  const comparisonData = athletes.map(athlete => {
    const runs = allSessions
      .flatMap(s => s.runs)
      .filter(r => r.athleteId === athlete.id && r.config.type === testType);

    const times = runs.map(r => getRunTime(r)).filter((t): t is number => t !== null);
    const speeds = runs.map(r => getMaxSpeed(r));

    const bestTime = times.length > 0 ? Math.min(...times) : null;
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

    return [
      athlete.name,
      athlete.gender || '-',
      runs.length.toString(),
      bestTime ? `${bestTime.toFixed(3)}s` : 'N/A',
      avgTime ? `${avgTime.toFixed(3)}s` : 'N/A',
      `${maxSpeed.toFixed(2)} m/s`
    ];
  });

  comparisonData.sort((a, b) => {
    const timeA = a[3] === 'N/A' ? Infinity : parseFloat(a[3]);
    const timeB = b[3] === 'N/A' ? Infinity : parseFloat(b[3]);
    return timeA - timeB;
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Athlete', 'Gender', 'Runs', 'Best Time', 'Avg Time', 'Max Speed']],
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

  addFooter(doc, 1);
  doc.save(`${testLabel.replace(/\s/g, '_')}_Comparison_Report.pdf`);
};
