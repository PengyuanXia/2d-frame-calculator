/**
 * 2D Frame Calculator - Step-by-Step Analytical Report Generator
 * Outputs structured HTML formatted for KaTeX LaTeX rendering.
 */

import { TRANSLATIONS } from './i18n.js';

function formatNum(val, maxDec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 1e-9) return '0.00';
  return num.toFixed(maxDec);
}

export function generateStepByStepReport(frameData, solution, lang = 'en') {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  if (!solution || !solution.isStable) {
    return `
      <div class="p-6 bg-amber-50 border border-amber-300 rounded-lg text-amber-900">
        <h3 class="font-bold text-lg mb-2">⚠ ${t.unstableBannerTitle}</h3>
        <p class="text-sm">${t.unstableBannerDesc1}</p>
        <p class="text-sm mt-1">${t.unstableBannerDesc2}</p>
      </div>
    `;
  }

  const nodes = solution.nodes || [];
  const elements = solution.elements || [];
  const reactions = solution.reactions || {};
  const det = solution.determinacy;

  // 1. Structural Determinacy Section
  let detBadge = '';
  if (det.degree === 0) {
    detBadge = `<span class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-bold text-xs">✓ ${t.statusDeterminate}</span>`;
  } else if (det.degree > 0) {
    const text = t.statusIndeterminate.replace('{n}', det.degree);
    detBadge = `<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded font-bold text-xs">✓ ${text}</span>`;
  } else {
    detBadge = `<span class="bg-red-100 text-red-800 px-3 py-1 rounded font-bold text-xs">⚠ ${t.statusUnstable}</span>`;
  }

  // 2. Global Equilibrium Section
  const eq = solution.equilibrium || { netFx: 0, netFz: 0, netM: 0, isBalanced: true };

  // 3. Reactions Table
  let reactionsRows = '';
  for (const [nodeId, r] of Object.entries(reactions)) {
    const node = nodes.find(n => n.id === nodeId);
    const loc = node ? `(${formatNum(node.x, 1)}, ${formatNum(node.z, 1)})` : '-';
    reactionsRows += `
      <tr>
        <td class="font-bold font-mono text-blue-700">${nodeId}</td>
        <td class="font-mono">${loc}</td>
        <td class="font-mono font-bold text-slate-800">${formatNum(r.Rx)} kN</td>
        <td class="font-mono font-bold text-slate-800">${formatNum(r.Rz)} kN</td>
        <td class="font-mono font-bold text-slate-800">${formatNum(r.MR)} kNm</td>
      </tr>
    `;
  }

  // 4. Member End Forces Table
  let memberRows = '';
  elements.forEach(elem => {
    const ef = elem.endForces;
    memberRows += `
      <tr>
        <td class="font-bold font-mono text-blue-700">${elem.id}</td>
        <td class="font-mono">${elem.nodeI} &rarr; ${elem.nodeJ} (L = ${formatNum(elem.L, 2)}m)</td>
        <td class="font-mono text-xs">
          N = ${formatNum(ef.i.N)} kN<br>
          T = ${formatNum(ef.i.T)} kN<br>
          M = ${formatNum(ef.i.M)} kNm
        </td>
        <td class="font-mono text-xs">
          N = ${formatNum(ef.j.N)} kN<br>
          T = ${formatNum(ef.j.T)} kN<br>
          M = ${formatNum(ef.j.M)} kNm
        </td>
        <td class="font-mono text-xs text-slate-700">
          N &isin; [${formatNum(elem.extrema.N.min)}, ${formatNum(elem.extrema.N.max)}]<br>
          T &isin; [${formatNum(elem.extrema.T.min)}, ${formatNum(elem.extrema.T.max)}]<br>
          M &isin; [${formatNum(elem.extrema.M.min)}, ${formatNum(elem.extrema.M.max)}]
        </td>
      </tr>
    `;
  });

  // If Truss mode, generate dedicated Truss Step-by-Step Report
  if (solution.structureType === 'truss') {
    let trussMemberRows = '';
    elements.forEach(elem => {
      const N_val = elem.axialForce || (elem.endForces && elem.endForces.j ? elem.endForces.j.N : 0);
      let stateBadge = '';
      if (elem.isZeroForce || Math.abs(N_val) < 1e-4) {
        stateBadge = `<span class="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold text-[11px]">${lang === 'pl' ? 'Pręt zerowy (0)' : 'Zero-Force (0)'}</span>`;
      } else if (N_val > 0) {
        stateBadge = `<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[11px]">${lang === 'pl' ? 'Rozciąganie (T)' : 'Tension (T)'}</span>`;
      } else {
        stateBadge = `<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold text-[11px]">${lang === 'pl' ? 'Ściskanie (C)' : 'Compression (C)'}</span>`;
      }

      trussMemberRows += `
        <tr>
          <td class="font-bold font-mono text-blue-700">${elem.id}</td>
          <td class="font-mono">${elem.nodeI} &rarr; ${elem.nodeJ}</td>
          <td class="font-mono">${formatNum(elem.L, 2)} m</td>
          <td class="font-mono font-bold text-slate-900 ${N_val > 0 ? 'text-blue-700' : (N_val < 0 ? 'text-red-700' : 'text-slate-600')}">
            ${formatNum(N_val, 2)} kN
          </td>
          <td>${stateBadge}</td>
        </tr>
      `;
    });

    return `
      <div class="space-y-6 text-slate-800">
        
        <!-- Section 1: System & Determinacy -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 class="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-3">
            ${lang === 'pl' ? '1. Geometria Kratownicy i Wyznaczalność Statyczna' : '1. Truss Geometry & Static Determinacy'}
          </h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-3">
            <div>
              <span class="text-slate-500 block">${t.nodesCountLabel || 'Nodes (k)'}</span>
              <span class="font-bold text-sm font-mono">${nodes.length}</span>
            </div>
            <div>
              <span class="text-slate-500 block">${t.membersCountLabel || 'Bars (p)'}</span>
              <span class="font-bold text-sm font-mono">${elements.length}</span>
            </div>
            <div>
              <span class="text-slate-500 block">${t.supportsCountLabel || 'Reactions (r)'}</span>
              <span class="font-bold text-sm font-mono">${Object.keys(reactions).length * 2}</span>
            </div>
            <div>
              <span class="text-slate-500 block">${t.statusLabel || 'Determinacy'}</span>
              <div class="mt-1">${detBadge}</div>
            </div>
          </div>
          <div class="text-xs font-mono bg-white p-2.5 rounded border border-slate-200 text-slate-700">
            <strong>${lang === 'pl' ? 'Wzór na stopień statycznej wyznaczalności kratownicy:' : 'Truss Determinacy Criterion Formula:'}</strong><br>
            $$n = (p + r) - 2k = (${elements.length} + r) - 2 \\cdot ${nodes.length} = ${det.degree}$$
          </div>
        </div>

        <!-- Section 2: Global Equilibrium & Reactions -->
        <div class="bg-white border border-slate-200 rounded-lg p-4">
          <h4 class="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-3">
            ${t.section2Title || '2. Global Equilibrium & Reactions'}
          </h4>
          <div class="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded border border-slate-200 mb-3">
            <div><strong>${t.sumFxEq || '&Sigma;Fx = 0:'}</strong> &Delta;Fx = ${formatNum(eq.netFx, 4)} kN ${Math.abs(eq.netFx) < 1e-2 ? '✓' : '✗'}</div>
            <div><strong>${t.sumFzEq || '&Sigma;Fz = 0:'}</strong> &Delta;Fz = ${formatNum(eq.netFz, 4)} kN ${Math.abs(eq.netFz) < 1e-2 ? '✓' : '✗'}</div>
            <div><strong>${t.sumMEq || '&Sigma;M(0,0) = 0:'}</strong> &Delta;M = ${formatNum(eq.netM, 4)} kNm ${Math.abs(eq.netM) < 1e-2 ? '✓' : '✗'}</div>
          </div>

          <div class="overflow-x-auto">
            <table class="poly-table w-full">
              <thead>
                <tr>
                  <th>${t.supportNodeCol || 'Node'}</th>
                  <th>${t.locCol || 'Location (x, z)'}</th>
                  <th>${t.rxCol || 'Rx [kN]'}</th>
                  <th>${t.rzCol || 'Rz [kN]'}</th>
                  <th>${t.mrCol || 'MR [kNm]'}</th>
                </tr>
              </thead>
              <tbody>
                ${reactionsRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 3: Member Axial Forces -->
        <div class="bg-white border border-slate-200 rounded-lg p-4">
          <h4 class="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-3">
            ${lang === 'pl' ? '3. Siły Osiowe w Prętach Kratownicy N [kN]' : '3. Truss Member Axial Forces N [kN]'}
          </h4>
          <div class="overflow-x-auto">
            <table class="poly-table w-full">
              <thead>
                <tr>
                  <th>${t.memberCol || 'Bar ID'}</th>
                  <th>${lang === 'pl' ? 'Węzły (i &rarr; j)' : 'Nodes (i &rarr; j)'}</th>
                  <th>${lang === 'pl' ? 'Długość L' : 'Length L'}</th>
                  <th>${lang === 'pl' ? 'Siła osiowa N [kN]' : 'Axial Force N [kN]'}</th>
                  <th>${lang === 'pl' ? 'Stan pręta' : 'State'}</th>
                </tr>
              </thead>
              <tbody>
                ${trussMemberRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Truss Sign Conventions Reference Note -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">
          <strong>${lang === 'pl' ? 'Konwencja znaków w analizie kratownic:' : 'Truss Sign Conventions:'}</strong><br>
          &bull; <strong>${lang === 'pl' ? 'N > 0 (Dodatnia siła osiowa):' : 'N > 0 (Positive axial force):'}</strong> ${lang === 'pl' ? 'Rozciąganie pręta (Tension).' : 'Tension member.'}<br>
          &bull; <strong>${lang === 'pl' ? 'N < 0 (Ujemna siła osiowa):' : 'N < 0 (Negative axial force):'}</strong> ${lang === 'pl' ? 'Ściskanie pręta (Compression).' : 'Compression member.'}<br>
          &bull; <strong>${lang === 'pl' ? 'N = 0 (Pręt zerowy):' : 'N = 0 (Zero-force member):'}</strong> ${lang === 'pl' ? 'Pręt nie przenosi sił przy danym schemacie obciążenia.' : 'Member carries no force under the current load arrangement.'}<br>
          &bull; <strong>${lang === 'pl' ? 'Siły tnące i momenty:' : 'Shear & Bending:'}</strong> T &equiv; 0, M &equiv; 0 ${lang === 'pl' ? 'we wszystkich prętach z założenia idealnych węzłów przegubowych.' : 'everywhere due to idealized frictionless pinned joints.'}
        </div>

      </div>
    `;
  }

  return `
    <div class="space-y-6 text-slate-800">
      
      <!-- Section 1: System & Determinacy -->
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 class="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-3">
          ${t.section1Title}
        </h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span class="text-slate-500 block">${t.nodesCountLabel}</span>
            <span class="font-bold text-sm font-mono">${nodes.length}</span>
          </div>
          <div>
            <span class="text-slate-500 block">${t.membersCountLabel}</span>
            <span class="font-bold text-sm font-mono">${elements.length}</span>
          </div>
          <div>
            <span class="text-slate-500 block">${t.supportsCountLabel}</span>
            <span class="font-bold text-sm font-mono">${Object.keys(reactions).length}</span>
          </div>
          <div>
            <span class="text-slate-500 block">${t.statusLabel}</span>
            <div class="mt-1">${detBadge}</div>
          </div>
        </div>
      </div>

      <!-- Section 2: Global Equilibrium & Reactions -->
      <div class="bg-white border border-slate-200 rounded-lg p-4">
        <h4 class="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-3">
          ${t.section2Title}
        </h4>
        <div class="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded border border-slate-200 mb-3">
          <div><strong>${t.sumFxEq}</strong> &Delta;Fx = ${formatNum(eq.netFx, 4)} kN ${Math.abs(eq.netFx) < 1e-2 ? '✓' : '✗'}</div>
          <div><strong>${t.sumFzEq}</strong> &Delta;Fz = ${formatNum(eq.netFz, 4)} kN ${Math.abs(eq.netFz) < 1e-2 ? '✓' : '✗'}</div>
          <div><strong>${t.sumMEq}</strong> &Delta;M = ${formatNum(eq.netM, 4)} kNm ${Math.abs(eq.netM) < 1e-2 ? '✓' : '✗'}</div>
        </div>

        <div class="overflow-x-auto">
          <table class="poly-table w-full">
            <thead>
              <tr>
                <th>${t.supportNodeCol}</th>
                <th>${t.locCol}</th>
                <th>${t.rxCol}</th>
                <th>${t.rzCol}</th>
                <th>${t.mrCol}</th>
              </tr>
            </thead>
            <tbody>
              ${reactionsRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: Member End Forces -->
      <div class="bg-white border border-slate-200 rounded-lg p-4">
        <h4 class="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 mb-3">
          ${t.section3Title}
        </h4>
        <div class="overflow-x-auto">
          <table class="poly-table w-full">
            <thead>
              <tr>
                <th>${t.memberCol}</th>
                <th>Span (i &rarr; j)</th>
                <th>${t.nodeIForcesCol}</th>
                <th>${t.nodeJForcesCol}</th>
                <th>Extrema [min, max]</th>
              </tr>
            </thead>
            <tbody>
              ${memberRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Sign Conventions Reference Note -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">
        <strong>Sign Conventions in Frame Analysis:</strong><br>
        &bull; <strong>Normal Force N:</strong> Inside the frame = Negative (Compression), Outside = Positive (Tension).<br>
        &bull; <strong>Shear Force T:</strong> Inside the frame = Negative, Outside = Positive.<br>
        &bull; <strong>Bending Moment M:</strong> Plotted directly on the <em>tension fiber side</em> (włókna rozciągane).
      </div>

    </div>
  `;
}
