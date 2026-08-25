/**
 * 2D Frame Calculator - Benchmark Homework Presets
 * Fully separated English and Polish titles & descriptions.
 * Coordinate System: x to the right (->), z to the up (^)
 * Notation: N, T, M, EJ = 1.
 */

export const PRESETS = [
  {
    id: 'portal_frame_udl',
    name: {
      en: '1. Two-Hinged Portal Frame with Uniform Beam Load (qz = -10 kN/m)',
      pl: '1. Rama dwuprzegubowa z obciążeniem ciągłym rygla (qz = -10 kN/m)'
    },
    description: {
      en: 'Standard portal frame (4m tall columns, 6m span beam, pinned bases at z = 0) under downward gravity load qz = -10 kN/m. Classical structural mechanics benchmark.',
      pl: 'Klasyczna rama portalowa (słupy h = 4m, rozpiętość L = 6m, podpory przegubowe w z = 0) pod obciążeniem grawitacyjnym qz = -10 kN/m.'
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
        { id: 'D1', elementId: 'E2', qx: 0.0, qz: -10.0, q1: 10.0, q2: 10.0, mode: 'proj_z' }
      ],
      currentView: 'moment'
    }
  },
  {
    id: 'fixed_portal_wind',
    name: {
      en: '2. Fixed-Base Portal Frame with Horizontal Lateral Force (Fx = 20 kN)',
      pl: '2. Rama utwierdzona z poziomą siłą boczną (Fx = 20 kN)'
    },
    description: {
      en: 'Portal frame clamped at ground (N1, N4 fixed at z = 0) subjected to horizontal lateral force Fx = 20 kN at corner N2, producing frame sidesway bending.',
      pl: 'Rama portalowa z utwierdzeniem w podłożu (N1, N4 w z = 0) obciążona siłą poziomą Fx = 20 kN w narożniku N2 (przechył boczny ramy).'
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
      currentView: 'moment'
    }
  },
  {
    id: 'l_shaped_frame',
    name: {
      en: '3. Cantilever L-Shaped Frame with Tip Point Load (Fz = -15 kN)',
      pl: '3. Rama kątowa / wspornikowa z siłą pionową (Fz = -15 kN)'
    },
    description: {
      en: 'Two-member orthogonal frame clamped at base N1 (z = 0) with vertical downward tip load Fz = -15 kN at free end N3 (z = 4).',
      pl: 'Rama dwuprętowa utwierdzona w podstawie N1 (z = 0) z siłą pionową w dół Fz = -15 kN na swobodnym końcu wspornika N3 (z = 4).'
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
        { id: 'L1', nodeId: 'N3', Fx: 0.0, Fz: -15.0, M: 0.0 }
      ],
      distLoads: [],
      currentView: 'moment'
    }
  },
  {
    id: 'gable_pitched_frame',
    name: {
      en: '4. Gable / Pitched Roof Frame (Dwuprzegubowa rama dwuspadowa)',
      pl: '4. Rama dwuspadowa (Kalenicowa ze skosami)'
    },
    description: {
      en: 'Symmetric pitched roof frame with inclined rafters (ridge at z = 4.0m, eaves at z = 2.5m) and vertical gravity load qz = -8 kN/m on rafters.',
      pl: 'Symetryczna rama ze skosami dachowymi (kalenica w z = 4.0m, okap w z = 2.5m) i obciążeniem pionowym qz = -8 kN/m.'
    },
    data: {
      nodes: [
        { id: 'N1', x: 0.0, z: 0.0, support: 'pin' },
        { id: 'N2', x: 0.0, z: 2.5, support: 'none' },
        { id: 'N3', x: 4.0, z: 4.0, support: 'none' }, // Ridge apex
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
        { id: 'D1', elementId: 'E2', qx: 0.0, qz: -8.0, q1: 8.0, q2: 8.0, mode: 'proj_z' },
        { id: 'D2', elementId: 'E3', qx: 0.0, qz: -8.0, q1: 8.0, q2: 8.0, mode: 'proj_z' }
      ],
      currentView: 'moment'
    }
  },
  {
    id: 'two_bay_frame',
    name: {
      en: '5. Two-Bay Continuous Frame (Rama dwunawowa z trzema słupami)',
      pl: '5. Rama dwunawowa (3 słupy, 2 przęsła)'
    },
    description: {
      en: 'Multi-span frame with 3 columns, 2 roof beams (height = 4m), fixed ground supports, with downward gravity load qz = -15 kN/m on bay 1.',
      pl: 'Rama dwunawowa z 3 słupami utwierdzonymi w podłożu (wysokość h = 4m) i obciążeniem ciągłym qz = -15 kN/m na 1. nawie.'
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
        { id: 'D1', elementId: 'E2', qx: 0.0, qz: -15.0, q1: 15.0, q2: 15.0, mode: 'proj_z' }
      ],
      currentView: 'moment'
    }
  }
];
