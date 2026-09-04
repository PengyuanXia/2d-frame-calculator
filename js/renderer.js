/**
 * 2D Frame Calculator - Interactive Canvas Renderer
 * Coordinate System: x to the right, z to the down.
 * Notation: N (Normal force), T (Shear force), M (Bending moment, drawn on tension fiber).
 * Sign convention: Inside frame is negative for N and T; M is drawn on tension fiber.
 */

import { TRANSLATIONS } from './i18n.js';

function formatNum(val, maxDec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 1e-9) return '0';
  const factor = Math.pow(10, maxDec);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toString();
}

export class FrameRenderer {
  constructor(canvasElement, tooltipElement, onCursorMove) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tooltip = tooltipElement;
    this.onCursorMove = onCursorMove;

    this.frameData = null;
    this.solution = null;
    this.viewMode = 'reactions'; // 'reactions', 'normal', 'shear', 'moment', 'all'
    this.cursorPos = null;
    this.lang = 'en';

    this.padding = { left: 110, right: 110, top: 85, bottom: 85 };
    this.transform = { scale: 40, offsetX: 100, offsetY: 100 };

    // Zoom & Pan state
    this.zoomFactor = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialPanX = 0;
    this.initialPanY = 0;
    this.isAutoSplitNodesEnabled = true;
    this.showNodeLabels = true;
    this.showElemLabels = true;

    this.setupListeners();
  }

  setLanguage(lang) {
    this.lang = lang;
    this.draw();
  }

  setAutoSplitEnabled(enabled) {
    this.isAutoSplitNodesEnabled = !!enabled;
    if (!this.isAutoSplitNodesEnabled) {
      this.drawElemHoverSnap = null;
    }
    this.draw();
  }

  setShowNodeLabels(show) {
    this.showNodeLabels = !!show;
    this.draw();
  }

  setShowElemLabels(show) {
    this.showElemLabels = !!show;
    this.draw();
  }

  setShowLabels(show) {
    this.showNodeLabels = !!show;
    this.showElemLabels = !!show;
    this.draw();
  }

  get t() {
    return TRANSLATIONS[this.lang] || TRANSLATIONS.en;
  }

  zoomIn() {
    this.zoomFactor = Math.min(5.0, this.zoomFactor * 1.25);
    this.draw();
  }

  zoomOut() {
    this.zoomFactor = Math.max(0.2, this.zoomFactor / 1.25);
    this.draw();
  }

  resetZoom() {
    this.zoomFactor = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform(true);
    this.draw();
  }

  setDrawNodeMode(enabled, onNodePlaced) {
    this.isDrawNodeMode = enabled;
    this.onNodePlaced = onNodePlaced;
    this.drawNodePreview = null;
    if (enabled) {
      this.setDrawElementMode(false, null); // Deactivate element mode
    }
    this.canvas.style.cursor = enabled ? 'crosshair' : (this.isDrawElementMode ? 'pointer' : 'default');
    if (!this.transform) {
      this.updateTransform();
    }
    this.draw();
  }

  setDrawElementMode(enabled, onElementCreated, onMemberSplit) {
    this.isDrawElementMode = enabled;
    this.onElementCreated = onElementCreated;
    this.onMemberSplit = onMemberSplit || null;
    this.drawElemStartNodeId = null;
    this.drawElemMousePx = null;
    this.drawElemHoverNodeId = null;
    this.drawElemHoverSnap = null;
    if (enabled) {
      this.isDrawNodeMode = false;
      this.onNodePlaced = null;
      this.drawNodePreview = null;
    }
    this.canvas.style.cursor = enabled ? 'pointer' : (this.isDrawNodeMode ? 'crosshair' : 'default');
    if (!this.transform) {
      this.updateTransform();
    }
    this.draw();
  }

  findNodeAtPixel(px, py) {
    if (!this.frameData || !this.frameData.nodes) return null;
    const hitRadius = 24; // Generous 24px hit radius
    for (const node of this.frameData.nodes) {
      const p = this.worldToPixel(Number(node.x) || 0, Number(node.z) || 0);
      const dist = Math.hypot(px - p.px, py - p.py);
      if (dist < hitRadius) return node;
    }
    return null;
  }

  /**
   * Find the closest point on any existing member near (pixelX, pixelY).
   * Applies axis-alignment snap preferences with nearby nodes, then grid snap.
   * Works directly from frameData.elements (no solution required).
   * Returns { elementId, x, z, snapType, alignedNodeId } or null.
   */
  findSnapPointOnMember(pixelX, pixelY) {
    if (!this.isAutoSplitNodesEnabled) return null;
    if (!this.frameData || !this.frameData.elements || !this.frameData.nodes) return null;

    const worldPos = this.pixelToWorld(pixelX, pixelY);
    const worldX = worldPos.x;
    const worldZ = worldPos.z;

    // Build node lookup map
    const nodeMap = new Map();
    for (const n of this.frameData.nodes) {
      nodeMap.set(n.id, { x: Number(n.x) || 0, z: Number(n.z) || 0 });
    }

    // Hit threshold in world units (0.5m scaled by zoom — tighter when zoomed in)
    const hitThreshold = 0.5 / Math.max(this.zoomFactor, 0.5);

    let bestDist = Infinity;
    let bestProjection = null;

    for (const elem of this.frameData.elements) {
      const nI = nodeMap.get(elem.nodeI);
      const nJ = nodeMap.get(elem.nodeJ);
      if (!nI || !nJ) continue;

      const dx = nJ.x - nI.x;
      const dz = nJ.z - nI.z;
      const L = Math.hypot(dx, dz);
      if (L < 1e-6) continue;

      // Project click onto segment
      const t = ((worldX - nI.x) * dx + (worldZ - nI.z) * dz) / (L * L);
      // Exclude endpoints (t near 0 or 1) — those are existing nodes
      if (t < 0.02 || t > 0.98) continue;

      const projX = nI.x + t * dx;
      const projZ = nI.z + t * dz;
      const dist = Math.hypot(worldX - projX, worldZ - projZ);

      if (dist < bestDist && dist < hitThreshold) {
        bestDist = dist;
        bestProjection = {
          elementId: elem.id,
          element: elem,
          rawX: projX,
          rawZ: projZ,
          t: t,
          nI: nI,
          nJ: nJ,
          dx: dx,
          dz: dz,
          L: L
        };
      }
    }

    if (!bestProjection) return null;

    const { elementId, element, rawX, rawZ, nI, nJ, dx, dz, L } = bestProjection;
    const ALIGN_THRESHOLD = 0.25; // 0.25m tolerance for axis alignment

    // Try axis-aligned snap with all existing nodes
    let snapX = rawX, snapZ = rawZ;
    let snapType = 'raw';
    let alignedNodeId = null;

    // Collect all nodes sorted by distance to the projected point
    const allNodes = this.frameData.nodes
      .map(n => ({ id: n.id, x: Number(n.x) || 0, z: Number(n.z) || 0 }))
      .filter(n => !(n.id === element.nodeI || n.id === element.nodeJ))
      .sort((a, b) => Math.hypot(a.x - rawX, a.z - rawZ) - Math.hypot(b.x - rawX, b.z - rawZ));

    // Priority 1: Vertical alignment (same x as a nearby node)
    for (const n of allNodes) {
      if (Math.abs(n.x - rawX) < ALIGN_THRESHOLD) {
        // Re-project x=n.x onto the member segment to find z
        // Parametric: point = nI + t*(nJ - nI), solve for t where x = n.x
        if (Math.abs(dx) > 1e-6) {
          const tSnap = (n.x - nI.x) / dx;
          if (tSnap > 0.01 && tSnap < 0.99) {
            snapX = n.x;
            snapZ = nI.z + tSnap * dz;
            snapType = 'vertical';
            alignedNodeId = n.id;
            break;
          }
        }
      }
    }

    // Priority 2: Horizontal alignment (same z as a nearby node)
    if (snapType === 'raw') {
      for (const n of allNodes) {
        if (Math.abs(n.z - rawZ) < ALIGN_THRESHOLD) {
          if (Math.abs(dz) > 1e-6) {
            const tSnap = (n.z - nI.z) / dz;
            if (tSnap > 0.01 && tSnap < 0.99) {
              snapX = nI.x + tSnap * dx;
              snapZ = n.z;
              snapType = 'horizontal';
              alignedNodeId = n.id;
              break;
            }
          }
        }
      }
    }

    // Priority 3: Grid snap (0.5m)
    if (snapType === 'raw') {
      const gridX = Math.round(rawX * 2) / 2;
      const gridZ = Math.round(rawZ * 2) / 2;

      // Re-project grid-snapped point back onto member
      const tGrid = ((gridX - nI.x) * dx + (gridZ - nI.z) * dz) / (L * L);
      if (tGrid > 0.01 && tGrid < 0.99) {
        const memberGridX = nI.x + tGrid * dx;
        const memberGridZ = nI.z + tGrid * dz;
        // Only use grid snap if the re-projected point is close to the grid point
        if (Math.hypot(memberGridX - gridX, memberGridZ - gridZ) < 0.3) {
          snapX = memberGridX;
          snapZ = memberGridZ;
          snapType = 'grid';
        }
      }
    }

    // Round final coordinates to avoid floating point noise
    snapX = Math.round(snapX * 1000) / 1000;
    snapZ = Math.round(snapZ * 1000) / 1000;

    return {
      elementId,
      element,
      x: snapX,
      z: snapZ,
      snapType,      // 'vertical' | 'horizontal' | 'grid' | 'raw'
      alignedNodeId  // node ID that caused vertical/horizontal alignment, or null
    };
  }

  setupListeners() {
    let lastActionTimestamp = 0;

    const handleCanvasAction = (clientX, clientY) => {
      const now = Date.now();
      if (now - lastActionTimestamp < 120) return; // Prevent double trigger
      lastActionTimestamp = now;

      const rect = this.canvas.getBoundingClientRect();
      const pixelX = clientX - rect.left;
      const pixelY = clientY - rect.top;

      // 1. Draw Element Mode: click on existing nodes OR snap to member
      if (this.isDrawElementMode && this.onElementCreated) {
        const hitNode = this.findNodeAtPixel(pixelX, pixelY) ||
          (this.drawElemHoverNodeId ? (this.frameData.nodes || []).find(n => n.id === this.drawElemHoverNodeId) : null);

        if (hitNode) {
          // Clicked on an existing node
          if (!this.drawElemStartNodeId) {
            this.drawElemStartNodeId = hitNode.id;
            this.draw();
          } else if (hitNode.id === this.drawElemStartNodeId) {
            this.drawElemStartNodeId = null;
            this.draw();
          } else {
            this.onElementCreated(this.drawElemStartNodeId, hitNode.id);
            this.drawElemStartNodeId = hitNode.id;
            this.draw();
          }
          return;
        }

        // No node hit — try snapping to a member and splitting it
        if (this.onMemberSplit) {
          const snap = this.findSnapPointOnMember(pixelX, pixelY);
          if (snap) {
            const newNodeId = this.onMemberSplit(snap.elementId, snap.x, snap.z);
            if (newNodeId) {
              if (!this.drawElemStartNodeId) {
                // No chain active — use the new node as start
                this.drawElemStartNodeId = newNodeId;
              } else {
                // Chain active — create element to new node and continue chain
                this.onElementCreated(this.drawElemStartNodeId, newNodeId);
                this.drawElemStartNodeId = newNodeId;
              }
              this.drawElemHoverSnap = null;
              this.draw();
            }
            return;
          }
        }
        return;
      }

      // 2. Draw Node Mode: click on canvas to place node
      if (this.isDrawNodeMode && this.onNodePlaced) {
        const worldPos = this.pixelToWorld(pixelX, pixelY);
        const snapX = Math.round(worldPos.x * 2) / 2;
        const snapZ = Math.round(worldPos.z * 2) / 2;
        this.onNodePlaced(snapX, snapZ);
        return;
      }
    };

    this.canvas.addEventListener('mousedown', (e) => {
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      if (e.button === 0 || e.button === 1) {
        // If in draw mode, do not initiate pan dragging
        if (this.isDrawNodeMode || this.isDrawElementMode) return;

        this.isDragging = true;
        this.initialPanX = this.panX;
        this.initialPanY = this.panY;
      }
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = this.isDrawNodeMode ? 'crosshair' : (this.isDrawElementMode ? 'pointer' : 'default');
      }
    });

    // Right-click cancels the active element connection chain
    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.isDrawElementMode && this.drawElemStartNodeId) {
        e.preventDefault();
        this.drawElemStartNodeId = null;
        this.draw();
      }
    });

    // Pointerup handler (ensures reliable trigger even if mouse moved slightly during click)
    this.canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      if (this.isDrawNodeMode || this.isDrawElementMode) {
        const moveDist = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
        if (moveDist < 12) {
          handleCanvasAction(e.clientX, e.clientY);
        }
      }
    });

    // Standard click handler fallback
    this.canvas.addEventListener('click', (e) => {
      if (this.isDrawNodeMode || this.isDrawElementMode) {
        handleCanvasAction(e.clientX, e.clientY);
        return;
      }

      // Normal Mode: ignore click if user dragged the canvas
      const moveDist = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
      if (moveDist > 6) return;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomSpeed = 0.0015;
      const delta = -e.deltaY * zoomSpeed;
      const oldZoom = this.zoomFactor;
      const newZoom = Math.max(0.2, Math.min(5.0, oldZoom * (1 + delta)));

      const factor = newZoom / oldZoom;
      this.panX = mouseX - factor * (mouseX - this.panX);
      this.panY = mouseY - factor * (mouseY - this.panY);
      this.zoomFactor = newZoom;

      this.draw();
    }, { passive: false });

    // ----------------------------------------------------
    // Touch & Pinch-to-Zoom Gesture Handlers for Tablets
    // ----------------------------------------------------
    let touchMode = 'none'; // 'none', 'single', 'pinch'
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let touchInitialPinchDist = 0;
    let touchInitialPinchZoom = 1.0;
    let touchInitialMidX = 0;
    let touchInitialMidY = 0;
    let touchInitialPanX = 0;
    let touchInitialPanY = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      const rect = this.canvas.getBoundingClientRect();

      if (e.touches.length === 2) {
        // Two fingers: Pinch-to-zoom & two-finger pan
        touchMode = 'pinch';
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const x1 = t1.clientX - rect.left;
        const y1 = t1.clientY - rect.top;
        const x2 = t2.clientX - rect.left;
        const y2 = t2.clientY - rect.top;

        touchInitialPinchDist = Math.hypot(x2 - x1, y2 - y1) || 1;
        touchInitialPinchZoom = this.zoomFactor;
        touchInitialMidX = (x1 + x2) / 2;
        touchInitialMidY = (y1 + y2) / 2;
        touchInitialPanX = this.panX;
        touchInitialPanY = this.panY;
        this.hideTooltip();
        e.preventDefault();
      } else if (e.touches.length === 1) {
        // One finger
        touchMode = 'single';
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        touchStartPanX = this.panX;
        touchStartPanY = this.panY;

        const pixelX = touch.clientX - rect.left;
        const pixelY = touch.clientY - rect.top;

        if (this.isDrawNodeMode) {
          const worldPos = this.pixelToWorld(pixelX, pixelY);
          const snapX = Math.round(worldPos.x * 2) / 2;
          const snapZ = Math.round(worldPos.z * 2) / 2;
          const pSnap = this.worldToPixel(snapX, snapZ);
          this.drawNodePreview = { x: snapX, z: snapZ, px: pSnap.px, py: pSnap.py };
          this.hideTooltip();
          this.draw();
          e.preventDefault();
        } else if (this.isDrawElementMode) {
          const hitNode = this.findNodeAtPixel(pixelX, pixelY);
          this.drawElemHoverNodeId = hitNode ? hitNode.id : null;
          this.drawElemMousePx = { px: pixelX, py: pixelY };
          if (!hitNode && this.onMemberSplit) {
            this.drawElemHoverSnap = this.findSnapPointOnMember(pixelX, pixelY);
          } else {
            this.drawElemHoverSnap = null;
          }
          this.hideTooltip();
          this.draw();
          e.preventDefault();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      const rect = this.canvas.getBoundingClientRect();

      if (e.touches.length === 2 && touchMode === 'pinch') {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const x1 = t1.clientX - rect.left;
        const y1 = t1.clientY - rect.top;
        const x2 = t2.clientX - rect.left;
        const y2 = t2.clientY - rect.top;

        const currentDist = Math.hypot(x2 - x1, y2 - y1) || 1;
        const currentMidX = (x1 + x2) / 2;
        const currentMidY = (y1 + y2) / 2;

        const scaleRatio = currentDist / touchInitialPinchDist;
        const newZoom = Math.max(0.2, Math.min(5.0, touchInitialPinchZoom * scaleRatio));

        const factor = newZoom / touchInitialPinchZoom;
        const basePanX = touchInitialMidX - factor * (touchInitialMidX - touchInitialPanX);
        const basePanY = touchInitialMidY - factor * (touchInitialMidY - touchInitialPanY);

        this.panX = basePanX + (currentMidX - touchInitialMidX);
        this.panY = basePanY + (currentMidY - touchInitialMidY);
        this.zoomFactor = newZoom;

        this.draw();
        return;
      }

      if (e.touches.length === 1 && touchMode === 'single') {
        const touch = e.touches[0];
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        const pixelX = touch.clientX - rect.left;
        const pixelY = touch.clientY - rect.top;

        if (this.isDrawNodeMode) {
          e.preventDefault();
          const worldPos = this.pixelToWorld(pixelX, pixelY);
          const snapX = Math.round(worldPos.x * 2) / 2;
          const snapZ = Math.round(worldPos.z * 2) / 2;
          const pSnap = this.worldToPixel(snapX, snapZ);
          this.drawNodePreview = { x: snapX, z: snapZ, px: pSnap.px, py: pSnap.py };
          this.draw();
          return;
        }

        if (this.isDrawElementMode) {
          e.preventDefault();
          const hitNode = this.findNodeAtPixel(pixelX, pixelY);
          this.drawElemHoverNodeId = hitNode ? hitNode.id : null;
          this.drawElemMousePx = { px: pixelX, py: pixelY };
          this.draw();
          return;
        }

        // Normal mode: 1 finger pan drag
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        if (Math.hypot(dx, dy) > 5) {
          e.preventDefault();
          this.panX = touchStartPanX + dx;
          this.panY = touchStartPanY + dy;
          this.draw();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (touchMode === 'pinch') {
        if (e.touches.length < 2) {
          touchMode = 'none';
        }
        return;
      }

      if (touchMode === 'single' && e.touches.length === 0) {
        touchMode = 'none';
        const dist = Math.hypot(lastTouchX - touchStartX, lastTouchY - touchStartY);
        if (this.isDrawNodeMode || this.isDrawElementMode) {
          if (dist < 20) {
            handleCanvasAction(lastTouchX, lastTouchY);
          }
        }
      }
    });

    this.canvas.addEventListener('touchcancel', () => {
      touchMode = 'none';
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;

      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.panX = this.initialPanX + dx;
        this.panY = this.initialPanY + dy;
        this.draw();
        return;
      }

      // Draw Element Mode: track hover node, snap-on-member & rubber-band endpoint
      if (this.isDrawElementMode) {
        const hitNode = this.findNodeAtPixel(pixelX, pixelY);
        this.drawElemHoverNodeId = hitNode ? hitNode.id : null;
        this.drawElemMousePx = { px: pixelX, py: pixelY };

        // If no node hit, check for snap-on-member
        if (!hitNode && this.onMemberSplit) {
          this.drawElemHoverSnap = this.findSnapPointOnMember(pixelX, pixelY);
        } else {
          this.drawElemHoverSnap = null;
        }

        this.canvas.style.cursor = hitNode ? 'pointer' : (this.drawElemHoverSnap ? 'pointer' : 'crosshair');
        this.hideTooltip();
        this.draw();
        return;
      }

      if (this.isDrawNodeMode) {
        const worldPos = this.pixelToWorld(pixelX, pixelY);
        const snapX = Math.round(worldPos.x * 2) / 2;
        const snapZ = Math.round(worldPos.z * 2) / 2;
        const pSnap = this.worldToPixel(snapX, snapZ);
        this.drawNodePreview = { x: snapX, z: snapZ, px: pSnap.px, py: pSnap.py };
        this.hideTooltip();
        this.draw();
        return;
      }

      if (!this.frameData || !this.solution) return;

      const worldPos = this.pixelToWorld(pixelX, pixelY);
      const hoverInfo = this.findClosestPointOnFrame(worldPos.x, worldPos.z);

      if (hoverInfo && hoverInfo.distanceWorld < (0.6 / this.zoomFactor)) {
        this.cursorPos = hoverInfo;
        this.updateTooltip(e.clientX, e.clientY, hoverInfo);
        if (this.onCursorMove) {
          this.onCursorMove(hoverInfo);
        }
      } else {
        this.cursorPos = null;
        this.hideTooltip();
        if (this.onCursorMove) {
          this.onCursorMove(null);
        }
      }
      this.draw();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.cursorPos = null;
      this.drawNodePreview = null;
      this.drawElemHoverNodeId = null;
      this.drawElemHoverSnap = null;
      this.drawElemMousePx = null;
      this.hideTooltip();
      this.draw();
      if (this.onCursorMove) {
        this.onCursorMove(null);
      }
    });

    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  setData(frameData, solution, viewMode) {
    this.frameData = frameData;
    this.solution = solution;
    if (viewMode) this.viewMode = viewMode;
    this.updateTransform();
    this.draw();
  }

  updateTransform(forceAutoFit = false) {
    if (!this.width || !this.height) this.resize();

    // In any Draw Mode, keep the current scale and viewport completely stable
    if ((this.isDrawNodeMode || this.isDrawElementMode) && this.transform && !forceAutoFit) {
      return;
    }

    if (!this.frameData || !this.frameData.nodes || this.frameData.nodes.length === 0) {
      // Default CAD canvas transform for blank / drawing state
      const scale = 50;
      const offsetX = this.width / 2;
      const offsetY = this.height * 0.72;
      this.transform = { scale, offsetX, offsetY, minX: -10, maxX: 10, minZ: -2, maxZ: 10, spanX: 20, spanZ: 12 };
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    this.frameData.nodes.forEach(n => {
      const x = Number(n.x) || 0;
      const z = Number(n.z) || 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    });

    const rawSpanX = maxX - minX;
    const rawSpanZ = maxZ - minZ;

    // Use minimum virtual span (0.8m) if structure is a single column/beam so we don't divide by zero
    const spanX = Math.max(rawSpanX, 0.8);
    const spanZ = Math.max(rawSpanZ, 0.8);

    const availW = Math.max(50, this.width - this.padding.left - this.padding.right);
    const availH = Math.max(50, this.height - this.padding.top - this.padding.bottom);

    // Calculate fit scale so structure comfortably fills ~78% of canvas with breathing room for annotations
    let fitScale = Math.min(availW / spanX, availH / spanZ) * 0.78;

    // Cap scale between reasonable bounds: at least 15 px/m for massive frames, at most 260 px/m for compact 1m frames
    const scale = Math.max(15, Math.min(fitScale, 260));

    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;

    const offsetX = this.width / 2 - midX * scale;
    const offsetY = this.height / 2 + midZ * scale;

    this.transform = { scale, offsetX, offsetY, minX, maxX, minZ, maxZ, spanX, spanZ };
  }

  worldToPixel(x, z) {
    const basePx = x * this.transform.scale + this.transform.offsetX;
    const basePy = this.transform.offsetY - z * this.transform.scale;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    return {
      px: centerX + (basePx - centerX) * this.zoomFactor + this.panX,
      py: centerY + (basePy - centerY) * this.zoomFactor + this.panY
    };
  }

  pixelToWorld(px, py) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const unzoomedPx = (px - this.panX - centerX) / this.zoomFactor + centerX;
    const unzoomedPy = (py - this.panY - centerY) / this.zoomFactor + centerY;
    return {
      x: (unzoomedPx - this.transform.offsetX) / this.transform.scale,
      z: (this.transform.offsetY - unzoomedPy) / this.transform.scale
    };
  }

  findClosestPointOnFrame(worldX, worldZ) {
    if (!this.solution || !this.solution.elements || !this.solution.elements.length) return null;

    let bestDist = Infinity;
    let bestResult = null;

    for (const elem of this.solution.elements) {
      const x1 = elem.coordI.x;
      const z1 = elem.coordI.z;
      const x2 = elem.coordJ.x;
      const z2 = elem.coordJ.z;
      const L = elem.L;

      if (L < 1e-6) continue;

      // Project point (worldX, worldZ) onto segment (x1,z1) -> (x2,z2)
      const dx = x2 - x1;
      const dz = z2 - z1;
      const t = ((worldX - x1) * dx + (worldZ - z1) * dz) / (L * L);
      const clampedT = Math.max(0, Math.min(1, t));
      const s = clampedT * L;

      const projX = x1 + clampedT * dx;
      const projZ = z1 + clampedT * dz;
      const dist = Math.hypot(worldX - projX, worldZ - projZ);

      if (dist < bestDist) {
        bestDist = dist;

        // Interpolate or sample N, T, M at distance s
        const Ni = elem.endForces.i.N;
        const Ti = elem.endForces.i.T;
        const Mi = elem.endForces.i.M;

        // Check for distributed load on this element
        let qXi = 0, qZeta = 0;
        if (this.frameData.distLoads) {
          for (const dl of this.frameData.distLoads) {
            if (dl.elementId === elem.id) {
              const qx = Number(dl.qx) || 0;
              const qz = Number(dl.qz) || 0;
              qXi += qx * elem.cos + qz * elem.sin;
              qZeta += -qx * elem.sin + qz * elem.cos;
            }
          }
        }

        const N_val = -Ni - qXi * s;
        const T_val = Ti + qZeta * s;
        const M_val = Mi - Ti * s - 0.5 * qZeta * s * s;

        // Sample deflection w and axial u from element samples
        let w_val = 0;
        let u_val = 0;
        bestResult = {
          elementId: elem.id,
          elem,
          s,
          L,
          x: projX,
          z: projZ,
          N: N_val,
          T: T_val,
          M: M_val,
          distanceWorld: dist
        };
      }
    }

    return bestResult;
  }

  updateTooltip(clientX, clientY, hoverInfo) {
    if (!this.tooltip) return;

    const parentRect = this.canvas.getBoundingClientRect();
    const xPos = clientX - parentRect.left;
    const yPos = clientY - parentRect.top;

    const metricsHtml = `
      <div class="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[12.5px] mt-1 font-mono">
        <div><span class="text-blue-400 font-bold">N:</span> ${formatNum(hoverInfo.N)} kN</div>
        <div><span class="text-red-400 font-bold">T:</span> ${formatNum(hoverInfo.T)} kN</div>
        <div><span class="text-emerald-400 font-bold">M:</span> ${formatNum(hoverInfo.M)} kNm</div>
      </div>
    `;

    const content = `
      <div class="font-bold text-[13px] text-yellow-300 border-b border-slate-700 pb-1 mb-1 font-mono">
        ${hoverInfo.elementId} (s = ${formatNum(hoverInfo.s)} m / ${formatNum(hoverInfo.L)} m)
      </div>
      ${metricsHtml}
      <div class="text-[10.5px] text-slate-400 mt-1">
        pos: (${formatNum(hoverInfo.x)}, ${formatNum(hoverInfo.z)}) m
      </div>
    `;

    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${xPos}px`;
    this.tooltip.style.top = `${Math.max(45, yPos - 15)}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  draw() {
    if (!this.width || !this.height) this.resize();
    this.updateTransform();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const anyDrawMode = this.isDrawNodeMode || this.isDrawElementMode;

    // 1. Render CAD Grid background when any Draw Mode is active
    if (anyDrawMode) {
      this.drawGrid();
    }

    if (!this.frameData || !this.frameData.nodes || this.frameData.nodes.length === 0) {
      if (!anyDrawMode) {
        this.drawEmptyState();
      }
      if (this.isDrawNodeMode && this.drawNodePreview) {
        this.drawNodePlacementMarker(this.drawNodePreview);
      }
      return;
    }

    const hasSupports = (this.frameData.nodes || []).some(n => n.support && n.support !== 'none');
    const hasElements = (this.frameData.elements || []).length > 0;

    if (!this.solution || !this.solution.isStable) {
      this.drawStructure(1.0);
      // Only show unstable warning when elements and supports exist but form an unstable mechanism, and not in draw mode
      if (!anyDrawMode && hasSupports && hasElements) {
        this.drawUnstableWarningBanner();
      }
      if (this.isDrawNodeMode && this.drawNodePreview) {
        this.drawNodePlacementMarker(this.drawNodePreview);
      }
      if (this.isDrawElementMode) {
        this.drawElementModeOverlay();
      }
      return;
    }

    // View Routing
    this.drawSingleDiagramView(this.viewMode || 'reactions');

    // Crosshair at hovered cursor position
    if (this.cursorPos && !anyDrawMode) {
      this.drawCursorMarker(this.cursorPos);
    }

    // Live Draw Node Placement Marker
    if (this.isDrawNodeMode && this.drawNodePreview) {
      this.drawNodePlacementMarker(this.drawNodePreview);
    }

    // Draw Element Mode Overlay (node highlights + rubber-band line)
    if (this.isDrawElementMode) {
      this.drawElementModeOverlay();
    }
  }

  exportPNG(type = 'current') {
    const canvas = this.canvas;
    if (type === 'unsolved') {
      const origSolution = this.solution;
      const origView = this.viewMode;
      const origDrawNodeMode = this.isDrawNodeMode;
      const origDrawElemMode = this.isDrawElementMode;

      this.isDrawNodeMode = false;
      this.isDrawElementMode = false;

      // Render clean structure and loads only without reaction badges or N,T,M diagrams
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawStructure(1.0, true);

      const dataUrl = canvas.toDataURL('image/png');

      // Restore original state and redraw
      this.solution = origSolution;
      this.viewMode = origView;
      this.isDrawNodeMode = origDrawNodeMode;
      this.isDrawElementMode = origDrawElemMode;
      this.draw();

      return dataUrl;
    } else {
      this.draw();
      return canvas.toDataURL('image/png');
    }
  }

  drawElementModeOverlay() {
    if (!this.frameData || !this.frameData.nodes) return;
    const ctx = this.ctx;
    ctx.save();

    const nodes = this.frameData.nodes;

    // Draw all nodes as selectable targets
    for (const node of nodes) {
      const p = this.worldToPixel(Number(node.x) || 0, Number(node.z) || 0);
      const isStart = (node.id === this.drawElemStartNodeId);
      const isHover = (node.id === this.drawElemHoverNodeId);

      // Outer halo for selectable targets
      if (isHover || isStart) {
        ctx.beginPath();
        ctx.arc(p.px, p.py, 14, 0, Math.PI * 2);
        ctx.fillStyle = isStart ? 'rgba(37, 99, 235, 0.18)' : 'rgba(34, 197, 94, 0.15)';
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(p.px, p.py, isStart ? 8 : (isHover ? 7 : 5.5), 0, Math.PI * 2);
      ctx.fillStyle = isStart ? '#2563eb' : (isHover ? '#22c55e' : '#64748b');
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node label
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isStart ? '#1d4ed8' : '#334155';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(node.id, p.px, p.py - 12);
    }

    // Snap-on-member indicator (orange dot + alignment line + coordinate badge)
    let snapPx = null;
    if (this.drawElemHoverSnap && !this.drawElemHoverNodeId) {
      const snap = this.drawElemHoverSnap;
      const pSnap = this.worldToPixel(snap.x, snap.z);
      snapPx = pSnap;

      // Orange halo
      ctx.beginPath();
      ctx.arc(pSnap.px, pSnap.py, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
      ctx.fill();

      // Orange snap circle
      ctx.beginPath();
      ctx.arc(pSnap.px, pSnap.py, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dashed alignment line to the aligned node
      if (snap.alignedNodeId && (snap.snapType === 'vertical' || snap.snapType === 'horizontal')) {
        const alignedNode = nodes.find(n => n.id === snap.alignedNodeId);
        if (alignedNode) {
          const pAligned = this.worldToPixel(Number(alignedNode.x) || 0, Number(alignedNode.z) || 0);
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pSnap.px, pSnap.py);
          ctx.lineTo(pAligned.px, pAligned.py);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Coordinate badge
      const coordText = `(${snap.x.toFixed(1)}, ${snap.z.toFixed(1)})`;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      const textW = ctx.measureText(coordText).width;
      const badgeX = pSnap.px - textW / 2 - 5;
      const badgeY = pSnap.py + 14;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.9)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, textW + 10, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(coordText, pSnap.px, badgeY + 3);

      // Snap type indicator (small text above)
      const snapLabel = snap.snapType === 'vertical' ? '┃ vertical'
        : snap.snapType === 'horizontal' ? '━ horizontal'
        : snap.snapType === 'grid' ? '# grid' : '';
      if (snapLabel) {
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(snapLabel, pSnap.px, pSnap.py - 18);
      }
    }

    // Rubber-band line from start node to current mouse position or snap point
    if (this.drawElemStartNodeId && this.drawElemMousePx) {
      const startNode = nodes.find(n => n.id === this.drawElemStartNodeId);
      if (startNode) {
        const pStart = this.worldToPixel(Number(startNode.x) || 0, Number(startNode.z) || 0);

        // Determine endpoint: prefer snap point, then hover node, then raw mouse
        let endPx, endPy;
        let lineColor;
        if (this.drawElemHoverNodeId) {
          endPx = this.drawElemMousePx.px;
          endPy = this.drawElemMousePx.py;
          lineColor = '#22c55e';
        } else if (snapPx) {
          endPx = snapPx.px;
          endPy = snapPx.py;
          lineColor = '#f97316';
        } else {
          endPx = this.drawElemMousePx.px;
          endPy = this.drawElemMousePx.py;
          lineColor = '#3b82f6';
        }

        // Dashed rubber-band line
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(pStart.px, pStart.py);
        ctx.lineTo(endPx, endPy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Instruction banner
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 12.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let msg;
    if (this.drawElemStartNodeId) {
      msg = this.lang === 'pl'
        ? `Kliknij węzeł lub pręt (od ${this.drawElemStartNodeId}) • Esc aby zakończyć`
        : `Click node or member (from ${this.drawElemStartNodeId}) • Esc to end chain`;
    } else {
      msg = this.lang === 'pl'
        ? '① Kliknij węzeł lub pręt STARTOWY'
        : '① Click START node or member to begin';
    }
    ctx.fillText('🔗 ' + msg, this.width / 2, 48);

    ctx.restore();
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.save();

    // Visible world coordinate bounds
    const pTopLeft = this.pixelToWorld(0, 0);
    const pBottomRight = this.pixelToWorld(this.width, this.height);

    const minX = Math.floor(Math.min(pTopLeft.x, pBottomRight.x) - 2);
    const maxX = Math.ceil(Math.max(pTopLeft.x, pBottomRight.x) + 2);
    const minZ = Math.floor(Math.min(pTopLeft.z, pBottomRight.z) - 2);
    const maxZ = Math.ceil(Math.max(pTopLeft.z, pBottomRight.z) + 2);

    // 1. Minor grid lines (0.5m interval)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);

    for (let x = minX; x <= maxX; x += 0.5) {
      if (Math.abs(Math.round(x) - x) > 1e-4) {
        const p1 = this.worldToPixel(x, minZ);
        const p2 = this.worldToPixel(x, maxZ);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }
    }

    for (let z = minZ; z <= maxZ; z += 0.5) {
      if (Math.abs(Math.round(z) - z) > 1e-4) {
        const p1 = this.worldToPixel(minX, z);
        const p2 = this.worldToPixel(maxX, z);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }
    }

    // 2. Major grid lines (1.0m interval)
    ctx.setLineDash([]);
    ctx.font = '10.5px "JetBrains Mono", monospace';

    for (let x = minX; x <= maxX; x += 1.0) {
      const isZero = Math.abs(x) < 1e-4;
      const p1 = this.worldToPixel(x, minZ);
      const p2 = this.worldToPixel(x, maxZ);

      ctx.strokeStyle = isZero ? '#64748b' : '#cbd5e1';
      ctx.lineWidth = isZero ? 1.8 : 1.0;

      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();

      // Axis coordinate number along ground line z = 0
      const pZero = this.worldToPixel(x, 0);
      const labelY = Math.min(Math.max(pZero.py + 14, 25), this.height - 35);
      ctx.fillStyle = isZero ? '#0f172a' : '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${formatNum(x)}m`, p1.px, labelY);
    }

    for (let z = minZ; z <= maxZ; z += 1.0) {
      const isZero = Math.abs(z) < 1e-4;
      const p1 = this.worldToPixel(minX, z);
      const p2 = this.worldToPixel(maxX, z);

      ctx.strokeStyle = isZero ? '#64748b' : '#cbd5e1';
      ctx.lineWidth = isZero ? 1.8 : 1.0;

      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();

      // Axis coordinate number along vertical axis x = 0
      const pZero = this.worldToPixel(0, z);
      const labelX = Math.min(Math.max(pZero.px - 8, 35), this.width - 35);
      ctx.fillStyle = isZero ? '#0f172a' : '#64748b';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`z=${formatNum(z)}m`, labelX, p1.py);
    }

    // Top Header Banner for Draw Node Mode
    if (this.isDrawNodeMode) {
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 12.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('📐 ' + (this.lang === 'pl' ? 'TRYB RYSOWANIA WĘZŁÓW (Siatka 0.5m) — Kliknij na płótnie, aby wstawić węzeł' : 'DRAW NODE MODE (0.5m Snap Grid) — Click anywhere on canvas to place nodes'), this.width / 2, 48);
    }

    ctx.restore();
  }

  drawNodePlacementMarker(preview) {
    const ctx = this.ctx;
    const { x, z, px, py } = preview;

    ctx.save();
    // 1. Snapped Node Indicator Ring & Crosshair
    ctx.strokeStyle = '#2563eb';
    ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    ctx.arc(px, py, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px - 14, py);
    ctx.lineTo(px + 14, py);
    ctx.moveTo(px, py - 14);
    ctx.lineTo(px, py + 14);
    ctx.stroke();

    // 2. Floating Coordinate Pill Tag
    const tagText = `(x: ${formatNum(x)}m, z: ${formatNum(z)}m)`;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    const metrics = ctx.measureText(tagText);
    const boxW = metrics.width + 12;
    const boxH = 20;
    const tagX = px + 14;
    const tagY = py - boxH - 6;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(tagX, tagY, boxW, boxH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(tagX, tagY, boxW, boxH);

    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, tagX + 6, tagY + boxH / 2);

    ctx.restore();
  }

  drawEmptyState() {
    const ctx = this.ctx;
    ctx.save();

    const isPl = this.lang === 'pl';
    const title = isPl ? 'Własny projekt — Gotowy do projektowania' : 'Custom Design — Ready for Design';
    const step1 = isPl 
      ? '1. Kliknij „+ Dodaj węzeł” i następnie „Utwórz pręt”' 
      : '1. Click "+ Add Node" and click "Create Member" after that';
    const step2 = isPl 
      ? '2. Lub wybierz gotowy schemat z „Przykłady”' 
      : '2. Or select a benchmark preset from "Presets"';

    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.textAlign = 'center';

    // Title line
    ctx.font = 'bold 16px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('📐  ' + title, cx, cy - 20);

    // Step 1
    ctx.font = '500 13.5px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(step1, cx, cy + 10);

    // Step 2
    ctx.font = '500 13.5px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(step2, cx, cy + 34);

    ctx.restore();
  }

  drawUnstableWarningBanner() {
    const ctx = this.ctx;
    ctx.save();

    const titleText = `⚠ ${this.t.unstableBannerTitle || 'Structure is Geometrically Unstable'}`;
    ctx.font = 'bold 12.5px Inter, sans-serif';
    const textWidth = ctx.measureText(titleText).width;

    const boxW = Math.max(textWidth + 32, 260);
    const boxH = 34;
    const boxX = (this.width - boxW) / 2;
    const boxY = this.height - boxH - 18;

    // Clean pill background at bottom-center of canvas
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 17);
    ctx.fill();
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';

    // Pill title text
    ctx.fillStyle = '#b45309';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, this.width / 2, boxY + boxH / 2);

    ctx.restore();
  }

  drawSingleDiagramView(mode) {
    const ctx = this.ctx;

    // 1. Draw Diagrams or Reactions first (underneath structure loads and badges)
    let diagramTags = [];
    if (mode === 'reactions') {
      this.drawReactions();
    } else if (mode === 'normal') {
      diagramTags = this.drawInternalForceDiagram('N', '#2563eb', 'rgba(37, 99, 235, 0.22)', this.t.normalDiagramTitle);
    } else if (mode === 'shear') {
      diagramTags = this.drawInternalForceDiagram('T', '#dc2626', 'rgba(220, 38, 38, 0.22)', this.t.shearDiagramTitle);
    } else if (mode === 'moment') {
      diagramTags = this.drawInternalForceDiagram('M', '#059669', 'rgba(5, 150, 105, 0.25)', this.t.momentDiagramTitle);
    }

    // 2. Draw Structure Members, Supports, Hinges, Distributed Loads, and Nodal Loads
    // Rule: Hide external loads in N, T, M diagram views to avoid clutter; show them only in 'reactions' (Structure & Reactions) mode.
    const showLoads = (mode === 'reactions');
    this.drawStructure(1.0, showLoads);

    // If Truss Mode and viewing Shear or Moment, draw educational zero-state banner
    if (this.frameData && this.frameData.structureType === 'truss' && (mode === 'shear' || mode === 'moment')) {
      this.drawTrussZeroStateBanner(mode);
    }

    // 3. Draw Diagram Value Badges on the absolute TOP layer so they are NEVER shaded or cut through by any beam/arrow!
    if (diagramTags && diagramTags.length) {
      diagramTags.forEach(tag => {
        this.renderDiagramTag(ctx, tag);
      });
    }
  }

  drawTrussZeroStateBanner(mode) {
    const ctx = this.ctx;
    ctx.save();
    const isPl = this.lang === 'pl';
    const text = (mode === 'shear')
      ? (isPl ? 'ℹ️ W idealnej kratownicy płaskiej siły tnące są tożsamościowo równe zero: T(s) ≡ 0' : 'ℹ️ In an idealized 2D pin-jointed truss, shear forces are identically zero: T(s) ≡ 0')
      : (isPl ? 'ℹ️ W idealnej kratownicy płaskiej momenty zginające są tożsamościowo równe zero: M(s) ≡ 0' : 'ℹ️ In an idealized 2D pin-jointed truss, bending moments are identically zero: M(s) ≡ 0');

    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const metrics = ctx.measureText(text);
    const boxW = metrics.width + 28;
    const boxH = 28;
    const boxX = (this.width - boxW) / 2;
    const boxY = 60;

    ctx.fillStyle = 'rgba(248, 250, 252, 0.96)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.width / 2, boxY + boxH / 2);
    ctx.restore();
  }

  drawStructure(scale = 1.0, showLoads = true) {
    const ctx = this.ctx;
    const nodeMap = new Map();

    (this.frameData.nodes || []).forEach(n => {
      nodeMap.set(n.id, n);
    });

    ctx.save();

    // 1. Draw Members (Thick structural lines with cut gaps for hinges)
    const cutGap = 9.0 * scale;
    (this.frameData.elements || []).forEach(elem => {
      const nI = nodeMap.get(elem.nodeI);
      const nJ = nodeMap.get(elem.nodeJ);
      if (!nI || !nJ) return;

      const p1 = this.worldToPixel(nI.x, nI.z);
      const p2 = this.worldToPixel(nJ.x, nJ.z);
      const dx = p2.px - p1.px;
      const dy = p2.py - p1.py;
      const lenPx = Math.hypot(dx, dy) || 1;
      const ux = dx / lenPx;
      const uy = dy / lenPx;
      const nx = -uy;
      const ny = ux;

      // If hinged at nodeI, cut member slightly before nodeI
      const startPx = elem.hingeI ? p1.px + ux * cutGap : p1.px;
      const startPy = elem.hingeI ? p1.py + uy * cutGap : p1.py;

      // If hinged at nodeJ, cut member slightly before nodeJ
      const endPx = elem.hingeJ ? p2.px - ux * cutGap : p2.px;
      const endPy = elem.hingeJ ? p2.py - uy * cutGap : p2.py;

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 5.5 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startPx, startPy);
      ctx.lineTo(endPx, endPy);
      ctx.stroke();

      // Member ID & Length Tag at Midpoint (only when showElemLabels is true)
      if (this.showElemLabels) {
        const midX = (p1.px + p2.px) / 2;
        const midY = (p1.py + p2.py) / 2;
        const L_world = Math.hypot(nJ.x - nI.x, nJ.z - nI.z);

        const perpDist = 20 * scale;
        const tagX = midX + nx * perpDist;
        const tagY = midY + ny * perpDist;

        const tagText = `${elem.id} (${formatNum(L_world)}m)`;
        ctx.save();
        ctx.font = `bold ${11.5 * scale}px 'JetBrains Mono', monospace`;
        const metrics = ctx.measureText(tagText);
        const padX = 6 * scale;
        const boxW = metrics.width + padX * 2;
        const boxH = 17 * scale;

        // Crisp opaque white pill badge
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tagX - boxW / 2, tagY - boxH / 2, boxW, boxH);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(tagX - boxW / 2, tagY - boxH / 2, boxW, boxH);

        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, tagX, tagY);
        ctx.restore();
      }

      // Draw Parenthesis Hinge Symbol '(' or ')' at the cut end
      if (elem.hingeI) {
        // Parenthesis at startPx, concave towards nodeI (-ux, -uy)
        this.drawHingeParenthesis(startPx, startPy, -ux, -uy, nx, ny, scale);
      }
      if (elem.hingeJ) {
        // Parenthesis at endPx, concave towards nodeJ (+ux, +uy)
        this.drawHingeParenthesis(endPx, endPy, ux, uy, nx, ny, scale);
      }
    });

    // 2. Draw Distributed Loads (only when showLoads is true)
    if (showLoads) {
      this.drawDistributedLoads(nodeMap, scale);
    }

    // 3. Draw Supports at Nodes
    (this.frameData.nodes || []).forEach(node => {
      if (node.support && node.support !== 'none') {
        this.drawSupportSymbol(node, scale);
      }
    });

    // 4. Draw Nodal Point Loads (only when showLoads is true)
    if (showLoads) {
      this.drawNodalLoads(nodeMap, scale);
    }

    // 4.5. In Truss Mode, draw frictionless pin-joint circles at all node intersections
    if (this.frameData && this.frameData.structureType === 'truss') {
      (this.frameData.nodes || []).forEach(node => {
        const p = this.worldToPixel(node.x, node.z);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.0 * scale;
        ctx.beginPath();
        ctx.arc(p.px, p.py, 4.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }

    // 5. Draw Node Badges
    (this.frameData.nodes || []).forEach(node => {
      const p = this.worldToPixel(node.x, node.z);
      this.drawNodeBadge(p.px, p.py, node.id, scale);
    });

    ctx.restore();
  }

  drawHingeParenthesis(px, py, ux, uy, nx, ny, scale) {
    const ctx = this.ctx;
    const w = 6.5 * scale; // Half width perpendicular to member
    const d = 3.5 * scale; // Curvature depth along member towards the node

    ctx.save();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.4 * scale;
    ctx.lineCap = 'round';

    const tip1X = px + nx * w + ux * d;
    const tip1Y = py + ny * w + uy * d;
    const tip2X = px - nx * w + ux * d;
    const tip2Y = py - ny * w + uy * d;
    const apexX = px - ux * (d * 0.8);
    const apexY = py - uy * (d * 0.8);

    ctx.beginPath();
    ctx.moveTo(tip1X, tip1Y);
    ctx.quadraticCurveTo(apexX, apexY, tip2X, tip2Y);
    ctx.stroke();
    ctx.restore();
  }

  drawNodeBadge(px, py, nodeId, scale) {
    const ctx = this.ctx;
    ctx.save();

    // Solid node point dot (like in structural CAD / drafting)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(px, py, 4.0 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Node ID Text label (e.g. N1, N4 in blue) - only when showNodeLabels is true
    if (this.showNodeLabels) {
      ctx.fillStyle = '#2563eb';
      ctx.font = `bold ${12 * scale}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(nodeId, px + 7 * scale, py - 6 * scale);
    }
    ctx.restore();
  }

  drawSupportSymbol(node, scale) {
    const ctx = this.ctx;
    const p = this.worldToPixel(node.x, node.z);
    const px = p.px;
    const py = p.py;

    ctx.save();

    if (node.support === 'fixed') {
      // Clamped Wall Symbol
      const wallW = 32 * scale;
      const wallH = 14 * scale;
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.0 * scale;
      ctx.fillRect(px - wallW / 2, py, wallW, wallH);
      ctx.strokeRect(px - wallW / 2, py, wallW, wallH);

      // Hatching stripes
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.6 * scale;
      for (let x = px - wallW / 2 + 4; x < px + wallW / 2; x += 7 * scale) {
        ctx.beginPath();
        ctx.moveTo(x, py + wallH);
        ctx.lineTo(x + 5 * scale, py);
        ctx.stroke();
      }
    } else if (node.support === 'pin') {
      // Pin Triangle Support
      const triH = 20 * scale;
      const triW = 20 * scale;

      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2.0 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - triW / 2, py + triH);
      ctx.lineTo(px + triW / 2, py + triH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ground baseline
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.4 * scale;
      ctx.beginPath();
      ctx.moveTo(px - triW * 0.8, py + triH);
      ctx.lineTo(px + triW * 0.8, py + triH);
      ctx.stroke();
    } else if (node.support === 'roller_x' || node.support === 'roller') {
      // Roller free in X (rollers below triangle)
      const triH = 16 * scale;
      const triW = 18 * scale;

      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - triW / 2, py + triH);
      ctx.lineTo(px + triW / 2, py + triH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rollers
      const rY = py + triH + 3.5 * scale;
      ctx.fillStyle = '#64748b';
      [-5 * scale, 5 * scale].forEach(dx => {
        ctx.beginPath();
        ctx.arc(px + dx, rY, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Base line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(px - triW * 0.8, rY + 4 * scale);
      ctx.lineTo(px + triW * 0.8, rY + 4 * scale);
      ctx.stroke();
    } else if (node.support === 'roller_z') {
      // Roller free in Z (vertical roller on side)
      const triW = 16 * scale;
      const triH = 18 * scale;

      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - triW, py - triH / 2);
      ctx.lineTo(px - triW, py + triH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const rX = px - triW - 3.5 * scale;
      ctx.fillStyle = '#64748b';
      [-5 * scale, 5 * scale].forEach(dy => {
        ctx.beginPath();
        ctx.arc(rX, py + dy, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(rX - 4 * scale, py - triH * 0.8);
      ctx.lineTo(rX - 4 * scale, py + triH * 0.8);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawNodalLoads(nodeMap, scale) {
    const ctx = this.ctx;
    const nodalLoads = this.frameData.nodalLoads || [];

    nodalLoads.forEach(nl => {
      const node = nodeMap.get(nl.nodeId);
      if (!node) return;

      const p = this.worldToPixel(node.x, node.z);
      const fx = Number(nl.Fx) || 0;
      const fz = Number(nl.Fz) || 0;
      const m = Number(nl.M) || 0;

      ctx.save();

      // Elongated arrow length and enlarged arrowhead
      const arrowLen = 65 * scale;
      const headSize = 11.5 * scale;
      const arrowLineWidth = 3.0 * scale;

      // Horizontal Force Fx (tail at node, points outward: right if fx > 0, left if fx < 0)
      if (Math.abs(fx) > 1e-4) {
        const isRight = fx > 0;
        const fromX = p.px;
        const toX = isRight ? p.px + arrowLen : p.px - arrowLen;
        this.drawArrow(ctx, fromX, p.py, toX, p.py, '#dc2626', headSize, arrowLineWidth);

        this.drawBadgeText(ctx, isRight ? toX + 6 : toX - 6, p.py, `Fx=${formatNum(Math.abs(fx))}kN`, '#dc2626', isRight ? 'left' : 'right', '#fca5a5');
      }

      // Vertical Force Fz (tail at node, points outward: down if fz > 0, up if fz < 0)
      if (Math.abs(fz) > 1e-4) {
        const isDownward = fz > 0;
        const fromY = p.py;
        const toY = isDownward ? p.py + arrowLen : p.py - arrowLen;
        this.drawArrow(ctx, p.px, fromY, p.px, toY, '#dc2626', headSize, arrowLineWidth);

        this.drawBadgeText(ctx, p.px, isDownward ? toY + 14 * scale : toY - 14 * scale, `Fz=${formatNum(Math.abs(fz))}kN`, '#dc2626', 'center', '#fca5a5');
      }

      // Moment M (counter-clockwise arc if > 0, clockwise if < 0)
      if (Math.abs(m) > 1e-4) {
        const radius = 26 * scale;
        const isClockwise = m < 0; // Positive is counter-clockwise
        this.drawMomentArc(ctx, p.px, p.py, radius, isClockwise, '#d97706', scale);

        this.drawBadgeText(ctx, p.px, p.py - radius - 10 * scale, `M=${formatNum(Math.abs(m))}kNm`, '#d97706', 'center', '#fcd34d');
      }

      ctx.restore();
    });
  }

  drawDistributedLoads(nodeMap, scale) {
    const ctx = this.ctx;
    const distLoads = this.frameData.distLoads || [];

    distLoads.forEach(dl => {
      const elem = (this.frameData.elements || []).find(e => e.id === dl.elementId);
      if (!elem) return;

      const nI = nodeMap.get(elem.nodeI);
      const nJ = nodeMap.get(elem.nodeJ);
      if (!nI || !nJ) return;

      const p1 = this.worldToPixel(nI.x, nI.z);
      const p2 = this.worldToPixel(nJ.x, nJ.z);
      const qx = Number(dl.qx) || 0;
      const qz = Number(dl.qz) || 0;

      if (Math.abs(qx) < 1e-4 && Math.abs(qz) < 1e-4) return;

      ctx.save();
      const loadH = 24 * scale;
      const isInclined = Math.abs(p1.px - p2.px) > 3 && Math.abs(p1.py - p2.py) > 3;

      // 1. Vertical distributed load qz (Projected onto horizontal span, >0 downwards)
      if (Math.abs(qz) > 1e-4) {
        const isDownward = qz > 0;
        const minPx = Math.min(p1.px, p2.px);
        const maxPx = Math.max(p1.px, p2.px);
        const spanPx = Math.max(10, maxPx - minPx);
        const numArrows = Math.max(3, Math.floor(spanPx / (32 * scale)));

        const baseY = isInclined ? Math.min(p1.py, p2.py) : ((p1.py + p2.py) / 2);
        const topY = isDownward ? baseY - loadH : baseY + loadH;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.6 * scale;

        // Top horizontal roof line
        ctx.beginPath();
        ctx.moveTo(minPx, topY);
        ctx.lineTo(maxPx, topY);
        ctx.stroke();

        // If inclined, draw the horizontal baseline and side borders to form the projected load box
        if (isInclined) {
          ctx.beginPath();
          ctx.moveTo(minPx, baseY);
          ctx.lineTo(maxPx, baseY);
          ctx.moveTo(minPx, topY);
          ctx.lineTo(minPx, baseY);
          ctx.moveTo(maxPx, topY);
          ctx.lineTo(maxPx, baseY);
          ctx.stroke();
        }

        // Draw vertical load arrows
        for (let i = 0; i <= numArrows; i++) {
          const curX = minPx + (i / numArrows) * spanPx;
          const arrowBaseY = isInclined ? baseY : p1.py + ((curX - p1.px) / (p2.px - p1.px || 1)) * (p2.py - p1.py);
          if (isDownward) {
            this.drawArrow(ctx, curX, topY, curX, arrowBaseY - 2, '#ef4444', 4.5 * scale, 1.6 * scale);
          } else {
            this.drawArrow(ctx, curX, topY, curX, arrowBaseY + 2, '#ef4444', 4.5 * scale, 1.6 * scale);
          }
        }

        ctx.fillStyle = '#b91c1c';
        ctx.font = `bold ${11.5 * scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`qz = ${formatNum(Math.abs(qz))} kN/m`, (minPx + maxPx) / 2, Math.min(topY, baseY) - 5 * scale);
      }

      // 2. Horizontal distributed load qx (Projected onto vertical height)
      if (Math.abs(qx) > 1e-4) {
        const sign = qx > 0 ? 1 : -1;
        const minPy = Math.min(p1.py, p2.py);
        const maxPy = Math.max(p1.py, p2.py);
        const spanPy = Math.max(10, maxPy - minPy);
        const numArrows = Math.max(3, Math.floor(spanPy / (32 * scale)));

        const baseX = isInclined ? (qx > 0 ? Math.min(p1.px, p2.px) : Math.max(p1.px, p2.px)) : ((p1.px + p2.px) / 2);
        const outerX = baseX - sign * loadH;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.6 * scale;

        // Outer vertical line
        ctx.beginPath();
        ctx.moveTo(outerX, minPy);
        ctx.lineTo(outerX, maxPy);
        ctx.stroke();

        // If inclined, draw vertical baseline and horizontal borders
        if (isInclined) {
          ctx.beginPath();
          ctx.moveTo(baseX, minPy);
          ctx.lineTo(baseX, maxPy);
          ctx.moveTo(outerX, minPy);
          ctx.lineTo(baseX, minPy);
          ctx.moveTo(outerX, maxPy);
          ctx.lineTo(baseX, maxPy);
          ctx.stroke();
        }

        // Draw horizontal load arrows
        for (let i = 0; i <= numArrows; i++) {
          const curY = minPy + (i / numArrows) * spanPy;
          const arrowBaseX = isInclined ? baseX : p1.px + ((curY - p1.py) / (p2.py - p1.py || 1)) * (p2.px - p1.px);
          this.drawArrow(ctx, outerX, curY, arrowBaseX - sign * 2, curY, '#ef4444', 4.5 * scale, 1.6 * scale);
        }

        ctx.fillStyle = '#b91c1c';
        ctx.font = `bold ${11.5 * scale}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`qx = ${formatNum(Math.abs(qx))} kN/m`, (outerX + baseX) / 2, minPy - 5 * scale);
      }

      ctx.restore();
    });
  }

  drawReactions() {
    const ctx = this.ctx;
    if (!this.solution || !this.solution.reactions) return;

    const reactions = this.solution.reactions;
    const nodeMap = new Map();
    (this.frameData.nodes || []).forEach(n => nodeMap.set(n.id, n));

    ctx.save();

    for (const [nodeId, r] of Object.entries(reactions)) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const p = this.worldToPixel(node.x, node.z);
      const px = p.px;
      const py = p.py;
      const arrowLen = 38;
      const supportH = 22; // Offset below support symbol

      // 1. Horizontal Reaction Rx
      if (Math.abs(r.Rx) > 1e-3) {
        const isRight = r.Rx > 0;
        const fromX = isRight ? px - 18 - arrowLen : px + 18 + arrowLen;
        const toX = isRight ? px - 12 : px + 12;
        this.drawArrow(ctx, fromX, py + 8, toX, py + 8, '#16a34a', 7.5, 2.5);

        this.drawBadgeText(ctx, isRight ? fromX - 6 : fromX + 6, py + 8, `Rx=${formatNum(Math.abs(r.Rx))}kN`, '#15803d', isRight ? 'right' : 'left');
      }

      // 2. Vertical Reaction Rz (placed cleanly BELOW support to avoid crossing column)
      if (Math.abs(r.Rz) > 1e-3) {
        const isUpward = r.Rz > 0;
        const baseOffsetY = py + supportH;
        const fromY = isUpward ? baseOffsetY + arrowLen : baseOffsetY;
        const toY = isUpward ? baseOffsetY : baseOffsetY + arrowLen;
        this.drawArrow(ctx, px, fromY, px, toY, '#16a34a', 7.5, 2.5);

        this.drawBadgeText(ctx, px, baseOffsetY + arrowLen + 12, `Rz=${formatNum(Math.abs(r.Rz))}kN`, '#15803d', 'center');
      }

      // 3. Reaction Moment MR (counter-clockwise arc if > 0, clockwise if < 0)
      if (Math.abs(r.MR) > 1e-3) {
        const radius = 22;
        const isClockwise = r.MR < 0; // Positive is counter-clockwise
        this.drawMomentArc(ctx, px, py + 12, radius, isClockwise, '#047857', 1.0);

        const textX = px - radius - 14;
        const textY = py + supportH + 12;
        this.drawBadgeText(ctx, textX, textY, `MR=${formatNum(Math.abs(r.MR))}kNm`, '#047857', 'right');
      }
    }

    ctx.restore();
  }

  drawBadgeText(ctx, px, py, text, color, align = 'center', borderColor = '#86efac') {
    ctx.save();
    ctx.font = 'bold 11.5px "JetBrains Mono", monospace';
    const metrics = ctx.measureText(text);
    const boxW = metrics.width + 8;
    const boxH = 17;

    let boxX = px - boxW / 2;
    if (align === 'right') boxX = px - boxW;
    else if (align === 'left') boxX = px;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, py - boxH / 2, boxW, boxH);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(boxX, py - boxH / 2, boxW, boxH);

    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, px, py);
    ctx.restore();
  }

  /**
   * Draw internal force diagrams (N, T, M) for all members
   */
  drawInternalForceDiagram(type, strokeColor, fillColor, title) {
    const ctx = this.ctx;
    if (!this.solution || !this.solution.elements || !this.solution.elements.length) return;

    ctx.save();

    // 1. Draw Title Header Badge
    ctx.fillStyle = strokeColor;
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 20, 28);

    // 2. Find Global Maximum Value across all elements for consistent scaling
    let globalMaxAbs = 1e-6;
    this.solution.elements.forEach(elem => {
      elem.samples.forEach(s => {
        const val = Math.abs(s[type]);
        if (val > globalMaxAbs) globalMaxAbs = val;
      });
    });

    const isTruss = this.frameData && this.frameData.structureType === 'truss';
    const minPlotOffsetPixels = Math.max(8.5, 7.5 * (this.transform.scale / 40));
    const maxPlotOffsetPixels = Math.min(65, this.transform.scale * 1.25);
    const valueScale = maxPlotOffsetPixels / (globalMaxAbs || 1);

    // In Truss mode: forces are strictly constant along each bar, so guarantee a minimum visible diagram width for loaded bars.
    // In Frame mode: use exact linear scaling to perfectly preserve continuous triangles, parabolas, and zero-crossings.
    const calcOffsetAmount = (val) => {
      if (Math.abs(val) < 1e-4) return 0;
      if (isTruss) {
        const ratio = Math.min(1.0, Math.abs(val) / globalMaxAbs);
        const mag = minPlotOffsetPixels + (maxPlotOffsetPixels - minPlotOffsetPixels) * ratio;
        return (val >= 0 ? 1 : -1) * mag;
      }
      return val * valueScale;
    };

    // Global tracker to avoid duplicate and overlapping value tags
    const placedTags = [];

    // 3. Render Each Member Diagram
    this.solution.elements.forEach(elem => {
      const pI = this.worldToPixel(elem.coordI.x, elem.coordI.z);
      const pJ = this.worldToPixel(elem.coordJ.x, elem.coordJ.z);
      const dxPx = pJ.px - pI.px;
      const dyPx = pJ.py - pI.py;
      const lenPx = Math.hypot(dxPx, dyPx) || 1;

      // Local transverse normal vector in screen space corresponding to +e_zeta (+90 deg in world (x,z)):
      // In world coords: e_zeta = (-sin, cos) = (-dz/L, dx/L).
      // On screen: px = x*scale + offX, py = offY - z*scale => d_px = dx*scale, d_py = -dz*scale.
      // So +e_zeta in screen pixels is: nx = dyPx / lenPx, ny = -dxPx / lenPx.
      const nx = dyPx / lenPx;
      const ny = -dxPx / lenPx;

      const basePoints = [];
      const diagramPoints = [];

      elem.samples.forEach(sample => {
        const pt = this.worldToPixel(sample.x, sample.z);
        const val = sample[type];

        // Exact physical offset:
        // For M: val > 0 points along +n_zeta (top/outer tension fiber), val < 0 points along -n_zeta (bottom/inner tension fiber)
        // For N/T: standard positive along +n_zeta, negative along -n_zeta
        const offsetAmount = calcOffsetAmount(val);

        const diagX = pt.px + nx * offsetAmount;
        const diagY = pt.py + ny * offsetAmount;

        basePoints.push(pt);
        diagramPoints.push({ px: diagX, py: diagY, val });
      });

      // Draw Shaded Polygon between member axis and diagram curve
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(basePoints[0].px, basePoints[0].py);
      basePoints.forEach(p => ctx.lineTo(p.px, p.py));
      for (let i = diagramPoints.length - 1; i >= 0; i--) {
        ctx.lineTo(diagramPoints[i].px, diagramPoints[i].py);
      }
      ctx.closePath();
      ctx.fill();

      // Draw Diagram Outline Curve
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(diagramPoints[0].px, diagramPoints[0].py);
      diagramPoints.forEach(p => ctx.lineTo(p.px, p.py));
      ctx.stroke();

      // Draw Hatching Lines (Kreskowanie) perpendicular to member axis
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 3]);
      const hatchStep = 4; // every 4th sample
      for (let i = 0; i < elem.samples.length; i += hatchStep) {
        ctx.beginPath();
        ctx.moveTo(basePoints[i].px, basePoints[i].py);
        ctx.lineTo(diagramPoints[i].px, diagramPoints[i].py);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Annotate End Values (with clearance from member baseline and deduplication)
      const valI = diagramPoints[0].val;
      const valJ = diagramPoints[diagramPoints.length - 1].val;
      const offsetI = calcOffsetAmount(valI);
      const offsetJ = calcOffsetAmount(valJ);

      this.collectDiagramTag(placedTags, basePoints[0], diagramPoints[0], valI, strokeColor, nx, ny, offsetI, type);
      this.collectDiagramTag(placedTags, basePoints[basePoints.length - 1], diagramPoints[diagramPoints.length - 1], valJ, strokeColor, nx, ny, offsetJ, type);

      // Extrema value if in middle of member (away from ends)
      const nSamples = diagramPoints.length;
      let maxMidVal = 0;
      let maxMidIdx = -1;
      const startIdx = Math.floor(nSamples * 0.2);
      const endIdx = Math.floor(nSamples * 0.8);
      for (let i = startIdx; i <= endIdx; i++) {
        if (Math.abs(diagramPoints[i].val) > Math.abs(maxMidVal) && 
          Math.abs(diagramPoints[i].val - valI) > 0.5 && 
          Math.abs(diagramPoints[i].val - valJ) > 0.5) {
          maxMidVal = diagramPoints[i].val;
          maxMidIdx = i;
        }
      }
      if (maxMidIdx !== -1 && Math.abs(maxMidVal) > 0.05) {
        const offsetMid = calcOffsetAmount(maxMidVal);
        this.collectDiagramTag(placedTags, basePoints[maxMidIdx], diagramPoints[maxMidIdx], maxMidVal, strokeColor, nx, ny, offsetMid, type);
      }
    });

    ctx.restore();
    return placedTags;
  }

  collectDiagramTag(tagsToDraw, basePt, diagPt, val, color, nx, ny, offsetAmount, type = '') {
    if (Math.abs(val) < 0.05) return;

    const dirSign = offsetAmount >= 0 ? 1 : -1;
    const absOffset = Math.abs(offsetAmount);

    // Ensure badge is pushed sufficiently away from the structural beam centerline
    const minClearance = 16; // pixels away from baseline
    let targetX = diagPt.px;
    let targetY = diagPt.py;

    if (absOffset < minClearance) {
      targetX = basePt.px + nx * (minClearance * (dirSign || 1));
      targetY = basePt.py + ny * (minClearance * (dirSign || 1));
    } else {
      // Push slightly outward beyond the diagram peak for optimal readability
      targetX += nx * (6 * (dirSign || 1));
      targetY += ny * (6 * (dirSign || 1));
    }

    // Check collision / duplication with already placed tags
    for (const tag of tagsToDraw) {
      const dist = Math.hypot(targetX - tag.x, targetY - tag.y);
      if (dist < 42) {
        // For Bending Moment (M) at a 2-member rigid corner, deduplicate if values are equal
        if (type === 'M' && Math.abs(Math.abs(val) - Math.abs(tag.val)) < 0.1) {
          return;
        }
        // For exact same signed value at the exact same point, skip duplicate
        if (Math.abs(val - tag.val) < 0.05 && dist < 16) {
          return;
        }
        // If different values (e.g. shear step jump at node +1 vs -1), offset along the member to show both clearly
        if (Math.abs(targetX - tag.x) < 24) {
          targetX += (val < 0 ? -22 : 22);
        } else {
          targetY += (targetY >= tag.y ? 18 : -18);
        }
      }
    }

    // Bending moment M is drawn on the tension fiber side with NO sign (+/-)
    const text = type === 'M' ? formatNum(Math.abs(val)) : ((val > 0 ? '+' : '') + formatNum(val));
    const pad = 5;
    this.ctx.save();
    this.ctx.font = 'bold 11px "JetBrains Mono", monospace';
    const metrics = this.ctx.measureText(text);
    this.ctx.restore();
    const boxW = Math.max(metrics.width + pad * 2, 28);
    const boxH = 16;

    tagsToDraw.push({
      x: targetX,
      y: targetY,
      val,
      color,
      boxW,
      boxH,
      text
    });
  }

  renderDiagramTag(ctx, tag) {
    const { x, y, color, boxW, boxH, text } = tag;
    ctx.save();
    ctx.font = 'bold 11px "JetBrains Mono", monospace';

    // Opaque white background badge for 100% crisp visibility
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.strokeRect(x - boxW / 2, y - boxH / 2, boxW, boxH);

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawCursorMarker(cursorInfo) {
    const ctx = this.ctx;
    const p = this.worldToPixel(cursorInfo.x, cursorInfo.z);

    ctx.save();
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.px, p.py, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawArrow(ctx, fromX, fromY, toX, toY, color, headLen = 10, lineWidth = 2.5) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Bold, prominent triangular arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 5.5), toY - headLen * Math.sin(angle - Math.PI / 5.5));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 5.5), toY - headLen * Math.sin(angle + Math.PI / 5.5));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawMomentArc(ctx, cx, cy, radius, isClockwise, color, scale = 1.0) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.2 * scale;

    const startAngle = isClockwise ? -Math.PI * 0.75 : Math.PI * 0.75;
    const endAngle = isClockwise ? Math.PI * 0.65 : -Math.PI * 0.65;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, !isClockwise);
    ctx.stroke();

    const tipX = cx + radius * Math.cos(endAngle);
    const tipY = cy + radius * Math.sin(endAngle);
    const tangentAngle = isClockwise ? (endAngle + Math.PI / 2) : (endAngle - Math.PI / 2);

    const headLen = 7 * scale;
    const arrowAngle1 = tangentAngle - Math.PI + Math.PI / 6;
    const arrowAngle2 = tangentAngle - Math.PI - Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + headLen * Math.cos(arrowAngle1), tipY + headLen * Math.sin(arrowAngle1));
    ctx.lineTo(tipX + headLen * Math.cos(arrowAngle2), tipY + headLen * Math.sin(arrowAngle2));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
