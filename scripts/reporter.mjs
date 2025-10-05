#!/usr/bin/env node
// scripts/reporter.mjs
// Generates a simple HTML report for strategy recommendation
// Can be extended with Puppeteer for PDF generation

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read tool_args from environment or file
const toolArgsPath = process.env.TOOL_ARGS_PATH || "./artifacts/tool_args.json";
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000";

console.log("📄 PitStop AI Reporter - Generating strategy report...");

async function generateReport() {
  try {
    // Read tool args
    if (!fs.existsSync(toolArgsPath)) {
      console.error(`❌ Tool args not found at: ${toolArgsPath}`);
      process.exit(1);
    }

    const toolArgs = JSON.parse(fs.readFileSync(toolArgsPath, "utf8"));
    console.log(
      `✅ Loaded tool args: ${toolArgs.candidates?.length || 0} candidates`
    );

    // Fetch simulation result (in real scenario, this would call the API)
    // For now, we'll read from a cached result if available
    const resultPath = "./artifacts/sim_result.json";
    let simResult = null;
    let explanation = null;

    if (fs.existsSync(resultPath)) {
      const data = JSON.parse(fs.readFileSync(resultPath, "utf8"));
      simResult = data.sim_result;
      explanation = data.explanation;
    }

    // Generate HTML report
    const html = generateHTML(toolArgs, simResult, explanation);

    // Write to reports directory
    const reportsDir = path.join(__dirname, "../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-").slice(0, -5);
    const htmlPath = path.join(reportsDir, `strategy-report-${timestamp}.html`);

    fs.writeFileSync(htmlPath, html, "utf8");
    console.log(`✅ Report generated: ${htmlPath}`);

    // Write metadata
    const metaPath = path.join(reportsDir, "latest.json");
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          timestamp,
          filename: `strategy-report-${timestamp}.html`,
          path: htmlPath,
        },
        null,
        2
      ),
      "utf8"
    );

    console.log("✨ Report generation complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Report generation failed:", error);
    process.exit(1);
  }
}

function generateHTML(toolArgs, simResult, explanation) {
  const bestCandidate = simResult?.candidates?.[0] || {};
  const pitLap =
    bestCandidate.candidate?.pit_lap ||
    toolArgs.candidates?.[0]?.pit_lap ||
    "N/A";
  const compound = bestCandidate.candidate?.compound?.toUpperCase() || "N/A";
  const finalGap = bestCandidate.median_gap_after_5_laps?.toFixed(2) || "N/A";
  const baseGap = toolArgs.base_target_gap_s?.toFixed(2) || "N/A";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PitStop AI Strategy Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      color: #1a202c;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px;
      text-align: center;
      color: white;
    }
    .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .header p { font-size: 1.1rem; opacity: 0.9; }
    .content { padding: 40px; }
    .recommendation {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-left: 6px solid #10b981;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 8px;
    }
    .recommendation h2 {
      font-size: 2rem;
      color: #065f46;
      margin-bottom: 15px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .metric-card .label {
      font-size: 0.875rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .metric-card .value {
      font-size: 2rem;
      font-weight: bold;
      color: #1f2937;
    }
    .rationale {
      background: #f9fafb;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 30px;
    }
    .rationale h3 {
      font-size: 1.25rem;
      margin-bottom: 15px;
      color: #1f2937;
    }
    .rationale ul {
      list-style: none;
    }
    .rationale li {
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
      color: #4b5563;
    }
    .rationale li:last-child { border-bottom: none; }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 0.875rem;
    }
    .badge {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      margin: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏎️ PitStop AI</h1>
      <p>AI-Powered Race Strategy Report</p>
      <div style="margin-top: 15px;">
        <span class="badge">Powered by Meta Llama</span>
        <span class="badge">Cerebras Inference</span>
        <span class="badge">Docker MCP Gateway</span>
      </div>
    </div>

    <div class="content">
      <div class="recommendation">
        <h2>🏆 Recommended Strategy</h2>
        <p style="font-size: 1.5rem; margin-top: 10px;">
          <strong>Pit Lap ${pitLap} (${compound})</strong>
        </p>
      </div>

      <div class="metrics">
        <div class="metric-card">
          <div class="label">Starting Gap</div>
          <div class="value">${baseGap}s</div>
        </div>
        <div class="metric-card">
          <div class="label">Final Gap</div>
          <div class="value">${finalGap}s</div>
        </div>
        <div class="metric-card">
          <div class="label">Net Change</div>
          <div class="value">${(
            parseFloat(finalGap) - parseFloat(baseGap)
          ).toFixed(2)}s</div>
        </div>
      </div>

      ${
        explanation
          ? `
      <div class="rationale">
        <h3>💡 Why This Strategy Works</h3>
        <ul>
          ${
            explanation.rationale
              ?.slice(0, 3)
              .map((r) => `<li>• ${r}</li>`)
              .join("") || "<li>Analysis complete</li>"
          }
        </ul>
      </div>
      `
          : ""
      }

      <div class="rationale">
        <h3>📋 Race Context</h3>
        <ul>
          <li><strong>Current Lap:</strong> ${toolArgs.base_lap}</li>
          <li><strong>Current Tires:</strong> ${toolArgs.current_compound?.toUpperCase()} (${
    toolArgs.current_tire_age
  } laps old)</li>
          <li><strong>Candidates Evaluated:</strong> ${
            toolArgs.candidates?.length || 0
          }</li>
          <li><strong>Monte Carlo Samples:</strong> ${
            toolArgs.mc_samples || 400
          }</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>Generated by PitStop AI Docker MCP Gateway • ${new Date().toLocaleString()}</p>
      <p style="margin-top: 5px;">This report demonstrates creative Docker orchestration via MCP</p>
    </div>
  </div>
</body>
</html>`;
}

generateReport();
