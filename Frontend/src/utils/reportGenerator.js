import jsPDF from "jspdf";

const METRICS = [
  { key: "pronunciation", label: "Pronunciation", color: [255, 55, 95] },
  { key: "fluency",       label: "Fluency",       color: [48, 209, 88] },
  { key: "grammar",       label: "Grammar",       color: [10, 132, 255] },
  { key: "confidence",    label: "Confidence",    color: [255, 159, 10] },
  { key: "clarity",       label: "Clarity",       color: [191, 90, 242] },
  { key: "communication", label: "Communication", color: [100, 210, 255] },
];

function hexFromRgb([r, g, b]) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function scoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  return "Needs Work";
}

function scoreColor(score) {
  if (score >= 80) return [34, 197, 94];
  if (score >= 60) return [245, 158, 11];
  return [239, 68, 68];
}

// Draw a ring (arc) on canvas
function drawRing(doc, cx, cy, radius, value, color, strokeWidth = 8) {
  const progress = Math.min(Math.max(value, 0), 100);

  // Background track
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(strokeWidth * 0.4);
  doc.setGState(new doc.GState({ opacity: 0.15 }));
  doc.circle(cx, cy, radius, "S");
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Progress arc — drawn as many small line segments
  const segments = Math.floor((progress / 100) * 60);
  const startAngle = -Math.PI / 2;
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(strokeWidth * 0.4);

  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + (i / 60) * 2 * Math.PI;
    const a2 = startAngle + ((i + 1) / 60) * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy + radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2);
    const y2 = cy + radius * Math.sin(a2);
    doc.line(x1, y1, x2, y2);
  }
}

// Draw score bar
function drawBar(doc, x, y, width, height, value, color) {
  // Background
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");

  // Fill
  const fillWidth = (value / 100) * width;
  if (fillWidth > 0) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, y, Math.max(fillWidth, height), height, height / 2, height / 2, "F");
  }
}

// ─── SINGLE SESSION REPORT ───────────────────────────────────────────────────
export function generateSessionReport(session, userName, studentId) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  let y = 0;

  // ── HEADER BAND ──
  doc.setFillColor(10, 10, 20);
  doc.rect(0, 0, W, 45, "F");

  // Accent line
  doc.setFillColor(255, 55, 95);
  doc.rect(0, 0, W, 2, "F");

  // Logo / title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SYNYCS", 15, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 170);
  doc.text("Audio Fluency Analysis System", 15, 25);

  // Report type badge
  doc.setFillColor(255, 55, 95);
  doc.roundedRect(W - 60, 10, 48, 10, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("SESSION REPORT", W - 57, 17);

  // Student info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 220);
  doc.text(`Student: ${userName || "Unknown"}`, 15, 33);
  doc.text(`ID: ${studentId || "—"}`, 15, 39);
  doc.text(`Session #${session.session}`, W - 60, 33);
  doc.text(`Language: ${(session.language || "—").toUpperCase()}`, W - 60, 39);

  y = 55;

  // ── OVERALL SCORE RING (center) ──
  const overall = session.overall_score ?? 0;
  const oColor = scoreColor(overall);
  const ringCX = W / 2;
  const ringCY = y + 28;

  drawRing(doc, ringCX, ringCY, 22, overall, oColor, 10);

  // Score text in center
  doc.setTextColor(oColor[0], oColor[1], oColor[2]);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${overall}`, ringCX, ringCY + 3, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 140);
  doc.text("Overall Score", ringCX, ringCY + 10, { align: "center" });
  doc.text(scoreLabel(overall), ringCX, ringCY + 15, { align: "center" });

  y = ringCY + 32;

  // ── DIVIDER ──
  doc.setDrawColor(230, 230, 240);
  doc.setLineWidth(0.3);
  doc.line(15, y, W - 15, y);
  y += 8;

  // ── 6 METRIC RINGS ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 50);
  doc.text("Performance Metrics", 15, y);
  y += 8;

  const colW = (W - 30) / 3;
  const ringR = 13;

  METRICS.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 15 + colW * col + colW / 2;
    const cy = y + row * 42 + 16;
    const val = session[m.key] ?? 0;
    const mc = scoreColor(val);

    drawRing(doc, cx, cy, ringR, val, m.color, 7);

    // Value
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${val}`, cx, cy + 2.5, { align: "center" });

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 120);
    doc.text(m.label, cx, cy + ringR + 5, { align: "center" });

    // Mini bar
    drawBar(doc, cx - 12, cy + ringR + 7, 24, 2.5, val, mc);
  });

  y += 90;

  // ── AI SUMMARY ──
  if (session._rawScores?.summary) {
    doc.setFillColor(245, 245, 255);
    doc.roundedRect(15, y, W - 30, 22, 3, 3, "F");
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(15, y, 3, 22, 1.5, 1.5, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 100);
    doc.text("AI Summary", 22, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 110);
    const lines = doc.splitTextToSize(session._rawScores.summary, W - 40);
    doc.text(lines.slice(0, 2), 22, y + 13);
    y += 28;
  }

  // ── PRONUNCIATION CORRECTIONS ──
  const corrections = session._rawScores?.corrections || [];
  if (corrections.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 50);
    doc.text(`Pronunciation Corrections  (${corrections.length})`, 15, y);
    y += 6;

    corrections.slice(0, 8).forEach((c) => {
      if (y > H - 30) return;
      doc.setFillColor(255, 245, 245);
      doc.roundedRect(15, y, W - 30, 9, 2, 2, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(239, 68, 68);
      doc.text(c.wrong, 20, y + 6);

      doc.setTextColor(120, 120, 140);
      doc.setFont("helvetica", "normal");
      doc.text("→", 20 + doc.getTextWidth(c.wrong) + 3, y + 6);

      doc.setTextColor(34, 197, 94);
      doc.setFont("helvetica", "bold");
      doc.text(c.correct, 20 + doc.getTextWidth(c.wrong) + 9, y + 6);

      doc.setTextColor(150, 150, 170);
      doc.setFont("helvetica", "italic");
      const ctx = `"${c.context}"`;
      doc.text(ctx, W - 15 - doc.getTextWidth(ctx), y + 6);

      y += 11;
    });
    y += 4;
  }

  // ── TRANSCRIPTION ──
  if (session.transcription && y < H - 40) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 50);
    doc.text("Transcription", 15, y);
    y += 5;

    doc.setFillColor(248, 248, 255);
    const transcLines = doc.splitTextToSize(session.transcription, W - 40);
    const boxH = Math.min(transcLines.length * 4.5 + 8, H - y - 20);
    doc.roundedRect(15, y, W - 30, boxH, 3, 3, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 80);
    const visibleLines = transcLines.slice(0, Math.floor((boxH - 8) / 4.5));
    doc.text(visibleLines, 20, y + 6);
    y += boxH + 5;
  }

  // ── FOOTER ──
  doc.setFillColor(10, 10, 20);
  doc.rect(0, H - 12, W, 12, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 120);
  doc.text("Generated by SYNYCS Audio Fluency System", 15, H - 5);
  doc.text(new Date().toLocaleString(), W - 15, H - 5, { align: "right" });

  doc.save(`SYNYCS_Session_${session.session}_${studentId}.pdf`);
}

// ─── OVERALL REPORT (all sessions) ───────────────────────────────────────────
export function generateOverallReport(sessions, userName, studentId) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  let y = 0;

  // ── PAGE 1: COVER + AVERAGES ──
  doc.setFillColor(10, 10, 20);
  doc.rect(0, 0, W, H, "F");

  // Accent lines
  doc.setFillColor(255, 55, 95);
  doc.rect(0, 0, W, 3, "F");
  doc.setFillColor(48, 209, 88);
  doc.rect(0, H - 3, W, 3, "F");

  // Big title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("SYNYCS", W / 2, 80, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 170);
  doc.text("Audio Fluency Analysis Report", W / 2, 92, { align: "center" });

  // Divider
  doc.setDrawColor(255, 55, 95);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 30, 98, W / 2 + 30, 98);

  // Student info
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(userName || "Student", W / 2, 112, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 130);
  doc.text(`Student ID: ${studentId || "—"}`, W / 2, 120, { align: "center" });
  doc.text(`${sessions.length} Sessions Analyzed`, W / 2, 127, { align: "center" });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, W / 2, 134, { align: "center" });

  // Averages
  const avg = (key) =>
    sessions.length
      ? Math.round(sessions.reduce((a, s) => a + (s[key] ?? 0), 0) / sessions.length)
      : 0;
  const avgOverall = avg("overall_score");
  const best = Math.max(...sessions.map((s) => s.overall_score ?? 0));
  const improvement = sessions.length >= 2
    ? (sessions[sessions.length - 1]?.overall_score ?? 0) - (sessions[0]?.overall_score ?? 0)
    : 0;

  // Big ring on cover
  const oColor = scoreColor(avgOverall);
  drawRing(doc, W / 2, 175, 28, avgOverall, oColor, 12);
  doc.setTextColor(oColor[0], oColor[1], oColor[2]);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`${avgOverall}`, W / 2, 178, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 140);
  doc.text("Avg Score", W / 2, 185, { align: "center" });
  doc.text(scoreLabel(avgOverall), W / 2, 190, { align: "center" });

  // Stats row at bottom of cover
  const stats = [
    { label: "Sessions", value: sessions.length },
    { label: "Best", value: best },
    { label: "Growth", value: improvement >= 0 ? `+${improvement}` : `${improvement}` },
  ];
  stats.forEach((s, i) => {
    const sx = 40 + i * 65;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`${s.value}`, sx, 225, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 130);
    doc.text(s.label, sx, 232, { align: "center" });
  });

  // ── PAGE 2: METRICS BREAKDOWN ──
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  // Header band
  doc.setFillColor(10, 10, 20);
  doc.rect(0, 0, W, 18, "F");
  doc.setFillColor(255, 55, 95);
  doc.rect(0, 0, W, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SYNYCS — Performance Breakdown", 15, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 170);
  doc.text(`${userName} · ${studentId}`, W - 15, 12, { align: "right" });

  y = 30;

  // Section title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 40);
  doc.text("Average Performance — All Sessions", 15, y);
  y += 10;

  // 6 metric rings in 2 rows of 3
  const colW2 = (W - 30) / 3;
  METRICS.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 15 + colW2 * col + colW2 / 2;
    const cy = y + row * 50 + 18;
    const val = avg(m.key);
    const mc = scoreColor(val);

    drawRing(doc, cx, cy, 15, val, m.color, 8);

    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${val}`, cx, cy + 3, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    doc.text(m.label, cx, cy + 18 + 4, { align: "center" });
    doc.text(scoreLabel(val), cx, cy + 18 + 9, { align: "center" });

    drawBar(doc, cx - 14, cy + 22, 28, 3, val, mc);
  });

  y += 110;

  // ── SESSION TABLE ──
  doc.setDrawColor(230, 230, 240);
  doc.setLineWidth(0.3);
  doc.line(15, y, W - 15, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 40);
  doc.text("Session-by-Session Results", 15, y);
  y += 8;

  // Table header
  doc.setFillColor(10, 10, 20);
  doc.rect(15, y, W - 30, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  const cols = ["#", "Lang", "Pronun.", "Fluency", "Grammar", "Conf.", "Clarity", "Comm.", "Overall"];
  const colXs = [17, 26, 42, 60, 78, 96, 112, 130, 155];
  cols.forEach((c, i) => doc.text(c, colXs[i], y + 5.5));
  y += 9;

  sessions.forEach((s, idx) => {
    if (y > H - 25) return;
    const bg = idx % 2 === 0 ? [250, 250, 255] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(15, y, W - 30, 7, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 80);

    const row = [
      `${s.session}`,
      (s.language || "—").toUpperCase(),
      `${s.pronunciation ?? "—"}`,
      `${s.fluency ?? "—"}`,
      `${s.grammar ?? "—"}`,
      `${s.confidence ?? "—"}`,
      `${s.clarity ?? "—"}`,
      `${s.communication ?? "—"}`,
    ];
    row.forEach((val, i) => doc.text(val, colXs[i], y + 5));

    // Overall with color
    const ov = s.overall_score ?? 0;
    const ovC = scoreColor(ov);
    doc.setTextColor(ovC[0], ovC[1], ovC[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`${ov}`, colXs[8], y + 5);

    y += 8;
  });

  // ── PAGE 3: PER-SESSION DETAIL ──
  sessions.forEach((s, sIdx) => {
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");

    // Header
    doc.setFillColor(10, 10, 20);
    doc.rect(0, 0, W, 18, "F");
    doc.setFillColor(255, 55, 95);
    doc.rect(0, 0, W, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Session #${s.session} Detail`, 15, 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 170);
    doc.setFontSize(8);
    doc.text(`${(s.language || "—").toUpperCase()} · Overall: ${s.overall_score ?? "—"}`, W - 15, 12, { align: "right" });

    y = 28;

    // Rings for this session
    METRICS.forEach((m, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = 15 + colW2 * col + colW2 / 2;
      const cy = y + row * 45 + 15;
      const val = s[m.key] ?? 0;
      const mc = scoreColor(val);

      drawRing(doc, cx, cy, 13, val, m.color, 7);

      doc.setTextColor(m.color[0], m.color[1], m.color[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${val}`, cx, cy + 3, { align: "center" });

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 100);
      doc.text(m.label, cx, cy + 16 + 3, { align: "center" });
      drawBar(doc, cx - 12, cy + 20, 24, 2.5, val, mc);
    });

    y += 98;

    // Summary
    if (s._rawScores?.summary) {
      doc.setFillColor(245, 245, 255);
      doc.roundedRect(15, y, W - 30, 18, 3, 3, "F");
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(15, y, 3, 18, 1.5, 1.5, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 100);
      doc.text("AI Summary", 22, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 110);
      const lines = doc.splitTextToSize(s._rawScores.summary, W - 40);
      doc.text(lines.slice(0, 2), 22, y + 11);
      y += 23;
    }

    // Corrections
    const corr = s._rawScores?.corrections || [];
    if (corr.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 50);
      doc.text(`Corrections (${corr.length})`, 15, y);
      y += 5;

      corr.slice(0, 5).forEach((c) => {
        if (y > H - 30) return;
        doc.setFillColor(255, 248, 248);
        doc.roundedRect(15, y, W - 30, 8, 2, 2, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(239, 68, 68);
        doc.text(c.wrong, 20, y + 5.5);
        doc.setTextColor(120, 120, 140);
        doc.setFont("helvetica", "normal");
        doc.text("→", 20 + doc.getTextWidth(c.wrong) + 2, y + 5.5);
        doc.setTextColor(34, 197, 94);
        doc.setFont("helvetica", "bold");
        doc.text(c.correct, 20 + doc.getTextWidth(c.wrong) + 7, y + 5.5);
        y += 10;
      });
    }

    // Transcription
    if (s.transcription && y < H - 30) {
      y += 3;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 50);
      doc.text("Transcription", 15, y);
      y += 5;
      doc.setFillColor(248, 248, 255);
      const tLines = doc.splitTextToSize(s.transcription, W - 40);
      const bH = Math.min(tLines.length * 4.5 + 8, H - y - 18);
      doc.roundedRect(15, y, W - 30, bH, 3, 3, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 80);
      doc.text(tLines.slice(0, Math.floor((bH - 8) / 4.5)), 20, y + 6);
    }

    // Footer
    doc.setFillColor(10, 10, 20);
    doc.rect(0, H - 10, W, 10, "F");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 100);
    doc.text("SYNYCS Audio Fluency System", 15, H - 4);
    doc.text(`Page ${sIdx + 3} of ${sessions.length + 2}`, W - 15, H - 4, { align: "right" });
  });

  doc.save(`SYNYCS_Overall_Report_${studentId}.pdf`);
}