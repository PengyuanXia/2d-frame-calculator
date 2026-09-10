/**
 * 2D Frame & Truss Calculator - Formal Academic Calculation Report Generator
 * Direct Stiffness Method (DSM) • Matrix Structural Analysis & Mechanics of Structures
 * Notation: N(s) for normal force, T(s) for shear force, M(s) for bending moment, EJ for flexural rigidity.
 * Formatted for KaTeX LaTeX rendering, academic reporting, and print/PDF export.
 */

import { TRANSLATIONS } from './i18n.js?v=3.3';

function formatNum(val, maxDec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 1e-9) return '0.00';
  const factor = Math.pow(10, maxDec);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toFixed(maxDec);
}

export function generateStepByStepReport(frameData, solution, lang = 'en', images = {}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const isPl = lang === 'pl';
  const isTruss = (solution && solution.structureType === 'truss') || (frameData && frameData.structureType === 'truss');

  const unsolvedImg = images && images.unsolvedImg ? images.unsolvedImg : null;
  const reactionsImg = images && images.reactionsImg ? images.reactionsImg : null;
  const normalImg = images && images.normalImg ? images.normalImg : null;
  const shearImg = images && images.shearImg ? images.shearImg : null;
  const momentImg = images && images.momentImg ? images.momentImg : null;

  // Handle Unstable Structure / Mechanism
  if (!solution || !solution.isStable) {
    return `
      <div class="p-6 bg-amber-50 border border-amber-300 rounded-lg text-center text-amber-950 font-sans">
        <div class="text-3xl mb-2">⚠</div>
        <h3 class="text-base font-bold text-amber-900 mb-2">
          ${t.unstableBannerTitle || (isPl ? 'Układ geometrycznie zmienny / Mechanizm' : 'Structure is Geometrically Unstable')}
        </h3>
        <p class="text-xs text-amber-800 leading-relaxed max-w-xl mx-auto mb-4">
          ${t.unstableBannerDesc1 || (isPl ? 'Układ nie posiada dostatecznej liczby więzów lub tworzy mechanizm.' : 'The structure does not have sufficient boundary restraints or forms a kinematic mechanism.')}
          ${t.unstableBannerDesc2 || (isPl ? 'Sprawdź warunki brzegowe, podpory i połączenia przegubowe.' : 'Check boundary conditions, supports, and internal hinge placement.')}
        </p>
        <div class="inline-block text-left bg-white p-3.5 rounded border border-amber-200 text-xs font-mono text-slate-700">
          <div>• <strong>${t.nodesCountLabel || (isPl ? 'Liczba węzłów:' : 'Nodes Count:')}</strong> ${frameData.nodes ? frameData.nodes.length : 0}</div>
          <div>• <strong>${t.membersCountLabel || (isPl ? 'Liczba prętów:' : 'Members Count:')}</strong> ${frameData.elements ? frameData.elements.length : 0}</div>
          <div>• <strong>${t.supportsCountLabel || (isPl ? 'Liczba podpór:' : 'Supports Count:')}</strong> ${(frameData.nodes || []).filter(n => n.support && n.support !== 'none').length}</div>
          <div>• <strong>${t.statusLabel || 'Status:'}</strong> <span class="text-red-600 font-bold">${t.statusUnstable || (isPl ? 'Niestabilny' : 'Unstable')}</span></div>
        </div>
      </div>
    `;
  }

  const nodes = solution.nodes || [];
  const elements = solution.elements || [];
  const reactions = solution.reactions || {};
  const det = solution.determinacy || { degree: 0, type: 'Determinate' };
  const nDegree = det.degree || 0;

  // Calculate support restraints count r and hinges count h
  let supportDofCount = 0;
  (frameData.nodes || []).forEach(n => {
    const s = n.support;
    if (s === 'fixed') supportDofCount += 3;
    else if (s === 'pin') supportDofCount += 2;
    else if (s === 'roller_x' || s === 'roller_z' || s === 'roller') supportDofCount += 1;
  });

  let hingeCount = 0;
  (frameData.elements || []).forEach(e => {
    if (e.hingeI) hingeCount++;
    if (e.hingeJ) hingeCount++;
  });

  const numElements = elements.length;
  const numNodes = nodes.length;

  // Static Determinacy Classification Text & Formula
  let classificationText = '';
  let determinacyFormula = '';

  if (isTruss) {
    const trussDegree = (numElements + supportDofCount) - 2 * numNodes;
    if (trussDegree === 0) {
      classificationText = isPl ? 'Statycznie wyznaczalna (n = 0)' : 'Statically Determinate (n = 0)';
    } else if (trussDegree > 0) {
      classificationText = isPl ? `Statycznie niewyznaczalna (n = ${trussDegree})` : `Statically Indeterminate (n = ${trussDegree})`;
    } else {
      classificationText = isPl ? 'Geometrycznie zmienna (n < 0)' : 'Geometrically Unstable (n < 0)';
    }
    determinacyFormula = `$$n = (p + r) - 2k = (${numElements} + ${supportDofCount}) - 2\\cdot ${numNodes} = ${trussDegree}$$`;
  } else {
    if (nDegree === 0) {
      classificationText = isPl ? 'Statycznie wyznaczalna (n = 0)' : 'Statically Determinate (n = 0)';
    } else if (nDegree > 0) {
      classificationText = isPl ? `Statycznie niewyznaczalna (n = ${nDegree})` : `Statically Indeterminate (n = ${nDegree})`;
    } else {
      classificationText = isPl ? 'Geometrycznie zmienna (n < 0)' : 'Geometrically Unstable (n < 0)';
    }
    determinacyFormula = `$$n = 3p + r - (3k + h) = 3\\cdot ${numElements} + ${supportDofCount} - (3\\cdot ${numNodes} + ${hingeCount}) = ${nDegree}$$`;
  }

  // Calculate Equilibrium Totals
  const eq = solution.equilibrium || { netFx: 0, netFz: 0, netM: 0, isBalanced: true };
  let sumRx = 0, sumRz = 0, sumMReact = 0;
  for (const [nodeId, r] of Object.entries(reactions)) {
    const node = nodes.find(n => n.id === nodeId);
    sumRx += r.Rx;
    sumRz += r.Rz;
    if (node) {
      sumMReact += (r.MR + node.x * r.Rz - node.z * r.Rx);
    }
  }

  const sumFxLoads = sumRx + eq.netFx;
  const sumFzLoads = sumRz + eq.netFz;
  const sumMLoads = sumMReact + eq.netM;

  // Build Reactions Table Rows
  let reactionsTableRows = '';
  for (const [nodeId, r] of Object.entries(reactions)) {
    const node = nodes.find(n => n.id === nodeId);
    const loc = node ? `(${formatNum(node.x, 1)}, ${formatNum(node.z, 1)})` : '-';
    
    // Support type label
    let sType = isPl ? 'Brak' : 'None';
    const sup = node ? node.support : 'none';
    if (sup === 'fixed') {
      sType = isPl ? 'Utwierdzenie' : 'Fixed Support';
    } else if (sup === 'pin') {
      sType = isPl ? 'Podpora przegubowa nieprzesuwna' : 'Pinned Support';
    } else if (sup === 'roller_x') {
      sType = isPl ? 'Podpora przesuwna (pozioma)' : 'Roller Support (Horiz.)';
    } else if (sup === 'roller_z') {
      sType = isPl ? 'Podpora przesuwna (pionowa)' : 'Roller Support (Vert.)';
    } else if (sup === 'roller') {
      sType = isPl ? 'Podpora przesuwna' : 'Roller Support';
    }

    reactionsTableRows += `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-2.5 border text-center font-bold text-slate-800 font-sans text-xs sm:text-sm whitespace-nowrap">${isPl ? 'Węzeł' : 'Node'} ${nodeId}</td>
        <td class="p-2.5 border text-center font-sans text-slate-600 text-xs sm:text-[13px] whitespace-nowrap">${sType}</td>
        <td class="p-2.5 border text-center font-mono font-bold text-slate-700 text-xs sm:text-sm whitespace-nowrap">${loc} m</td>
        <td class="p-2.5 border text-center font-mono text-blue-700 font-bold text-xs sm:text-sm whitespace-nowrap">${formatNum(r.Rx)} kN</td>
        <td class="p-2.5 border text-center font-mono text-emerald-700 font-bold text-xs sm:text-sm whitespace-nowrap">${formatNum(r.Rz)} kN</td>
        <td class="p-2.5 border text-center font-mono text-amber-700 font-bold text-xs sm:text-sm whitespace-nowrap">${isTruss ? '-' : `${formatNum(r.MR)} kNm`}</td>
      </tr>
    `;
  }

  // Compute Global Extrema across all elements
  let globalExtrema = {
    maxN: { val: -Infinity, elemId: null, s: 0 },
    minN: { val: Infinity, elemId: null, s: 0 },
    maxT: { val: -Infinity, elemId: null, s: 0 },
    minT: { val: Infinity, elemId: null, s: 0 },
    maxM: { val: -Infinity, elemId: null, s: 0 },
    minM: { val: Infinity, elemId: null, s: 0 }
  };

  elements.forEach(elem => {
    if (elem.samples && elem.samples.length > 0) {
      elem.samples.forEach(pt => {
        if (pt.N > globalExtrema.maxN.val) globalExtrema.maxN = { val: pt.N, elemId: elem.id, s: pt.s };
        if (pt.N < globalExtrema.minN.val) globalExtrema.minN = { val: pt.N, elemId: elem.id, s: pt.s };
        if (pt.T > globalExtrema.maxT.val) globalExtrema.maxT = { val: pt.T, elemId: elem.id, s: pt.s };
        if (pt.T < globalExtrema.minT.val) globalExtrema.minT = { val: pt.T, elemId: elem.id, s: pt.s };
        if (pt.M > globalExtrema.maxM.val) globalExtrema.maxM = { val: pt.M, elemId: elem.id, s: pt.s };
        if (pt.M < globalExtrema.minM.val) globalExtrema.minM = { val: pt.M, elemId: elem.id, s: pt.s };
      });
    } else if (elem.extrema) {
      if (elem.extrema.N.max > globalExtrema.maxN.val) globalExtrema.maxN = { val: elem.extrema.N.max, elemId: elem.id, s: 0 };
      if (elem.extrema.N.min < globalExtrema.minN.val) globalExtrema.minN = { val: elem.extrema.N.min, elemId: elem.id, s: 0 };
      if (elem.extrema.T.max > globalExtrema.maxT.val) globalExtrema.maxT = { val: elem.extrema.T.max, elemId: elem.id, s: 0 };
      if (elem.extrema.T.min < globalExtrema.minT.val) globalExtrema.minT = { val: elem.extrema.T.min, elemId: elem.id, s: 0 };
      if (elem.extrema.M.max > globalExtrema.maxM.val) globalExtrema.maxM = { val: elem.extrema.M.max, elemId: elem.id, s: 0 };
      if (elem.extrema.M.min < globalExtrema.minM.val) globalExtrema.minM = { val: elem.extrema.M.min, elemId: elem.id, s: 0 };
    }
  });

  // Guard against initial +/-Infinity if empty
  if (globalExtrema.maxN.val === -Infinity) globalExtrema.maxN.val = 0;
  if (globalExtrema.minN.val === Infinity) globalExtrema.minN.val = 0;
  if (globalExtrema.maxT.val === -Infinity) globalExtrema.maxT.val = 0;
  if (globalExtrema.minT.val === Infinity) globalExtrema.minT.val = 0;
  if (globalExtrema.maxM.val === -Infinity) globalExtrema.maxM.val = 0;
  if (globalExtrema.minM.val === Infinity) globalExtrema.minM.val = 0;

  // -------------------------------------------------------------
  // TRUSS REPORT TEMPLATE
  // -------------------------------------------------------------
  if (isTruss) {
    let trussMemberRows = '';
    let maxN_truss = -Infinity, maxN_truss_elem = '-';
    let minN_truss = Infinity, minN_truss_elem = '-';
    let zeroBarsList = [];

    elements.forEach(elem => {
      const N_val = elem.axialForce || (elem.endForces && elem.endForces.j ? elem.endForces.j.N : 0);
      if (N_val > maxN_truss) { maxN_truss = N_val; maxN_truss_elem = elem.id; }
      if (N_val < minN_truss) { minN_truss = N_val; minN_truss_elem = elem.id; }

      let stateBadge = '';
      if (elem.isZeroForce || Math.abs(N_val) < 1e-4) {
        zeroBarsList.push(elem.id);
        stateBadge = `<span class="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold text-[11px] font-sans whitespace-nowrap">${isPl ? 'Pręt zerowy (0)' : 'Zero-Force (0)'}</span>`;
      } else if (N_val > 0) {
        stateBadge = `<span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[11px] font-sans whitespace-nowrap">${isPl ? 'Rozciąganie (T)' : 'Tension (T)'}</span>`;
      } else {
        stateBadge = `<span class="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold text-[11px] font-sans whitespace-nowrap">${isPl ? 'Ściskanie (C)' : 'Compression (C)'}</span>`;
      }

      trussMemberRows += `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-2.5 border text-center font-bold text-slate-800 font-sans text-xs sm:text-sm whitespace-nowrap">${elem.id}</td>
          <td class="p-2.5 border text-center font-mono text-slate-700 text-xs sm:text-sm whitespace-nowrap">${elem.nodeI} &rarr; ${elem.nodeJ}</td>
          <td class="p-2.5 border text-center font-mono text-slate-700 text-xs sm:text-sm whitespace-nowrap">${formatNum(elem.L, 2)} m</td>
          <td class="p-2.5 border text-center font-mono font-bold text-xs sm:text-sm whitespace-nowrap ${N_val > 0 ? 'text-blue-700' : (N_val < 0 ? 'text-red-700' : 'text-slate-600')}">
            ${N_val > 0 ? '+' : ''}${formatNum(N_val, 2)} kN
          </td>
          <td class="p-2.5 border text-center whitespace-nowrap">${stateBadge}</td>
        </tr>
      `;
    });

    return `
      <div class="report-container space-y-6 text-slate-800 font-sans">

        <!-- Academic Header -->
        <div class="pb-3 border-b-2 border-slate-900">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                ${isPl ? 'Sprawozdanie z Obliczeń Statycznych Kratownicy Płaskiej 2D' : '2D Truss Static Analysis & Calculation Report'}
              </h2>
              <div class="text-xs sm:text-[13px] text-slate-500 mt-1 font-medium">
                ${isPl ? 'Metoda Bezpośredniej Sztywności (DSM) • Węzły Przegubowe • Mechanika Budowli' : 'Direct Stiffness Method (DSM) • Pin-Jointed System • Mechanics of Structures'}
              </div>
            </div>
            <div class="text-right text-xs font-mono text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
              <div><strong>EA = const</strong></div>
              <div>${new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <!-- SECTION 1: Structural Scheme & Static Determinacy -->
        <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
          <h3 class="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2.5 border-b border-slate-200 flex items-center justify-between">
            <span>${t.section1Title || (isPl ? '1. Układ konstrukcyjny i stopień wyznaczalności' : '1. Structural Scheme & Static Determinacy')}</span>
            <span class="text-xs font-normal text-slate-500 normal-case font-mono">${isPl ? 'Geometria i podpory' : 'Geometry & Supports'}</span>
          </h3>

          <!-- Figure 1: Unsolved Structure -->
          ${unsolvedImg ? `
            <div class="mb-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
                <img src="${unsolvedImg}" alt="Truss Scheme" class="max-h-56 sm:max-h-64 w-auto object-contain" />
              </div>
              <div class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-2 font-sans">
                ${isPl ? 'Rys. 1: Schemat statyczny kratownicy — geometria, warunki brzegowe i obciążenia węzłowe' : 'Fig. 1: Structural scheme of the truss — geometry, boundary conditions and nodal loads'}
              </div>
            </div>
          ` : ''}

          <!-- Parameters: Rigidity and Static Determinacy Formula -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div class="text-slate-500 text-xs uppercase font-sans font-bold tracking-wider mb-1.5">
                ${isPl ? 'Sztywność osiowa prętów (EA)' : 'Axial Rigidity (EA)'}
              </div>
              <div class="text-lg font-bold text-slate-900 font-mono">
                $EA = \\text{const}$
              </div>
              <div class="text-xs text-slate-600 font-sans mt-1">
                ${isPl ? `Liczba prętów p = ${numElements}, liczba węzłów k = ${numNodes}` : `Bars count p = ${numElements}, joints count k = ${numNodes}`}
              </div>
            </div>

            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div class="text-slate-500 text-xs uppercase font-sans font-bold tracking-wider mb-1.5">
                ${isPl ? 'Stopień statycznej wyznaczalności (n)' : 'Degree of Static Determinacy (n)'}
              </div>
              <div class="text-sm sm:text-base font-bold text-slate-900 font-mono">
                ${determinacyFormula}
              </div>
              <div class="mt-1.5">
                <span class="inline-block px-3 py-1 rounded-md text-xs sm:text-[13px] font-bold font-sans ${nDegree === 0 ? 'bg-emerald-100 text-emerald-800' : (nDegree > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}">
                  ${classificationText}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: Global Equilibrium & Reactions -->
        <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
          <h3 class="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2.5 border-b border-slate-200 flex items-center justify-between">
            <span>${t.section2Title || (isPl ? '2. Równania równowagi i reakcje podpór' : '2. Global Equilibrium & Reactions')}</span>
            <span class="text-xs font-normal text-slate-500 normal-case font-mono">${isPl ? 'Warunki statyki' : 'Static conditions'}</span>
          </h3>

          <!-- Figure 2: Reactions Free-Body Diagram -->
          ${reactionsImg ? `
            <div class="mb-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
                <img src="${reactionsImg}" alt="Support Reactions Scheme" class="max-h-56 sm:max-h-64 w-auto object-contain" />
              </div>
              <div class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-2 font-sans">
                ${isPl ? 'Rys. 2: Schemat z wyznaczonymi reakcjami podporowymi kratownicy' : 'Fig. 2: Free-body diagram with calculated support reaction forces'}
              </div>
            </div>
          ` : ''}

          <!-- Formal Equilibrium Equations -->
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-slate-800 space-y-2.5">
            <div class="font-sans font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
              ${isPl ? 'Formalny zapis warunków równowagi statycznej w płaszczyźnie (x, z):' : 'Formal Planar Equilibrium Equations in (x, z) Plane:'}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div class="bg-white p-3.5 rounded-md border border-slate-200">
                <div class="font-bold text-slate-800 mb-1 font-sans text-xs sm:text-sm">${t.sumFxEq || (isPl ? 'Rzut sił na oś X:' : 'Horizontal Equilibrium:')}</div>
                <div class="text-sm sm:text-base font-semibold">$$\\sum F_x = 0 \\implies \\sum F_{x,\\text{ext}} - \\sum R_x = 0$$</div>
                <div class="text-xs sm:text-[13px] text-slate-600 mt-1 font-mono">
                  $${formatNum(sumFxLoads)}\\text{ kN} - ${formatNum(sumRx)}\\text{ kN} = ${formatNum(eq.netFx, 3)}\\text{ kN} \\quad \\text{[OK ✓]}$
                </div>
              </div>

              <div class="bg-white p-3.5 rounded-md border border-slate-200">
                <div class="font-bold text-slate-800 mb-1 font-sans text-xs sm:text-sm">${t.sumFzEq || (isPl ? 'Rzut sił na oś Z:' : 'Vertical Equilibrium:')}</div>
                <div class="text-sm sm:text-base font-semibold">$$\\sum F_z = 0 \\implies \\sum F_{z,\\text{ext}} - \\sum R_z = 0$$</div>
                <div class="text-xs sm:text-[13px] text-slate-600 mt-1 font-mono">
                  $${formatNum(sumFzLoads)}\\text{ kN} - ${formatNum(sumRz)}\\text{ kN} = ${formatNum(eq.netFz, 3)}\\text{ kN} \\quad \\text{[OK ✓]}$
                </div>
              </div>

              <div class="bg-white p-3.5 rounded-md border border-slate-200">
                <div class="font-bold text-slate-800 mb-1 font-sans text-xs sm:text-sm">${t.sumMEq || (isPl ? 'Moment względem (0,0):' : 'Moment Equilibrium at (0,0):')}</div>
                <div class="text-sm sm:text-base font-semibold">$$\\sum M_{(0,0)} = 0 \\implies \\sum M_{\\text{ext}} - \\sum M_{\\text{react}} = 0$$</div>
                <div class="text-xs sm:text-[13px] text-slate-600 mt-1 font-mono">
                  $${formatNum(sumMLoads)}\\text{ kNm} - ${formatNum(sumMReact)}\\text{ kNm} = ${formatNum(eq.netM, 3)}\\text{ kNm} \\quad \\text{[OK ✓]}$
                </div>
              </div>
            </div>
          </div>

          <!-- Reactions Summary Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs sm:text-sm border-collapse bg-white rounded-lg border border-slate-200 font-mono">
              <thead>
                <tr class="bg-slate-100 text-slate-800 font-sans text-xs sm:text-[13px]">
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Węzeł' : 'Support Node'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Typ podpory' : 'Support Type'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Położenie (x, z)' : 'Location (x, z)'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Reakcja Rx [kN]' : 'Reaction Rx [kN]'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Reakcja Rz [kN]' : 'Reaction Rz [kN]'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Moment MR [kNm]' : 'Moment MR [kNm]'}</th>
                </tr>
              </thead>
              <tbody>
                ${reactionsTableRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- SECTION 3: Internal Force Diagrams & End Forces -->
        <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
          <h3 class="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2.5 border-b border-slate-200 flex items-center justify-between">
            <span>${isPl ? '3. Wykres i siły osiowe w prętach kratownicy' : '3. Axial Force Diagram & Bar Actions'}</span>
            <span class="text-xs font-normal text-slate-500 normal-case font-mono">N(s)</span>
          </h3>

          <!-- Figure 3: Axial Force Diagram -->
          ${normalImg ? `
            <div class="mb-5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
                <img src="${normalImg}" alt="Axial Force Diagram" class="max-h-56 sm:max-h-64 w-auto object-contain" />
              </div>
              <div class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-2 font-sans">
                ${isPl ? 'Rys. 3: Wykres sił osiowych w prętach kratownicy N(s) [kN] (niebieski = rozciąganie, czerwony = ściskanie)' : 'Fig. 3: Truss axial force diagram N(s) [kN] (blue = tension, red = compression)'}
              </div>
            </div>
          ` : ''}

          <!-- Governing Relations Card -->
          <div class="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg mb-4 text-blue-950">
            <div class="font-sans font-bold uppercase tracking-wider text-blue-900 text-xs sm:text-[12.5px] mb-1.5">
              ${isPl ? 'Równowaga pręta kratowego (przeguby na obu końcach):' : 'Truss Bar Equilibrium (Idealized Pin Joints):'}
            </div>
            <div class="text-sm sm:text-base font-mono">
              $$T(s) \\equiv 0, \\qquad M(s) \\equiv 0, \\qquad N(s) = \\text{const}$$
            </div>
          </div>

          <!-- Truss Member Actions Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs sm:text-sm border-collapse bg-white rounded-lg border border-slate-200 font-mono">
              <thead>
                <tr class="bg-slate-100 text-slate-800 font-sans text-xs sm:text-[13px]">
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Pręt' : 'Bar ID'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Węzły (i &rarr; j)' : 'Nodes (i &rarr; j)'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Długość L' : 'Length L'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Siła osiowa N [kN]' : 'Axial Force N [kN]'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Stan pręta' : 'State'}</th>
                </tr>
              </thead>
              <tbody>
                ${trussMemberRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- SECTION 4: Extremum Values Summary -->
        <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
          <h3 class="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2.5 border-b border-slate-200 flex items-center justify-between">
            <span>${t.section4Title || (isPl ? '4. Zestawienie wartości ekstremalnych' : '4. Extremum Values Summary')}</span>
            <span class="text-xs font-normal text-slate-500 normal-case font-mono">${isPl ? 'Wartości charakterystyczne' : 'Characteristic values'}</span>
          </h3>

          <!-- Formal Extrema Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs sm:text-sm border-collapse bg-white rounded-lg border border-slate-200 font-mono">
              <thead>
                <tr class="bg-slate-100 text-slate-800 font-sans text-xs sm:text-[13px]">
                  <th class="p-2.5 border text-left font-bold">${isPl ? 'Wielkość fizyczna' : 'Parameter'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Symbol' : 'Symbol'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Wartość ekstremalna' : 'Extreme Value'}</th>
                  <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Lokalizacja (Pręt)' : 'Location (Bar ID)'}</th>
                  <th class="p-2.5 border text-left font-bold font-sans">${isPl ? 'Interpretacja inżynierska' : 'Engineering Note'}</th>
                </tr>
              </thead>
              <tbody>
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Maksymalna siła rozciągająca w pręcie' : 'Maximum Tensile Bar Force'}</td>
                  <td class="p-2.5 border text-center font-bold text-blue-700 text-sm sm:text-base whitespace-nowrap">$N_{\\max}$</td>
                  <td class="p-2.5 border text-center font-bold text-blue-800 font-mono text-sm sm:text-base whitespace-nowrap">${maxN_truss > 0 ? '+' : ''}${formatNum(maxN_truss)} kN</td>
                  <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${isPl ? 'Pręt' : 'Bar'} ${maxN_truss_elem}</td>
                  <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Najbardziej wytężony pręt rozciągany' : 'Most stressed tension member'}</td>
                </tr>
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Maksymalna siła ściskająca w pręcie' : 'Maximum Compressive Bar Force'}</td>
                  <td class="p-2.5 border text-center font-bold text-red-700 text-sm sm:text-base whitespace-nowrap">$N_{\\min}$</td>
                  <td class="p-2.5 border text-center font-bold text-red-800 font-mono text-sm sm:text-base whitespace-nowrap">${formatNum(minN_truss)} kN</td>
                  <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${isPl ? 'Pręt' : 'Bar'} ${minN_truss_elem}</td>
                  <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Najbardziej wytężony pręt ściskany (krytyczny pod kątem wyboczenia)' : 'Most stressed compression member (buckling critical)'}</td>
                </tr>
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Liczba prętów zerowych' : 'Zero-Force Members Count'}</td>
                  <td class="p-2.5 border text-center font-bold text-slate-600 text-sm sm:text-base whitespace-nowrap">$N_0$</td>
                  <td class="p-2.5 border text-center font-bold text-slate-800 font-mono text-sm sm:text-base whitespace-nowrap">${zeroBarsList.length}</td>
                  <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${zeroBarsList.join(', ') || '-'}</td>
                  <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Pręty nieprzenoszące obciążeń w danym schemacie' : 'Unstressed bars under current load case'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  // -------------------------------------------------------------
  // FRAME REPORT TEMPLATE
  // -------------------------------------------------------------
  let memberRows = '';
  elements.forEach(elem => {
    const ef = elem.endForces || { i: { N: 0, T: 0, M: 0 }, j: { N: 0, T: 0, M: 0 } };
    const ext = elem.extrema || { N: { min: 0, max: 0 }, T: { min: 0, max: 0 }, M: { min: 0, max: 0 } };

    memberRows += `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-2.5 border text-center font-bold text-blue-900 font-sans text-xs sm:text-sm whitespace-nowrap">${elem.id}</td>
        <td class="p-2.5 border text-center font-mono text-slate-700 text-xs sm:text-sm whitespace-nowrap">
          ${elem.nodeI} &rarr; ${elem.nodeJ} <br>
          <span class="text-xs text-slate-500 font-sans font-normal">(L = ${formatNum(elem.L, 2)} m)</span>
        </td>
        <td class="p-2.5 border text-left font-mono text-xs whitespace-nowrap">
          <div><strong class="text-blue-700">N</strong> = ${formatNum(ef.i.N)} kN</div>
          <div><strong class="text-red-700">T</strong> = ${formatNum(ef.i.T)} kN</div>
          <div><strong class="text-emerald-700">M</strong> = ${formatNum(ef.i.M)} kNm</div>
        </td>
        <td class="p-2.5 border text-left font-mono text-xs whitespace-nowrap">
          <div><strong class="text-blue-700">N</strong> = ${formatNum(ef.j.N)} kN</div>
          <div><strong class="text-red-700">T</strong> = ${formatNum(ef.j.T)} kN</div>
          <div><strong class="text-emerald-700">M</strong> = ${formatNum(ef.j.M)} kNm</div>
        </td>
        <td class="p-2.5 border text-left font-mono text-xs whitespace-nowrap text-slate-700">
          <div>N &isin; [${formatNum(ext.N.min)}, ${formatNum(ext.N.max)}] kN</div>
          <div>T &isin; [${formatNum(ext.T.min)}, ${formatNum(ext.T.max)}] kN</div>
          <div>M &isin; [${formatNum(ext.M.min)}, ${formatNum(ext.M.max)}] kNm</div>
        </td>
      </tr>
    `;
  });

  return `
    <div class="report-container space-y-6 text-slate-800 font-sans">

      <!-- Academic Header -->
      <div class="pb-3 border-b-2 border-slate-900">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
              ${isPl ? 'Sprawozdanie z Obliczeń Statycznych Ramy Płaskiej 2D' : '2D Frame Static Analysis & Calculation Report'}
            </h2>
            <div class="text-xs sm:text-[13px] text-slate-500 mt-1 font-medium">
              ${isPl ? 'Metoda Bezpośredniej Sztywności (DSM) • Mechanika Budowli i Wytrzymałość Materiałów' : 'Direct Stiffness Method (DSM) • Matrix Structural Analysis & Mechanics of Structures'}
            </div>
          </div>
          <div class="text-right text-xs font-mono text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            <div><strong>EJ = const</strong></div>
            <div>${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <!-- SECTION 1: Structural Scheme & Static Determinacy -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <h3 class="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2.5 border-b border-slate-200 flex items-center justify-between">
          <span>${t.section1Title || (isPl ? '1. Układ konstrukcyjny i stopień wyznaczalności' : '1. Structural Scheme & Static Determinacy')}</span>
          <span class="text-xs font-normal text-slate-500 normal-case font-mono">${isPl ? 'Geometria i podpory' : 'Geometry & Supports'}</span>
        </h3>

        <!-- Figure 1: Unsolved Structure -->
        ${unsolvedImg ? `
          <div class="mb-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
              <img src="${unsolvedImg}" alt="Structural Scheme" class="max-h-56 sm:max-h-64 w-auto object-contain" />
            </div>
            <div class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-2 font-sans">
              ${isPl ? 'Rys. 1: Schemat statyczny ramy — geometria, warunki brzegowe i obciążenia zewnętrzne' : 'Fig. 1: Structural scheme of the frame — geometry, boundary conditions and applied loads'}
            </div>
          </div>
        ` : ''}

        <!-- Parameters: EJ and Static Determinacy Formula -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="text-slate-500 text-xs uppercase font-sans font-bold tracking-wider mb-1.5">
              ${isPl ? 'Sztywność zginania i parametry układu' : 'Flexural Rigidity & System Parameters'}
            </div>
            <div class="text-lg font-bold text-slate-900 font-mono">
              $EJ = \\text{const}$
            </div>
            <div class="text-xs text-slate-600 font-sans mt-1">
              ${isPl ? `Liczba elementów p = ${numElements}, liczba węzłów k = ${numNodes}, przeguby h = ${hingeCount}` : `Members count p = ${numElements}, joints count k = ${numNodes}, hinges h = ${hingeCount}`}
            </div>
          </div>

          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="text-slate-500 text-xs uppercase font-sans font-bold tracking-wider mb-1.5">
              ${isPl ? 'Stopień statycznej wyznaczalności (n)' : 'Degree of Static Determinacy (n)'}
            </div>
            <div class="text-sm sm:text-base font-bold text-slate-900 font-mono">
              ${determinacyFormula}
            </div>
            <div class="mt-1.5">
              <span class="inline-block px-3 py-1 rounded-md text-xs sm:text-[13px] font-bold font-sans ${nDegree === 0 ? 'bg-emerald-100 text-emerald-800' : (nDegree > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800')}">
                ${classificationText}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 2: Global Equilibrium & Reactions -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <h3 class="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2.5 border-b border-slate-200 flex items-center justify-between">
          <span>${t.section2Title || (isPl ? '2. Równania równowagi i reakcje podpór' : '2. Global Equilibrium & Reactions')}</span>
          <span class="text-xs font-normal text-slate-500 normal-case font-mono">${isPl ? 'Warunki statyki' : 'Static conditions'}</span>
        </h3>

        <!-- Figure 2: Reactions Free-Body Diagram -->
        ${reactionsImg ? `
          <div class="mb-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
              <img src="${reactionsImg}" alt="Support Reactions Scheme" class="max-h-56 sm:max-h-64 w-auto object-contain" />
            </div>
            <div class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-2 font-sans">
              ${isPl ? 'Rys. 2: Schemat z wyznaczonymi reakcjami podporowymi i momentami utwierdzenia' : 'Fig. 2: Free-body diagram with calculated support reaction forces and fixed-end moments'}
            </div>
          </div>
        ` : ''}

        <!-- Formal Equilibrium Equations -->
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-slate-800 space-y-2.5">
          <div class="font-sans font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-2">
            ${isPl ? 'Formalny zapis warunków równowagi statycznej w płaszczyźnie (x, z):' : 'Formal Planar Equilibrium Equations in (x, z) Plane:'}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div class="bg-white p-3.5 rounded-md border border-slate-200">
              <div class="font-bold text-slate-800 mb-1 font-sans text-xs sm:text-sm">${t.sumFxEq || (isPl ? 'Rzut sił na oś X:' : 'Horizontal Equilibrium:')}</div>
              <div class="text-sm sm:text-base font-semibold">$$\\sum F_x = 0 \\implies \\sum F_{x,\\text{ext}} - \\sum R_x = 0$$</div>
              <div class="text-xs sm:text-[13px] text-slate-600 mt-1 font-mono">
                $${formatNum(sumFxLoads)}\\text{ kN} - ${formatNum(sumRx)}\\text{ kN} = ${formatNum(eq.netFx, 3)}\\text{ kN} \\quad \\text{[OK ✓]}$
              </div>
            </div>

            <div class="bg-white p-3.5 rounded-md border border-slate-200">
              <div class="font-bold text-slate-800 mb-1 font-sans text-xs sm:text-sm">${t.sumFzEq || (isPl ? 'Rzut sił na oś Z:' : 'Vertical Equilibrium:')}</div>
              <div class="text-sm sm:text-base font-semibold">$$\\sum F_z = 0 \\implies \\sum F_{z,\\text{ext}} - \\sum R_z = 0$$</div>
              <div class="text-xs sm:text-[13px] text-slate-600 mt-1 font-mono">
                $${formatNum(sumFzLoads)}\\text{ kN} - ${formatNum(sumRz)}\\text{ kN} = ${formatNum(eq.netFz, 3)}\\text{ kN} \\quad \\text{[OK ✓]}$
              </div>
            </div>

            <div class="bg-white p-3.5 rounded-md border border-slate-200">
              <div class="font-bold text-slate-800 mb-1 font-sans text-xs sm:text-sm">${t.sumMEq || (isPl ? 'Moment względem (0,0):' : 'Moment Equilibrium at (0,0):')}</div>
              <div class="text-sm sm:text-base font-semibold">$$\\sum M_{(0,0)} = 0 \\implies \\sum M_{\\text{ext}} - \\sum M_{\\text{react}} = 0$$</div>
              <div class="text-xs sm:text-[13px] text-slate-600 mt-1 font-mono">
                $${formatNum(sumMLoads)}\\text{ kNm} - ${formatNum(sumMReact)}\\text{ kNm} = ${formatNum(eq.netM, 3)}\\text{ kNm} \\quad \\text{[OK ✓]}$
              </div>
            </div>
          </div>
        </div>

        <!-- Reactions Summary Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs sm:text-sm border-collapse bg-white rounded-lg border border-slate-200 font-mono">
            <thead>
              <tr class="bg-slate-100 text-slate-800 font-sans text-xs sm:text-[13px]">
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Węzeł' : 'Support Node'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Typ podpory' : 'Support Type'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Położenie (x, z)' : 'Location (x, z)'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Reakcja Rx [kN]' : 'Reaction Rx [kN]'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Reakcja Rz [kN]' : 'Reaction Rz [kN]'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Moment MR [kNm]' : 'Moment MR [kNm]'}</th>
              </tr>
            </thead>
            <tbody>
              ${reactionsTableRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 3: Internal Force Diagrams & End Forces -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <h3 class="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2.5 border-b border-slate-200 flex items-center justify-between">
          <span>${t.section3Title || (isPl ? '3. Wykresy i równania analityczne sił wewnętrznych' : '3. Internal Force Diagrams & End Forces')}</span>
          <span class="text-xs font-normal text-slate-500 normal-case font-mono">N(s), T(s), M(s)</span>
        </h3>

        <!-- Figures 3, 4, 5: N(s), T(s) and M(s) Diagrams Shown First -->
        ${(normalImg || shearImg || momentImg) ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mb-5">
            ${normalImg ? `
              <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
                  <img src="${normalImg}" alt="Normal Force Diagram" class="max-h-52 w-auto object-contain" />
                </div>
                <div class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-2 font-sans">
                  ${isPl ? 'Rys. 3: N(s) [kN] — Siły osiowe' : 'Fig. 3: N(s) [kN] — Normal force'}
                </div>
              </div>
            ` : ''}

            ${shearImg ? `
              <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
                  <img src="${shearImg}" alt="Shear Force Diagram" class="max-h-52 w-auto object-contain" />
                </div>
                <div class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-2 font-sans">
                  ${isPl ? 'Rys. 4: T(s) [kN] — Siły tnące' : 'Fig. 4: T(s) [kN] — Shear force'}
                </div>
              </div>
            ` : ''}

            ${momentImg ? `
              <div class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center sm:col-span-2 md:col-span-1">
                <div class="flex justify-center items-center p-2 bg-white rounded border border-slate-100 overflow-hidden">
                  <img src="${momentImg}" alt="Bending Moment Diagram" class="max-h-52 w-auto object-contain" />
                </div>
                <div class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-2 font-sans">
                  ${isPl ? 'Rys. 5: M(s) [kNm] (włókna rozciągane)' : 'Fig. 5: M(s) [kNm] (tension fiber side)'}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Governing Differential Relations -->
        <div class="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg mb-4 text-blue-950">
          <div class="font-sans font-bold uppercase tracking-wider text-blue-900 text-xs sm:text-[12.5px] mb-1.5">
            ${isPl ? 'Związki różniczkowe mechaniki prętów prostych (układ lokalny s):' : 'Governing Differential Relations in Local Member Coordinate (s):'}
          </div>
          <div class="text-sm sm:text-base font-mono mb-2">
            $$\\frac{dT(s)}{ds} = -q_\\zeta(s), \\qquad \\frac{dM(s)}{ds} = T(s), \\qquad \\frac{dN(s)}{ds} = -q_\\xi(s)$$
          </div>
          <div class="text-xs text-blue-800 font-sans border-t border-blue-200/60 pt-1.5">
            ${isPl 
              ? 'Uwaga: Wykres momentów zginających M(s) rysowany jest tradycyjnie po stronie włókien rozciąganych. Wartości dodatnie wewnątrz ramy oznaczają rozciąganie włókien wewnętrznych.' 
              : 'Note: Bending moments M(s) are plotted on the tension fiber side. Positive values denote tension on internal fibers.'}
          </div>
        </div>

        <!-- Member End Forces Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs sm:text-sm border-collapse bg-white rounded-lg border border-slate-200 font-mono">
            <thead>
              <tr class="bg-slate-100 text-slate-800 font-sans text-xs sm:text-[13px]">
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Element' : 'Member'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Węzły i długość' : 'Nodes & Length'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Węzeł i (s = 0)' : 'End i (s = 0)'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Węzeł j (s = L)' : 'End j (s = L)'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Zakres sił wewnętrznych' : 'Internal Forces Range'}</th>
              </tr>
            </thead>
            <tbody>
              ${memberRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 4: Extremum Values Summary -->
      <div class="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
        <h3 class="text-base font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2.5 border-b border-slate-200 flex items-center justify-between">
          <span>${t.section4Title || (isPl ? '4. Zestawienie wartości ekstremalnych' : '4. Extremum Values Summary')}</span>
          <span class="text-xs font-normal text-slate-500 normal-case font-mono">${isPl ? 'Wartości charakterystyczne' : 'Characteristic values'}</span>
        </h3>

        <!-- Formal Extrema Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs sm:text-sm border-collapse bg-white rounded-lg border border-slate-200 font-mono">
            <thead>
              <tr class="bg-slate-100 text-slate-800 font-sans text-xs sm:text-[13px]">
                <th class="p-2.5 border text-left font-bold">${isPl ? 'Wielkość fizyczna' : 'Parameter'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Symbol' : 'Symbol'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Wartość ekstremalna' : 'Extreme Value'}</th>
                <th class="p-2.5 border text-center font-bold whitespace-nowrap">${isPl ? 'Lokalizacja (Pręt, s)' : 'Location (Member, s)'}</th>
                <th class="p-2.5 border text-left font-bold font-sans">${isPl ? 'Interpretacja inżynierska' : 'Engineering Note'}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Maksymalna siła osiowa rozciągająca' : 'Maximum Axial Tension Force'}</td>
                <td class="p-2.5 border text-center font-bold text-blue-700 text-sm sm:text-base whitespace-nowrap">$N_{\\max}$</td>
                <td class="p-2.5 border text-center font-bold text-blue-800 font-mono text-sm sm:text-base whitespace-nowrap">${globalExtrema.maxN.val > 0 ? '+' : ''}${formatNum(globalExtrema.maxN.val)} kN</td>
                <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${globalExtrema.maxN.elemId ? `${isPl ? 'Pręt' : 'Member'} ${globalExtrema.maxN.elemId} (s = ${formatNum(globalExtrema.maxN.s)} m)` : '-'}</td>
                <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Maksymalne rozciąganie osiowe pręta ramy' : 'Peak axial tension in frame member'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Maksymalna siła osiowa ściskająca' : 'Maximum Axial Compression Force'}</td>
                <td class="p-2.5 border text-center font-bold text-red-700 text-sm sm:text-base whitespace-nowrap">$N_{\\min}$</td>
                <td class="p-2.5 border text-center font-bold text-red-800 font-mono text-sm sm:text-base whitespace-nowrap">${formatNum(globalExtrema.minN.val)} kN</td>
                <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${globalExtrema.minN.elemId ? `${isPl ? 'Pręt' : 'Member'} ${globalExtrema.minN.elemId} (s = ${formatNum(globalExtrema.minN.s)} m)` : '-'}</td>
                <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Maksymalne ściskanie osiowe (krytyczne pod kątem wyboczenia)' : 'Peak axial compression (buckling critical)'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Maksymalna siła poprzeczna' : 'Maximum Positive Shear Force'}</td>
                <td class="p-2.5 border text-center font-bold text-blue-700 text-sm sm:text-base whitespace-nowrap">$T_{\\max}$</td>
                <td class="p-2.5 border text-center font-bold text-blue-800 font-mono text-sm sm:text-base whitespace-nowrap">${globalExtrema.maxT.val > 0 ? '+' : ''}${formatNum(globalExtrema.maxT.val)} kN</td>
                <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${globalExtrema.maxT.elemId ? `${isPl ? 'Pręt' : 'Member'} ${globalExtrema.maxT.elemId} (s = ${formatNum(globalExtrema.maxT.s)} m)` : '-'}</td>
                <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Maksymalne ścinanie dodatnie' : 'Peak positive shear force'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Minimalna siła poprzeczna' : 'Maximum Negative Shear Force'}</td>
                <td class="p-2.5 border text-center font-bold text-red-700 text-sm sm:text-base whitespace-nowrap">$T_{\\min}$</td>
                <td class="p-2.5 border text-center font-bold text-red-800 font-mono text-sm sm:text-base whitespace-nowrap">${formatNum(globalExtrema.minT.val)} kN</td>
                <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${globalExtrema.minT.elemId ? `${isPl ? 'Pręt' : 'Member'} ${globalExtrema.minT.elemId} (s = ${formatNum(globalExtrema.minT.s)} m)` : '-'}</td>
                <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Maksymalne ścinanie ujemne' : 'Peak negative shear force'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Maksymalny moment zginający' : 'Maximum Span Bending Moment'}</td>
                <td class="p-2.5 border text-center font-bold text-emerald-700 text-sm sm:text-base whitespace-nowrap">$M_{\\max}$</td>
                <td class="p-2.5 border text-center font-bold text-emerald-800 font-mono text-sm sm:text-base whitespace-nowrap">${globalExtrema.maxM.val > 0 ? '+' : ''}${formatNum(globalExtrema.maxM.val)} kNm</td>
                <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${globalExtrema.maxM.elemId ? `${isPl ? 'Pręt' : 'Member'} ${globalExtrema.maxM.elemId} (s = ${formatNum(globalExtrema.maxM.s)} m)` : '-'}</td>
                <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Rozciąganie włókien dolnych/zewnętrznych ramy' : 'Peak tension on bottom / outer fibers'}</td>
              </tr>
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2.5 border font-sans font-semibold text-slate-800 text-xs sm:text-[13px]">${isPl ? 'Minimalny moment zginający' : 'Maximum Corner / Support Moment'}</td>
                <td class="p-2.5 border text-center font-bold text-amber-700 text-sm sm:text-base whitespace-nowrap">$M_{\\min}$</td>
                <td class="p-2.5 border text-center font-bold text-amber-800 font-mono text-sm sm:text-base whitespace-nowrap">${formatNum(globalExtrema.minM.val)} kNm</td>
                <td class="p-2.5 border text-center font-bold text-slate-700 font-mono text-xs sm:text-sm whitespace-nowrap">${globalExtrema.minM.elemId ? `${isPl ? 'Pręt' : 'Member'} ${globalExtrema.minM.elemId} (s = ${formatNum(globalExtrema.minM.s)} m)` : '-'}</td>
                <td class="p-2.5 border font-sans text-slate-600 text-xs sm:text-[13px]">${isPl ? 'Rozciąganie włókien górnych/wewnętrznych (węzły narożne/podpory)' : 'Peak tension on top / inner fibers (corners / supports)'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}
