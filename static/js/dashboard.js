// dashboard.js — Dashboard rendering for single-run and compare views

async function loadDashboard(runId) {
    const analytics = await fetch(`/api/analytics/runs/${runId}`).then(r => r.json());
    renderDashboardContent(analytics);
}

async function loadCompareDashboard(runIds) {
    const ids = runIds.join(',');
    const analytics = await fetch(`/api/analytics/compare?run_ids=${ids}`).then(r => r.json());
    renderCompareDashboardContent(analytics);
}

function renderDashboardContent(analytics) {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    const gc = analytics.grade_counts;
    let html = '';

    // Accuracy Overview
    html += '<div class="section"><h2>Accuracy Overview</h2>';
    html += `<div style="display:flex;gap:2rem;flex-wrap:wrap;font-size:1.1rem;margin:1rem 0">`;
    html += `<span style="color:#28a745;font-weight:700">Correct: ${gc.correct}</span>`;
    html += `<span style="color:#f57c00;font-weight:700">Partial: ${gc.partial}</span>`;
    html += `<span style="color:#dc3545;font-weight:700">Wrong: ${gc.wrong}</span>`;
    html += `<span>Accuracy: ${gc.accuracy.toFixed(1)}%</span>`;
    html += `<span>Weighted Score: ${gc.weighted_score.toFixed(1)}%</span>`;
    html += '</div></div>';

    // By Query Type
    if (Object.keys(analytics.by_type || {}).length > 0) {
        html += '<div class="section"><h2>Accuracy by Query Type</h2>';
        html += '<table class="stats-table"><thead><tr><th>Type</th><th class="num">Count</th><th class="num">Score</th></tr></thead><tbody>';
        for (const [type, counts] of Object.entries(analytics.by_type)) {
            html += `<tr><td><span class="type-badge">${type}</span></td><td class="num">${counts.total}</td><td class="num">${counts.weighted_score.toFixed(1)}%</td></tr>`;
        }
        html += '</tbody></table></div>';
    }

    // Performance
    if (analytics.performance) {
        html += '<div class="section"><h2>Performance</h2>';
        html += '<table class="stats-table"><thead><tr><th>Metric</th><th class="num">Mean &plusmn; Std</th><th class="num">Median</th></tr></thead><tbody>';
        const metrics = [['Exec Time (s)', 'time'], ['Total Tokens', 'tokens'], ['Tool Calls', 'tools'], ['Reasoning Tokens', 'reasoning']];
        metrics.forEach(([label, key]) => {
            const st = analytics.performance[key];
            if (st && st.n > 0) {
                html += `<tr><td><strong>${label}</strong></td><td class="num">${st.mean.toFixed(1)} &plusmn; ${st.std.toFixed(1)}</td><td class="num">${st.median.toFixed(1)}</td></tr>`;
            }
        });
        html += '</tbody></table></div>';
    }

    // Tool Usage
    if (Object.keys(analytics.tool_usage || {}).length > 0) {
        const tu = analytics.tool_usage;
        const maxVal = Math.max(...Object.values(tu));
        html += '<div class="section"><h2>Tool Usage</h2>';
        Object.entries(tu).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
            const w = Math.max(20, Math.round(count / maxVal * 300));
            html += `<div class="tool-bar-row"><div class="tool-bar-name">${name}</div><div class="tool-bar-seg" style="width:${w}px;background:#0066cc">${count}</div></div>`;
        });
        html += '</div>';
    }

    container.innerHTML = html;
}

function renderCompareDashboardContent(analytics) {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    const runs = analytics.runs || [];
    let html = '';

    // Accuracy Overview Table
    html += '<div class="section"><h2>Accuracy Overview</h2>';
    html += '<table class="stats-table"><thead><tr><th>Run</th><th class="num">Correct</th><th class="num">Partial</th><th class="num">Wrong</th><th class="num">Accuracy</th><th class="num">Weighted Score</th></tr></thead><tbody>';
    runs.forEach(r => {
        const gc = r.grade_counts;
        html += `<tr><td><strong>${r.label}</strong></td>`;
        html += `<td class="num" style="color:#28a745;font-weight:600">${gc.correct}</td>`;
        html += `<td class="num" style="color:#f57c00;font-weight:600">${gc.partial}</td>`;
        html += `<td class="num" style="color:#dc3545;font-weight:600">${gc.wrong}</td>`;
        html += `<td class="num">${gc.accuracy.toFixed(1)}%</td>`;
        html += `<td class="num"><strong>${gc.weighted_score.toFixed(1)}%</strong></td></tr>`;
    });
    // Mean row
    if (runs.length > 1) {
        const meanAcc = runs.reduce((s, r) => s + r.grade_counts.accuracy, 0) / runs.length;
        const meanScore = runs.reduce((s, r) => s + r.grade_counts.weighted_score, 0) / runs.length;
        html += `<tr style="font-style:italic;background:#f8f9fa"><td>Mean</td><td></td><td></td><td></td><td class="num">${meanAcc.toFixed(1)}%</td><td class="num">${meanScore.toFixed(1)}%</td></tr>`;
    }
    html += '</tbody></table></div>';

    // Consistency
    if (analytics.consistency) {
        const con = analytics.consistency;
        html += '<div class="section"><h2>Consistency</h2>';
        html += '<div class="heatmap-legend" style="margin-bottom:0.5rem">';
        html += `<div class="legend-item"><div class="legend-dot" style="background:#28a745"></div> All correct: ${con.all_correct}</div>`;
        html += `<div class="legend-item"><div class="legend-dot" style="background:#ffc107"></div> All partial: ${con.all_partial}</div>`;
        html += `<div class="legend-item"><div class="legend-dot" style="background:#fd7e14"></div> Inconsistent: ${con.inconsistent}</div>`;
        html += `<div class="legend-item"><div class="legend-dot" style="background:#dc3545"></div> All wrong: ${con.all_wrong}</div>`;
        html += '</div></div>';
    }

    // Performance comparison
    html += '<div class="section"><h2>Performance Stats</h2>';
    html += '<table class="stats-table"><thead><tr><th>Metric</th>';
    runs.forEach(r => { html += `<th class="num">${r.label} Mean&plusmn;Std</th><th class="num">Med</th>`; });
    html += '</tr></thead><tbody>';
    const metrics = [['Exec Time (s)', 'time'], ['Total Tokens', 'tokens'], ['Tool Calls', 'tools']];
    metrics.forEach(([label, key]) => {
        html += `<tr><td><strong>${label}</strong></td>`;
        runs.forEach(r => {
            const st = r.performance[key];
            if (st && st.n > 0) {
                html += `<td class="num">${st.mean.toFixed(1)}&plusmn;${st.std.toFixed(1)}</td><td class="num">${st.median.toFixed(1)}</td>`;
            } else {
                html += '<td class="num">N/A</td><td class="num">N/A</td>';
            }
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    // Tool Usage comparison
    const allToolNames = new Set();
    runs.forEach(r => Object.keys(r.tool_usage || {}).forEach(n => allToolNames.add(n)));
    if (allToolNames.size > 0) {
        const colors = ['#0066cc', '#ff9800', '#28a745', '#9c27b0', '#dc3545'];
        html += '<div class="section"><h2>Tool Usage Across Runs</h2>';
        html += '<div style="display:flex;gap:1rem;margin-bottom:1rem;font-size:0.85rem">';
        runs.forEach((r, i) => {
            html += `<div style="display:flex;align-items:center;gap:0.3rem"><div style="width:14px;height:14px;border-radius:3px;background:${colors[i % colors.length]}"></div> ${r.label}</div>`;
        });
        html += '</div>';
        let maxTotal = 0;
        [...allToolNames].forEach(n => {
            let t = 0;
            runs.forEach(r => { t += (r.tool_usage[n] || 0); });
            if (t > maxTotal) maxTotal = t;
        });
        [...allToolNames].sort().forEach(name => {
            html += '<div class="tool-bar-row"><div class="tool-bar-name">' + name + '</div><div style="display:flex;gap:2px;flex:1;align-items:center">';
            runs.forEach((r, i) => {
                const cnt = r.tool_usage[name] || 0;
                if (cnt > 0) {
                    const w = Math.max(20, Math.round(cnt / maxTotal * 250));
                    html += `<div class="tool-bar-seg" style="width:${w}px;background:${colors[i % colors.length]}" title="${r.label}: ${cnt}">${cnt}</div>`;
                }
            });
            html += '</div></div>';
        });
        html += '</div>';
    }

    container.innerHTML = html;
}
