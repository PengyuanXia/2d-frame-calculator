/**
 * 2D Frame Calculator - Benchmark Homework Presets
 * Fully separated English and Polish titles & descriptions.
 * Coordinate System: x to the right (->), z to the up (^)
 * Notation: N, T, M, EJ = 1.
 */

export const CUSTOM_DESIGN_PRESET = {
  id: 'custom_design',
  name: {
    en: '✨ Custom Design (Blank Canvas)',
    pl: '✨ Własny projekt (Czyste płótno)'
  },
  description: {
    en: '1. Click "+ Add Node" and click "Create Member" after that. 2. Or select a benchmark preset.',
    pl: '1. Kliknij „+ Dodaj węzeł”, a następnie „Utwórz pręt”. 2. Lub wybierz gotowy schemat.'
  },
  data: {
    nodes: [],
    elements: [],
    nodalLoads: [],
    distLoads: [],
    currentView: 'reactions'
  }
};

export const EMPTY_FRAME_PRESET = CUSTOM_DESIGN_PRESET;

export const PRESETS = [
  CUSTOM_DESIGN_PRESET,
  {
    id: 'portal_frame_udl',
    name: {
      en: '1. Two-Hinged Portal Frame with Uniform Beam Load (qz = 10 kN/m)',
      pl: '1. Rama dwuprzegubowa z obciążeniem ciągłym rygla (qz = 10 kN/m)'
    },
    description: {
      en: 'Standard portal frame (4m tall columns, 6m span beam, pinned bases at ground z = 0m) under downward gravity load qz = 10 kN/m (positive = downward). Classical structural mechanics benchmark.',
      pl: 'Klasyczna rama portalowa (słupy h = 4m, rozpiętość L = 6m, podpory przegubowe w z = 0m) pod obciążeniem grawitacyjnym qz = 10 kN/m (wartość dodatnia = w dół).'
    },
    data: {
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'pin' },
        { id: 'N2', x: 0.0, z: 4.0, support: 'none' },
        { id: 'N3', x: 6.0, z: 4.0, support: 'none' },
        { id: 'N4', x: 6.0, z: 0.0, support: 'pin' }
      ],
      elements: [
        { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E3', nodeI: 'N3', nodeJ: 'N4', EJ: 1.0, hingeI: false, hingeJ: false }
      ],
      nodalLoads: [],
      distLoads: [
        { id: 'D1', elementId: 'E2', qx: 0.0, qz: 10.0, q1: 10.0, q2: 10.0, mode: 'proj_z' }
      ],
      currentView: 'reactions'
    }
  },
  {
    id: 'fixed_portal_wind',
    name: {
      en: '2. Fixed-Base Portal Frame with Horizontal Lateral Force (Fx = 20 kN)',
      pl: '2. Rama utwierdzona z poziomą siłą boczną (Fx = 20 kN)'
    },
    description: {
      en: 'Portal frame clamped at ground (N1, N4 fixed at z = 0m) subjected to horizontal lateral force Fx = 20 kN at corner N2 (z = 4m), producing frame sidesway bending.',
      pl: 'Rama portalowa z utwierdzeniem w podłożu (N1, N4 w z = 0m) obciążona siłą poziomą Fx = 20 kN w narożniku N2 (z = 4m).'
    },
    data: {
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'fixed' },
        { id: 'N2', x: 0.0, z: 4.0, support: 'none' },
        { id: 'N3', x: 6.0, z: 4.0, support: 'none' },
        { id: 'N4', x: 6.0, z: 0.0, support: 'fixed' }
      ],
      elements: [
        { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E3', nodeI: 'N3', nodeJ: 'N4', EJ: 1.0, hingeI: false, hingeJ: false }
      ],
      nodalLoads: [
        { id: 'L1', nodeId: 'N2', Fx: 20.0, Fz: 0.0, M: 0.0 }
      ],
      distLoads: [],
      currentView: 'reactions'
    }
  },
  {
    id: 'l_shaped_frame',
    name: {
      en: '3. Cantilever L-Shaped Frame with Tip Point Load (Fz = 15 kN)',
      pl: '3. Rama kątowa / wspornikowa z siłą pionową (Fz = 15 kN)'
    },
    description: {
      en: 'Two-member orthogonal frame clamped at base N1 (z = 0m) with vertical downward tip load Fz = 15 kN (positive = downward) at free end N3 (z = 4m).',
      pl: 'Rama dwuprętowa utwierdzona w podstawie N1 (z = 0m) z siłą pionową w dół Fz = 15 kN (wartość dodatnia = w dół) na swobodnym końcu wspornika N3 (z = 4m).'
    },
    data: {
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'fixed' },
        { id: 'N2', x: 0.0, z: 4.0, support: 'none' },
        { id: 'N3', x: 5.0, z: 4.0, support: 'none' }
      ],
      elements: [
        { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EJ: 1.0, hingeI: false, hingeJ: false }
      ],
      nodalLoads: [
        { id: 'L1', nodeId: 'N3', Fx: 0.0, Fz: 15.0, M: 0.0 }
      ],
      distLoads: [],
      currentView: 'reactions'
    }
  },
  {
    id: 'gable_pitched_frame',
    name: {
      en: '4. Gable / Pitched Roof Frame',
      pl: '4. Rama dwuspadowa (Kalenicowa ze skosami)'
    },
    description: {
      en: 'Symmetric pitched roof frame with inclined rafters (ridge apex at z = 4.0m, eaves at z = 2.5m, ground bases at z = 0.0m) and vertical gravity load qz = 8 kN/m (positive = downward) on rafters.',
      pl: 'Symetryczna rama ze skosami dachowymi (kalenica w z = 4.0m, okap w z = 2.5m, podpory w z = 0.0m) i obciążeniem pionowym qz = 8 kN/m (wartość dodatnia = w dół).'
    },
    data: {
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'pin' },
        { id: 'N2', x: 0.0, z: 2.5, support: 'none' },
        { id: 'N3', x: 4.0, z: 4.0, support: 'none' }, // Ridge apex (highest point, z=4)
        { id: 'N4', x: 8.0, z: 2.5, support: 'none' },
        { id: 'N5', x: 8.0, z: 0.0, support: 'pin' }
      ],
      elements: [
        { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E3', nodeI: 'N3', nodeJ: 'N4', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E4', nodeI: 'N4', nodeJ: 'N5', EJ: 1.0, hingeI: false, hingeJ: false }
      ],
      nodalLoads: [],
      distLoads: [
        { id: 'D1', elementId: 'E2', qx: 0.0, qz: 8.0, q1: 8.0, q2: 8.0, mode: 'proj_z' },
        { id: 'D2', elementId: 'E3', qx: 0.0, qz: 8.0, q1: 8.0, q2: 8.0, mode: 'proj_z' }
      ],
      currentView: 'reactions'
    }
  },
  {
    id: 'two_bay_frame',
    name: {
      en: '5. Two-Bay Continuous Frame',
      pl: '5. Rama dwunawowa (3 słupy, 2 przęsła)'
    },
    description: {
      en: 'Multi-span frame with 3 columns, 2 roof beams (girders at z = 4.0m, column bases at ground z = 0.0m), fixed ground supports, with downward gravity load qz = 15 kN/m (positive = downward) on bay 1.',
      pl: 'Rama dwunawowa z 3 słupami utwierdzonymi w podłożu (rygle w z = 4.0m, słupy do z = 0.0m) i obciążeniem ciągłym qz = 15 kN/m (wartość dodatnia = w dół) na 1. nawie.'
    },
    data: {
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'fixed' },
        { id: 'N2', x: 0.0, z: 4.0, support: 'none' },
        { id: 'N3', x: 5.0, z: 4.0, support: 'none' },
        { id: 'N4', x: 5.0, z: 0.0, support: 'fixed' },
        { id: 'N5', x: 10.0, z: 4.0, support: 'none' },
        { id: 'N6', x: 10.0, z: 0.0, support: 'fixed' }
      ],
      elements: [
        { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E3', nodeI: 'N4', nodeJ: 'N3', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E4', nodeI: 'N3', nodeJ: 'N5', EJ: 1.0, hingeI: false, hingeJ: false },
        { id: 'E5', nodeI: 'N6', nodeJ: 'N5', EJ: 1.0, hingeI: false, hingeJ: false }
      ],
      nodalLoads: [],
      distLoads: [
        { id: 'D1', elementId: 'E2', qx: 0.0, qz: 15.0, q1: 15.0, q2: 15.0, mode: 'proj_z' }
      ],
      currentView: 'reactions'
    }
  },
  {
    id: 'warren_truss',
    name: {
      en: '6. Warren Truss with Apex Point Load (Truss Mode)',
      pl: '6. Kratownica Warrena z obciążeniem węzłowym (Tryb kratownicy)'
    },
    description: {
      en: 'Classical triangular web Warren truss (span L = 6m, height h = 2.5m) subjected to downward nodal loads at top and bottom chord joints. Pin-jointed pure axial force analysis.',
      pl: 'Klasyczna kratownica trójkątna Warrena (rozpiętość L = 6m, wysokość h = 2.5m) z obciążeniem węzłowym. Czyste siły osiowe N w prętach.'
    },
    data: {
      structureType: 'truss',
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'pin' },
        { id: 'N2', x: 3.0, z: 0.0, support: 'none' },
        { id: 'N3', x: 6.0, z: 0.0, support: 'roller' },
        { id: 'N4', x: 1.5, z: 2.5, support: 'none' },
        { id: 'N5', x: 4.5, z: 2.5, support: 'none' }
      ],
      elements: [
        { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E3', nodeI: 'N4', nodeJ: 'N5', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E4', nodeI: 'N1', nodeJ: 'N4', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E5', nodeI: 'N4', nodeJ: 'N2', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E6', nodeI: 'N2', nodeJ: 'N5', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E7', nodeI: 'N5', nodeJ: 'N3', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true }
      ],
      nodalLoads: [
        { id: 'L1', nodeId: 'N4', Fx: 0.0, Fz: 20.0, M: 0.0 },
        { id: 'L2', nodeId: 'N2', Fx: 0.0, Fz: 40.0, M: 0.0 },
        { id: 'L3', nodeId: 'N5', Fx: 0.0, Fz: 20.0, M: 0.0 }
      ],
      distLoads: [],
      currentView: 'reactions'
    }
  },
  {
    id: 'pratt_bridge_truss',
    name: {
      en: '7. Pratt Bridge Truss with Deck Loading (Truss Mode)',
      pl: '7. Kratownica mostowa Pratta z obciążeniem pomostu (Tryb kratownicy)'
    },
    description: {
      en: 'Standard 4-panel Pratt bridge truss (span L = 8m, height h = 2.5m) under joint gravity loads on the bottom roadway chord. Demonstrates tension diagonals and compression verticals.',
      pl: '4-panelowa kratownica mostowa Pratta (rozpiętość L = 8m, wysokość h = 2.5m) pod obciążeniem dolnego pasa jezdnego.'
    },
    data: {
      structureType: 'truss',
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'pin' },
        { id: 'N2', x: 2.0, z: 0.0, support: 'none' },
        { id: 'N3', x: 4.0, z: 0.0, support: 'none' },
        { id: 'N4', x: 6.0, z: 0.0, support: 'none' },
        { id: 'N5', x: 8.0, z: 0.0, support: 'roller' },
        { id: 'N6', x: 2.0, z: 2.5, support: 'none' },
        { id: 'N7', x: 4.0, z: 2.5, support: 'none' },
        { id: 'N8', x: 6.0, z: 2.5, support: 'none' }
      ],
      elements: [
        { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E3', nodeI: 'N3', nodeJ: 'N4', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E4', nodeI: 'N4', nodeJ: 'N5', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E5', nodeI: 'N6', nodeJ: 'N7', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E6', nodeI: 'N7', nodeJ: 'N8', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E7', nodeI: 'N2', nodeJ: 'N6', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E8', nodeI: 'N3', nodeJ: 'N7', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E9', nodeI: 'N4', nodeJ: 'N8', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E10', nodeI: 'N1', nodeJ: 'N6', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E11', nodeI: 'N2', nodeJ: 'N7', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E12', nodeI: 'N4', nodeJ: 'N7', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E13', nodeI: 'N5', nodeJ: 'N8', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true }
      ],
      nodalLoads: [
        { id: 'L1', nodeId: 'N2', Fx: 0.0, Fz: 30.0, M: 0.0 },
        { id: 'L2', nodeId: 'N3', Fx: 0.0, Fz: 50.0, M: 0.0 },
        { id: 'L3', nodeId: 'N4', Fx: 0.0, Fz: 30.0, M: 0.0 }
      ],
      distLoads: [],
      currentView: 'reactions'
    }
  },
  {
    id: 'howe_roof_truss',
    name: {
      en: '8. Pitched Howe Roof Truss with Symmetrical Loading (Truss Mode)',
      pl: '8. Kratownica dachowa Howe’a z obciążeniem symetrycznym (Tryb kratownicy)'
    },
    description: {
      en: 'Gable pitched roof truss (span L = 6m, ridge height h = 2.4m) under symmetrical gravity snow/dead loads at top chord joints.',
      pl: 'Dwuspadowa kratownica dachowa (rozpiętość L = 6m, wysokość w kalenicy h = 2.4m) pod symetrycznym obciążeniem grawitacyjnym.'
    },
    data: {
      structureType: 'truss',
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'pin' },
        { id: 'N2', x: 3.0, z: 0.0, support: 'none' },
        { id: 'N3', x: 6.0, z: 0.0, support: 'roller' },
        { id: 'N4', x: 1.5, z: 1.2, support: 'none' },
        { id: 'N5', x: 3.0, z: 2.4, support: 'none' },
        { id: 'N6', x: 4.5, z: 1.2, support: 'none' }
      ],
      elements: [
        { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E3', nodeI: 'N1', nodeJ: 'N4', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E4', nodeI: 'N4', nodeJ: 'N5', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E5', nodeI: 'N5', nodeJ: 'N6', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E6', nodeI: 'N6', nodeJ: 'N3', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E7', nodeI: 'N4', nodeJ: 'N2', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E8', nodeI: 'N5', nodeJ: 'N2', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true },
        { id: 'E9', nodeI: 'N6', nodeJ: 'N2', EA: 10000.0, EJ: 1.0, hingeI: true, hingeJ: true }
      ],
      nodalLoads: [
        { id: 'L1', nodeId: 'N4', Fx: 0.0, Fz: 15.0, M: 0.0 },
        { id: 'L2', nodeId: 'N5', Fx: 0.0, Fz: 25.0, M: 0.0 },
        { id: 'L3', nodeId: 'N6', Fx: 0.0, Fz: 15.0, M: 0.0 }
      ],
      distLoads: [],
      currentView: 'reactions'
    }
  }
];
