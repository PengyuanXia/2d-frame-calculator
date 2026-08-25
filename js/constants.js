/**
 * 2D Frame Calculator - Constants & Data Model
 * Coordinate System: x to the right (horizontal ->), z to the up (vertical ^)
 * Symbols: N for Normal Force, T for Shear Force, M for Bending Moment
 * Simplified for Bachelor students: EJ = 1 (default flexural rigidity), EA = 10000 (hidden rigid axial behavior).
 */

export const DEFAULT_EA = 10000.0; // Axially stiff approximation for bachelor level
export const DEFAULT_EJ = 1.0;

// Standard Portal Frame Benchmark:
// Columns: N1(0,0) -> N2(0,4), N3(6,4) -> N4(6,0) (4m tall, 6m span)
// Supports at ground: N1 pin at (0,0), N4 pin at (6,0)
// Beam: N2(0,4) -> N3(6,4)
// Uniform vertical gravity load qz = -10 kN/m (downwards) on beam E2
export const DEFAULT_FRAME = {
  nodes: [
    { id: 'N1', x: 0.0, z: 0.0, support: 'pin' },     // Left base at ground (z=0)
    { id: 'N2', x: 0.0, z: 4.0, support: 'none' },    // Top left corner (z=4)
    { id: 'N3', x: 6.0, z: 4.0, support: 'none' },    // Top right corner (z=4)
    { id: 'N4', x: 6.0, z: 0.0, support: 'pin' }      // Right base at ground (z=0)
  ],
  elements: [
    { id: 'E1', nodeI: 'N1', nodeJ: 'N2', EJ: 1.0, hingeI: false, hingeJ: false }, // Left column
    { id: 'E2', nodeI: 'N2', nodeJ: 'N3', EJ: 1.0, hingeI: false, hingeJ: false }, // Top girder
    { id: 'E3', nodeI: 'N3', nodeJ: 'N4', EJ: 1.0, hingeI: false, hingeJ: false }  // Right column
  ],
  nodalLoads: [],
  distLoads: [
    { id: 'D1', elementId: 'E2', qx: 0.0, qz: -10.0, q1: 10.0, q2: 10.0, mode: 'proj_z' } // Downward vertical load qz = -10 kN/m
  ],
  currentView: 'reactions' // 'reactions', 'normal', 'shear', 'moment'
};

export const VIEW_MODES = {
  REACTIONS: 'reactions',
  NORMAL: 'normal',
  SHEAR: 'shear',
  MOMENT: 'moment'
};

export const SUPPORT_TYPES = {
  NONE: 'none',
  PIN: 'pin',
  ROLLER_X: 'roller_x', // Roller free in X, fixed in Z
  ROLLER_Z: 'roller_z', // Roller free in Z, fixed in X
  FIXED: 'fixed'
};
