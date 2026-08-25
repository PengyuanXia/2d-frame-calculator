/**
 * 2D Frame Calculator - Direct Stiffness Method Solver
 * Exact matrix analysis for 2D structural frames with member hinges and distributed loads.
 * Simplified for Bachelor level: EJ = 1 (default), EA = 10000 (hidden rigid axial behavior).
 * Coordinate System: x to the right (->), z to the down (v).
 */

import { DEFAULT_EA, DEFAULT_EJ } from './constants.js';

export class FrameSolver {
  constructor(frameData) {
    this.nodes = JSON.parse(JSON.stringify(frameData.nodes || []));
    this.elements = JSON.parse(JSON.stringify(frameData.elements || []));
    this.nodalLoads = JSON.parse(JSON.stringify(frameData.nodalLoads || []));
    this.distLoads = JSON.parse(JSON.stringify(frameData.distLoads || []));
    this.EA = DEFAULT_EA;
  }

  solve() {
    const numNodes = this.nodes.length;
    const numElements = this.elements.length;

    if (numNodes < 2 || numElements < 1) {
      return this.createUnstableResult('Insufficient nodes or elements.');
    }

    // Map node ID to index
    const nodeMap = new Map();
    this.nodes.forEach((n, idx) => {
      nodeMap.set(n.id, {
        ...n,
        index: idx,
        x: Number(n.x) || 0,
        z: Number(n.z) || 0,
        support: n.support || 'none'
      });
    });

    // 1. Calculate Frame Centroid for Inside/Outside Detection
    let sumX = 0, sumZ = 0;
    this.nodes.forEach(n => {
      sumX += Number(n.x) || 0;
      sumZ += Number(n.z) || 0;
    });
    const centroid = { x: sumX / numNodes, z: sumZ / numNodes };

    // 2. Setup System Degrees of Freedom (3 DOFs per node: u (x), w (z), theta (rotation))
    const totalDof = numNodes * 3;
    const K = Array.from({ length: totalDof }, () => new Float64Array(totalDof));
    const F = new Float64Array(totalDof);

    // Apply Direct Nodal Point Loads (Positive user Fz = Downward)
    this.nodalLoads.forEach(nl => {
      const node = nodeMap.get(nl.nodeId);
      if (node) {
        const dofU = node.index * 3 + 0;
        const dofW = node.index * 3 + 1;
        const dofT = node.index * 3 + 2;
        F[dofU] += Number(nl.Fx) || 0;
        F[dofW] -= Number(nl.Fz) || 0; // Positive user input Fz is downward
        F[dofT] += Number(nl.M) || 0;
      }
    });

    // Store element geometric & transformation properties
    const elementProps = [];

    // 3. Assemble Element Stiffness Matrices & Equivalent Member Loads
    for (const elem of this.elements) {
      const nodeI = nodeMap.get(elem.nodeI);
      const nodeJ = nodeMap.get(elem.nodeJ);

      if (!nodeI || !nodeJ) continue;

      const dx = nodeJ.x - nodeI.x;
      const dz = nodeJ.z - nodeI.z;
      const L = Math.hypot(dx, dz);

      if (L < 1e-6) continue;

      const cos = dx / L;
      const sin = dz / L;
      const EJ = Math.max(0.0001, Number(elem.EJ) || DEFAULT_EJ);
      const EA = this.EA;

      // Inside/outside determination relative to centroid
      const midX = (nodeI.x + nodeJ.x) / 2;
      const midZ = (nodeI.z + nodeJ.z) / 2;
      // Normal vector e_zeta = (-sin, cos) points 90 deg clockwise from member axis
      const toCentroidX = centroid.x - midX;
      const toCentroidZ = centroid.z - midZ;
      const dotInside = toCentroidX * (-sin) + toCentroidZ * cos;
      // insideSign: +1 if +zeta is inside frame, -1 if -zeta is inside frame
      const insideSign = dotInside >= 0 ? 1 : -1;

      // Local Stiffness Matrix (6x6)
      const kLocal = Array.from({ length: 6 }, () => new Float64Array(6));
      const hingeI = Boolean(elem.hingeI);
      const hingeJ = Boolean(elem.hingeJ);

      // Axial terms
      const kAxial = EA / L;
      kLocal[0][0] = kAxial;
      kLocal[0][3] = -kAxial;
      kLocal[3][0] = -kAxial;
      kLocal[3][3] = kAxial;

      // Flexural terms with hinge releases
      if (hingeI && hingeJ) {
        // Both ends hinged (truss bar): no bending stiffness
      } else if (hingeI) {
        // Hinge at Node I
        const k1 = 3 * EJ / Math.pow(L, 3);
        const k2 = 3 * EJ / Math.pow(L, 2);
        const k3 = 3 * EJ / L;
        kLocal[1][1] = k1;   kLocal[1][4] = -k1;  kLocal[1][5] = k2;
        kLocal[4][1] = -k1;  kLocal[4][4] = k1;   kLocal[4][5] = -k2;
        kLocal[5][1] = k2;   kLocal[5][4] = -k2;  kLocal[5][5] = k3;
      } else if (hingeJ) {
        // Hinge at Node J
        const k1 = 3 * EJ / Math.pow(L, 3);
        const k2 = 3 * EJ / Math.pow(L, 2);
        const k3 = 3 * EJ / L;
        kLocal[1][1] = k1;   kLocal[1][2] = k2;   kLocal[1][4] = -k1;
        kLocal[2][1] = k2;   kLocal[2][2] = k3;   kLocal[2][4] = -k2;
        kLocal[4][1] = -k1;  kLocal[4][2] = -k2;  kLocal[4][4] = k1;
      } else {
        // Standard Euler-Bernoulli beam-column (rigid connections)
        const k1 = 12 * EJ / Math.pow(L, 3);
        const k2 = 6 * EJ / Math.pow(L, 2);
        const k3 = 4 * EJ / L;
        const k4 = 2 * EJ / L;
        kLocal[1][1] = k1;   kLocal[1][2] = k2;   kLocal[1][4] = -k1;  kLocal[1][5] = k2;
        kLocal[2][1] = k2;   kLocal[2][2] = k3;   kLocal[2][4] = -k2;  kLocal[2][5] = k4;
        kLocal[4][1] = -k1;  kLocal[4][2] = -k2;  kLocal[4][4] = k1;   kLocal[4][5] = -k2;
        kLocal[5][1] = k2;   kLocal[5][2] = k4;   kLocal[5][4] = -k2;  kLocal[5][5] = k3;
      }

      // Transformation Matrix T (6x6)
      const T = [
        [cos, sin, 0, 0, 0, 0],
        [-sin, cos, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, cos, sin, 0],
        [0, 0, 0, -sin, cos, 0],
        [0, 0, 0, 0, 0, 1]
      ];

      // K_global_elem = T^T * K_local * T
      const kGlobal = this.transformMatrix(kLocal, T);

      // Assemble into Global K
      const dofs = [
        nodeI.index * 3 + 0, nodeI.index * 3 + 1, nodeI.index * 3 + 2,
        nodeJ.index * 3 + 0, nodeJ.index * 3 + 1, nodeJ.index * 3 + 2
      ];

      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          K[dofs[r]][dofs[c]] += kGlobal[r][c];
        }
      }

      // Distributed Loads on this Element
      let totalQx = 0;
      let totalQzGeom = 0;
      for (const dl of this.distLoads) {
        if (dl.elementId === elem.id) {
          totalQx += Number(dl.qx) || 0;
          // Positive user input qz means DOWNWARD
          totalQzGeom -= Number(dl.qz) || 0;
        }
      }

      // Local load components (Projected onto global X and Z axes)
      const absCos = Math.abs(cos);
      const absSin = Math.abs(sin);
      const qXi = totalQx * absSin * cos + totalQzGeom * absCos * sin;
      const qZeta = -totalQx * absSin * sin + totalQzGeom * absCos * cos;

      // Fixed End Forces f_fixed_local
      const fFixedLocal = new Float64Array(6);

      // Axial distributed load
      fFixedLocal[0] = -qXi * L / 2;
      fFixedLocal[3] = -qXi * L / 2;

      // Transverse distributed load
      if (hingeI && hingeJ) {
        fFixedLocal[1] = -qZeta * L / 2;
        fFixedLocal[4] = -qZeta * L / 2;
      } else if (hingeI) {
        fFixedLocal[1] = -3 * qZeta * L / 8;
        fFixedLocal[4] = -5 * qZeta * L / 8;
        fFixedLocal[5] = qZeta * L * L / 8;
      } else if (hingeJ) {
        fFixedLocal[1] = -5 * qZeta * L / 8;
        fFixedLocal[2] = -qZeta * L * L / 8;
        fFixedLocal[4] = -3 * qZeta * L / 8;
      } else {
        fFixedLocal[1] = -qZeta * L / 2;
        fFixedLocal[2] = -qZeta * L * L / 12;
        fFixedLocal[4] = -qZeta * L / 2;
        fFixedLocal[5] = qZeta * L * L / 12;
      }

      // Equivalent Nodal Load F_eq = - T^T * fFixedLocal
      for (let r = 0; r < 6; r++) {
        let feqR = 0;
        for (let c = 0; c < 6; c++) {
          feqR -= T[c][r] * fFixedLocal[c];
        }
        F[dofs[r]] += feqR;
      }

      elementProps.push({
        element: elem,
        nodeI,
        nodeJ,
        L,
        cos,
        sin,
        EJ,
        EA,
        kLocal,
        T,
        dofs,
        qXi,
        qZeta,
        fFixedLocal,
        insideSign
      });
    }

    // 4. Boundary Conditions (Support Restraints)
    const isRestrained = new Uint8Array(totalDof);
    let supportDofCount = 0;

    this.nodes.forEach(node => {
      const idx = nodeMap.get(node.id).index;
      const dofU = idx * 3 + 0;
      const dofW = idx * 3 + 1;
      const dofT = idx * 3 + 2;

      switch (node.support) {
        case 'pin':
          isRestrained[dofU] = 1;
          isRestrained[dofW] = 1;
          supportDofCount += 2;
          break;
        case 'roller_x':
          // Free in X, fixed in Z
          isRestrained[dofW] = 1;
          supportDofCount += 1;
          break;
        case 'roller_z':
          // Free in Z, fixed in X
          isRestrained[dofU] = 1;
          supportDofCount += 1;
          break;
        case 'fixed':
          isRestrained[dofU] = 1;
          isRestrained[dofW] = 1;
          isRestrained[dofT] = 1;
          supportDofCount += 3;
          break;
        default:
          break;
      }
    });

    if (supportDofCount < 3) {
      return this.createUnstableResult('Mechanism: Minimum 3 support restraints required.');
    }

    // 5. Solve Reduced Linear System
    const freeDofs = [];
    for (let i = 0; i < totalDof; i++) {
      if (!isRestrained[i]) freeDofs.push(i);
    }

    const nFree = freeDofs.length;
    const Kred = Array.from({ length: nFree }, () => new Float64Array(nFree));
    const Fred = new Float64Array(nFree);

    for (let r = 0; r < nFree; r++) {
      Fred[r] = F[freeDofs[r]];
      for (let c = 0; c < nFree; c++) {
        Kred[r][c] = K[freeDofs[r]][freeDofs[c]];
      }
    }

    const { x: dFree, isSingular } = this.solveLinearSystem(Kred, Fred);

    if (isSingular) {
      return this.createUnstableResult('Mechanism: Global stiffness matrix is singular.');
    }

    // Reconstruct full displacement vector
    const displacements = new Float64Array(totalDof);
    for (let i = 0; i < nFree; i++) {
      displacements[freeDofs[i]] = dFree[i];
    }

    // 6. Compute Global Reactions: R = K * d - F_applied
    const reactionsGlobal = new Float64Array(totalDof);
    for (let r = 0; r < totalDof; r++) {
      let kd = 0;
      for (let c = 0; c < totalDof; c++) {
        kd += K[r][c] * displacements[c];
      }
      reactionsGlobal[r] = kd - F[r];
    }

    const reactions = {};
    this.nodes.forEach(node => {
      const idx = nodeMap.get(node.id).index;
      if (node.support && node.support !== 'none') {
        reactions[node.id] = {
          Rx: Math.abs(reactionsGlobal[idx * 3 + 0]) < 1e-4 ? 0 : reactionsGlobal[idx * 3 + 0],
          Rz: Math.abs(reactionsGlobal[idx * 3 + 1]) < 1e-4 ? 0 : reactionsGlobal[idx * 3 + 1],
          MR: Math.abs(reactionsGlobal[idx * 3 + 2]) < 1e-4 ? 0 : reactionsGlobal[idx * 3 + 2],
          support: node.support
        };
      }
    });

    // 7. Post-process Internal Forces (N, T, M) for Each Member
    const elementResults = [];
    const numSamples = 40; // Sampling points per element for smooth diagram plotting

    for (const ep of elementProps) {
      const { element, nodeI, nodeJ, L, cos, sin, kLocal, T, dofs, qXi, qZeta, fFixedLocal, insideSign } = ep;

      // Extract nodal displacements for this element
      const dElemGlobal = new Float64Array(6);
      for (let i = 0; i < 6; i++) {
        dElemGlobal[i] = displacements[dofs[i]];
      }

      // Local displacements d_local = T * d_global
      const dElemLocal = new Float64Array(6);
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          dElemLocal[r] += T[r][c] * dElemGlobal[c];
        }
      }

      // Member end actions f_local = K_local * d_local + fFixedLocal
      const fElemLocal = new Float64Array(6);
      for (let r = 0; r < 6; r++) {
        let kd = 0;
        for (let c = 0; c < 6; c++) {
          kd += kLocal[r][c] * dElemLocal[c];
        }
        fElemLocal[r] = kd + fFixedLocal[r];
      }

      // End forces in local coordinate:
      // Node i: [N_i, T_i, M_i]
      // Node j: [N_j, T_j, M_j]
      const Ni = fElemLocal[0];
      const Ti = fElemLocal[1];
      const Mi = fElemLocal[2];
      const Nj = fElemLocal[3];
      const Tj = fElemLocal[4];
      const Mj = fElemLocal[5];

      // Sample along element length s in [0, L]
      const samples = [];
      let maxN = -Infinity, minN = Infinity;
      let maxT = -Infinity, minT = Infinity;
      let maxM = -Infinity, minM = Infinity;

      for (let step = 0; step <= numSamples; step++) {
        const s = (step / numSamples) * L;
        
        // Exact internal forces at coordinate s from equilibrium:
        // Normal force (positive = tension, negative = compression):
        const N_val = -Ni - qXi * s;

        // Shear force (positive = clockwise rotation / upward left support reaction):
        const T_val = Ti + qZeta * s;

        // Bending moment (drawn on tension side, dM/ds = T):
        const M_val = Mi - Ti * s - 0.5 * qZeta * s * s;

        // Global coordinate of sample point:
        const xPt = nodeI.x + s * cos;
        const zPt = nodeI.z + s * sin;

        samples.push({
          s,
          x: xPt,
          z: zPt,
          N: Math.abs(N_val) < 1e-4 ? 0 : N_val,
          T: Math.abs(T_val) < 1e-4 ? 0 : T_val,
          M: Math.abs(M_val) < 1e-4 ? 0 : M_val
        });

        if (N_val > maxN) maxN = N_val;
        if (N_val < minN) minN = N_val;
        if (T_val > maxT) maxT = T_val;
        if (T_val < minT) minT = T_val;
        if (M_val > maxM) maxM = M_val;
        if (M_val < minM) minM = M_val;
      }

      elementResults.push({
        id: element.id,
        nodeI: nodeI.id,
        nodeJ: nodeJ.id,
        coordI: { x: nodeI.x, z: nodeI.z },
        coordJ: { x: nodeJ.x, z: nodeJ.z },
        L,
        cos,
        sin,
        insideSign, // +1 if +zeta is inside, -1 if -zeta is inside
        endForces: {
          i: { N: Ni, T: Ti, M: Mi },
          j: { N: Nj, T: Tj, M: Mj }
        },
        extrema: {
          N: { min: minN, max: maxN },
          T: { min: minT, max: maxT },
          M: { min: minM, max: maxM }
        },
        samples
      });
    }

    // 8. Global Equilibrium Verification (ΣFx = 0, ΣFz = 0, ΣM(0,0) = 0)
    const equilibrium = this.checkGlobalEquilibrium(reactions, nodeMap);

    // 9. Static Determinacy Classification
    let hingeCount = 0;
    this.elements.forEach(e => {
      if (e.hingeI) hingeCount++;
      if (e.hingeJ) hingeCount++;
    });

    // Degree of indeterminacy n for 2D plane frame:
    // n = 3 * (Members) + Reactions - 3 * (Nodes) - Hinges
    const degreeOfIndeterminacy = Math.max(0, 3 * numElements + supportDofCount - 3 * numNodes - hingeCount);

    return {
      isStable: true,
      nodes: Array.from(nodeMap.values()),
      elements: elementResults,
      reactions,
      equilibrium,
      displacements: Array.from(displacements),
      determinacy: {
        isStable: true,
        degree: Math.max(0, degreeOfIndeterminacy),
        type: degreeOfIndeterminacy <= 0 ? 'Determinate' : 'Indeterminate',
        label: degreeOfIndeterminacy <= 0 ? 'Statically Determinate' : `Statically Indeterminate (n = ${degreeOfIndeterminacy})`
      }
    };
  }

  createUnstableResult(reason) {
    return {
      isStable: false,
      reason,
      nodes: this.nodes,
      elements: [],
      reactions: {},
      equilibrium: { sumFx: 0, sumFz: 0, sumM: 0, isBalanced: false },
      determinacy: {
        isStable: false,
        degree: -1,
        type: 'Mechanism',
        label: 'Unstable Mechanism'
      }
    };
  }

  checkGlobalEquilibrium(reactions, nodeMap) {
    let sumFx = 0;
    let sumFz = 0;
    let sumM = 0;

    // Direct Nodal Loads
    this.nodalLoads.forEach(nl => {
      const node = nodeMap.get(nl.nodeId);
      const fx = Number(nl.Fx) || 0;
      const fz = Number(nl.Fz) || 0;
      const m = Number(nl.M) || 0;
      sumFx += fx;
      sumFz += fz;
      if (node) {
        sumM += m + node.x * fz - node.z * fx;
      }
    });

    // Distributed Loads
    this.elements.forEach(elem => {
      const nodeI = nodeMap.get(elem.nodeI);
      const nodeJ = nodeMap.get(elem.nodeJ);
      if (!nodeI || !nodeJ) return;

      for (const dl of this.distLoads) {
        if (dl.elementId === elem.id) {
          const qx = Number(dl.qx) || 0;
          const qz = Number(dl.qz) || 0;
          const dx = Math.abs(nodeJ.x - nodeI.x);
          const dz = Math.abs(nodeJ.z - nodeI.z);
          
          const totalQx = qx * dz;
          const totalQz = qz * dx;
          const midX = (nodeI.x + nodeJ.x) / 2;
          const midZ = (nodeI.z + nodeJ.z) / 2;

          sumFx += totalQx;
          sumFz += totalQz;
          sumM += midX * totalQz - midZ * totalQx;
        }
      }
    });

    // Subtract Reactions
    for (const [nodeId, r] of Object.entries(reactions)) {
      const node = nodeMap.get(nodeId);
      sumFx -= r.Rx;
      sumFz -= r.Rz;
      if (node) {
        sumM -= (r.MR + node.x * r.Rz - node.z * r.Rx);
      }
    }

    return {
      netFx: sumFx,
      netFz: sumFz,
      netM: sumM,
      isBalanced: Math.abs(sumFx) < 1e-2 && Math.abs(sumFz) < 1e-2 && Math.abs(sumM) < 1e-2
    };
  }

  transformMatrix(Klocal, T) {
    // Kglobal = T^T * Klocal * T
    const temp = Array.from({ length: 6 }, () => new Float64Array(6));
    const result = Array.from({ length: 6 }, () => new Float64Array(6));

    // temp = Klocal * T
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        let sum = 0;
        for (let k = 0; k < 6; k++) {
          sum += Klocal[i][k] * T[k][j];
        }
        temp[i][j] = sum;
      }
    }

    // result = T^T * temp
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        let sum = 0;
        for (let k = 0; k < 6; k++) {
          sum += T[k][i] * temp[k][j];
        }
        result[i][j] = sum;
      }
    }

    return result;
  }

  solveLinearSystem(A, B) {
    const n = B.length;
    if (n === 0) return { x: new Float64Array(0), isSingular: false };

    const M = A.map(row => Array.from(row));
    const x = new Float64Array(n);
    const b = Array.from(B);
    let isSingular = false;

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(M[i][i]);
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxVal) {
          maxVal = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      if (maxRow !== i) {
        const tempRow = M[i];
        M[i] = M[maxRow];
        M[maxRow] = tempRow;
        const tempB = b[i];
        b[i] = b[maxRow];
        b[maxRow] = tempB;
      }

      if (Math.abs(M[i][i]) < 1e-12) {
        isSingular = true;
        M[i][i] = 1.0;
      }

      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        b[k] -= factor * b[i];
        for (let j = i; j < n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }

    for (let i = n - 1; i >= 0; i--) {
      let sum = b[i];
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * x[j];
      }
      x[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0.0;
    }

    return { x, isSingular };
  }
}
