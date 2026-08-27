/**
 * 2D Frame Calculator - UI Controller & Event Binder
 * Coordinates inputs, Direct Stiffness Method solver, and Canvas renderer.
 * Undo / Redo history, modal dialogs, URL share link, JSON save/load, EN/PL i18n.
 */

import { DEFAULT_FRAME, SUPPORT_TYPES } from './constants.js?v=2.3';
import { FrameSolver } from './frameSolver.js?v=2.3';
import { FrameRenderer } from './renderer.js?v=2.3';
import { generateStepByStepReport } from './stepByStep.js?v=2.3';
import { PRESETS, EMPTY_FRAME_PRESET } from './presets.js?v=2.3';
import { TRANSLATIONS, getSavedLanguage, setSavedLanguage } from './i18n.js?v=2.3';

function formatNum(val, maxDec = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  if (Math.abs(num) < 1e-9) return '0';
  const factor = Math.pow(10, maxDec);
  const rounded = Math.round(num * factor) / factor;
  return rounded.toString();
}

export class FrameCalculatorApp {
  constructor() {
    this.lang = getSavedLanguage(); // Defaults to 'en'
    this.frameData = JSON.parse(JSON.stringify(DEFAULT_FRAME));
    this.solution = null;
    this.renderer = null;
    this.currentAddConfirmHandler = null;

    // Undo / Redo History Stacks
    this.undoStack = [];
    this.redoStack = [];

    this.initDOM();
    this.initRenderer();
    this.bindEvents();
    this.applyLanguage();

    // Check if model encoded in URL hash (#model=...)
    const loadedFromHash = this.checkUrlHashModel();
    if (!loadedFromHash) {
      this.saveHistoryState();
      this.recalculate(false);
      this.showHeroOverlay();
    }
  }

  get t() {
    return TRANSLATIONS[this.lang] || TRANSLATIONS.en;
  }

  initDOM() {
    // Tables
    this.tableNodes = document.getElementById('tableNodesBody');
    this.tableElements = document.getElementById('tableElementsBody');
    this.tableNodalLoads = document.getElementById('tableNodalLoadsBody');
    this.tableDistLoads = document.getElementById('tableDistLoadsBody');

    // Modals
    this.modalCalcDetails = document.getElementById('modalCalcDetails');
    this.modalCalcBody = document.getElementById('modalCalcBody');
    this.modalTemplates = document.getElementById('modalTemplates');
    this.templatesList = document.getElementById('templatesList');

    // Canvas Presets Overlay
    this.canvasPresetsOverlay = document.getElementById('canvasPresetsOverlay');
    this.heroPresetsGrid = document.getElementById('heroPresetsGrid');
    this.heroWelcomeTitle = document.getElementById('heroWelcomeTitle');
    this.heroWelcomeSubtitle = document.getElementById('heroWelcomeSubtitle');

    // Add Element Modal
    this.modalAddElement = document.getElementById('modalAddElement');
    this.modalAddElementTitle = document.getElementById('lblAddElementModalTitle');
    this.modalAddElementBody = document.getElementById('modalAddElementBody');
    this.btnCancelAddElement = document.getElementById('btnCancelAddElement');
    this.btnConfirmAddElement = document.getElementById('btnConfirmAddElement');
    this.btnCloseAddElementModal = document.getElementById('btnCloseAddElementModal');

    // Navigation Buttons
    this.btnUndo = document.getElementById('btnUndo');
    this.btnRedo = document.getElementById('btnRedo');
    this.btnSaveModel = document.getElementById('btnSaveModel');
    this.btnLoadModel = document.getElementById('btnLoadModel');
    this.inpModelFile = document.getElementById('inpModelFile');
    this.btnShareLink = document.getElementById('btnShareLink');
    this.btnToggleLang = document.getElementById('btnToggleLang');
    this.toastNotification = document.getElementById('toastNotification');

    // Status bar items
    this.statusElem = document.getElementById('statusElem');
    this.statusN = document.getElementById('statusN');
    this.statusT = document.getElementById('statusT');
    this.statusM = document.getElementById('statusM');
    this.statusEquilibrium = document.getElementById('statusEquilibrium');

    // Floating Canvas Action Buttons
    this.btnClearCanvas = document.getElementById('btnClearCanvas');
    this.btnClearCanvasText = document.getElementById('btnClearCanvasText');

    // Make all modals draggable by header
    this.initDraggableModals();
  }

  initRenderer() {
    const canvas = document.getElementById('frameCanvas');
    const tooltip = document.getElementById('cursorTooltip');

    this.renderer = new FrameRenderer(canvas, tooltip, (cursorValues) => {
      this.updateStatusBarCursor(cursorValues);
    });
    this.renderer.setLanguage(this.lang);
  }

  saveHistoryState() {
    const snap = JSON.stringify(this.frameData);
    if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== snap) {
      this.undoStack.push(snap);
      if (this.undoStack.length > 50) this.undoStack.shift();
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
  }

  undo() {
    if (this.undoStack.length <= 1) return;
    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);
    const prevState = this.undoStack[this.undoStack.length - 1];
    this.frameData = JSON.parse(prevState);
    this.recalculate(false);
    this.hideHeroOverlay();
    this.updateUndoRedoButtons();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);
    this.frameData = JSON.parse(nextState);
    this.recalculate(false);
    this.hideHeroOverlay();
    this.updateUndoRedoButtons();
  }

  updateUndoRedoButtons() {
    if (this.btnUndo) {
      const canUndo = this.undoStack.length > 1;
      this.btnUndo.classList.toggle('opacity-50', !canUndo);
      this.btnUndo.style.pointerEvents = canUndo ? 'auto' : 'none';
    }
    if (this.btnRedo) {
      const canRedo = this.redoStack.length > 0;
      this.btnRedo.classList.toggle('opacity-50', !canRedo);
      this.btnRedo.style.pointerEvents = canRedo ? 'auto' : 'none';
    }
  }

  bindEvents() {
    // Undo & Redo clicks
    if (this.btnUndo) this.btnUndo.addEventListener('click', () => this.undo());
    if (this.btnRedo) this.btnRedo.addEventListener('click', () => this.redo());

    // Save & Load & Share
    if (this.btnSaveModel) this.btnSaveModel.addEventListener('click', () => this.saveModelJSON());
    if (this.btnLoadModel) this.btnLoadModel.addEventListener('click', () => this.inpModelFile && this.inpModelFile.click());
    if (this.inpModelFile) this.inpModelFile.addEventListener('change', (e) => this.loadModelJSON(e));
    if (this.btnShareLink) this.btnShareLink.addEventListener('click', () => this.copyShareLink());

    // Language switch
    if (this.btnToggleLang) {
      this.btnToggleLang.addEventListener('click', () => this.toggleLanguage());
    }

    // Top Ribbon View Mode Radios
    document.querySelectorAll('.radio-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.view;
        this.setViewMode(mode);
      });
    });

    // Add buttons - Open popup parameter dialogs
    document.getElementById('btnAddNode').addEventListener('click', () => {
      this.hideHeroOverlay();
      this.openAddNodeModal();
    });
    document.getElementById('btnAddElement').addEventListener('click', () => {
      this.hideHeroOverlay();
      this.openAddElementModal();
    });
    document.getElementById('btnAddNodalLoad').addEventListener('click', () => {
      this.hideHeroOverlay();
      this.openAddNodalLoadModal();
    });
    document.getElementById('btnAddDistLoad').addEventListener('click', () => {
      this.hideHeroOverlay();
      this.openAddDistLoadModal();
    });

    // Add Element Modal buttons
    if (this.btnCancelAddElement) {
      this.btnCancelAddElement.addEventListener('click', () => this.closeAddElementModal());
    }
    if (this.btnCloseAddElementModal) {
      this.btnCloseAddElementModal.addEventListener('click', () => this.closeAddElementModal());
    }
    if (this.btnConfirmAddElement) {
      this.btnConfirmAddElement.addEventListener('click', () => {
        if (this.currentAddConfirmHandler) {
          this.currentAddConfirmHandler();
        }
      });
    }

    // Modals buttons
    document.getElementById('btnCalcDetails').addEventListener('click', () => this.openCalcDetailsModal());
    document.getElementById('btnCloseCalcModal').addEventListener('click', () => this.closeCalcDetailsModal());
    document.getElementById('btnCloseCalcModalFooter').addEventListener('click', () => this.closeCalcDetailsModal());

    document.getElementById('btnOpenTemplates').addEventListener('click', () => this.showHeroOverlay());
    document.getElementById('btnCloseTemplatesModal').addEventListener('click', () => this.closeTemplatesModal());

    // Export PNG
    document.getElementById('btnExportPNG').addEventListener('click', () => this.exportPNG());

    // Zoom Buttons
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnResetZoom = document.getElementById('btnResetZoom');
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.renderer.zoomIn());
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.renderer.zoomOut());
    if (btnResetZoom) btnResetZoom.addEventListener('click', () => this.renderer.resetZoom());

    // Interactive Draw Node Button
    const btnDrawNode = document.getElementById('btnDrawNodeMode');
    if (btnDrawNode) {
      btnDrawNode.addEventListener('click', () => this.toggleDrawNodeMode());
    }

    // Interactive Draw Element Button
    const btnDrawElement = document.getElementById('btnDrawElementMode');
    if (btnDrawElement) {
      btnDrawElement.addEventListener('click', () => this.toggleDrawElementMode());
    }

    // Clear Canvas Button (Directs to empty frame preset)
    if (this.btnClearCanvas) {
      this.btnClearCanvas.addEventListener('click', () => this.clearCanvasToEmptyPreset());
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        this.undo();
      } else if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Escape' || e.key === 'Esc') {
        if (this.isDrawNodeMode) {
          this.setDrawNodeMode(false);
        }
        if (this.isDrawElementMode) {
          if (this.renderer && this.renderer.drawElemStartNodeId) {
            this.renderer.drawElemStartNodeId = null;
            this.renderer.draw();
          } else {
            this.setDrawElementMode(false);
          }
        }
        this.closeAddElementModal();
        this.closeCalcDetailsModal();
        this.closeTemplatesModal();
        this.hideHeroOverlay();
      } else if (e.key === 'Enter') {
        if (this.modalAddElement && this.modalAddElement.classList.contains('open')) {
          if (this.currentAddConfirmHandler) {
            this.currentAddConfirmHandler();
          }
        }
      }
    });

    // Accordion toggling
    document.querySelectorAll('.poly-card-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        const icon = header.querySelector('.accordion-chevron');
        if (body.style.display === 'none') {
          body.style.display = 'block';
          if (icon) icon.style.transform = 'rotate(0deg)';
        } else {
          body.style.display = 'none';
          if (icon) icon.style.transform = 'rotate(-90deg)';
        }
      });
    });
  }

  showHeroOverlay() {
    this.renderHeroPresets();
    if (this.canvasPresetsOverlay) {
      this.canvasPresetsOverlay.classList.remove('hidden');
    }
  }

  hideHeroOverlay() {
    if (this.canvasPresetsOverlay) {
      this.canvasPresetsOverlay.classList.add('hidden');
    }
  }

  renderHeroPresets() {
    if (!this.heroPresetsGrid) return;
    this.heroPresetsGrid.innerHTML = '';
    const t = this.t;

    if (this.heroWelcomeTitle) this.heroWelcomeTitle.textContent = t.heroWelcomeTitle;
    if (this.heroWelcomeSubtitle) this.heroWelcomeSubtitle.textContent = t.heroWelcomeSubtitle;

    PRESETS.forEach(preset => {
      const title = typeof preset.name === 'object' ? (preset.name[this.lang] || preset.name.en) : preset.name;
      const desc = typeof preset.description === 'object' ? (preset.description[this.lang] || preset.description.en) : preset.description;

      const card = document.createElement('div');
      card.className = 'preset-hero-card';
      card.innerHTML = `
        <div>
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <span class="hero-card-title">${title}</span>
            <span style="font-size: 11px; font-family: monospace; font-weight: bold; color: #1d4ed8; background: #dbeafe; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">${preset.data.elements.length} bars</span>
          </div>
          <div class="hero-card-desc">${desc}</div>
        </div>
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: #2563eb;">
          <span>⚡ Load Configuration</span>
          <span>&rarr;</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.loadPreset(preset);
        this.hideHeroOverlay();
      });

      this.heroPresetsGrid.appendChild(card);
    });

    // Blank Frame Option (True blank frame with 0 nodes and 0 elements)
    const blankCard = document.createElement('div');
    blankCard.className = 'preset-hero-card';
    blankCard.style.backgroundColor = '#f8fafc';
    blankCard.style.borderStyle = 'dashed';
    blankCard.style.borderColor = '#cbd5e1';
    blankCard.innerHTML = `
      <div>
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <span class="hero-card-title" style="color: #1e293b;">✨ ${t.blankFrameTitle}</span>
          <span style="font-size: 11px; font-family: monospace; font-weight: bold; color: #475569; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">Blank</span>
        </div>
        <div class="hero-card-desc">${t.blankFrameDesc}</div>
      </div>
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600; color: #475569;">
        <span>Create from Scratch</span>
        <span>+</span>
      </div>
    `;

    blankCard.addEventListener('click', () => {
      this.clearCanvasToEmptyPreset();
    });

    this.heroPresetsGrid.appendChild(blankCard);
  }

  toggleLanguage() {
    this.lang = this.lang === 'en' ? 'pl' : 'en';
    setSavedLanguage(this.lang);
    this.renderer.setLanguage(this.lang);
    this.applyLanguage();
    this.recalculate(false);
  }

  applyLanguage() {
    const t = this.t;

    if (this.btnToggleLang) {
      this.btnToggleLang.innerHTML = this.lang === 'en' 
        ? `<span class="text-sm">🌐</span> <strong>EN</strong> / PL` 
        : `<span class="text-sm">🌐</span> <strong>PL</strong> / EN`;
    }

    const btnKofi = document.getElementById('btnKofi');
    const lblKofiText = document.getElementById('lblKofiText');
    if (lblKofiText && t.kofiBtn) lblKofiText.textContent = t.kofiBtn;
    if (btnKofi && t.kofiTitle) btnKofi.title = t.kofiTitle;

    document.getElementById('appMainTitle').textContent = t.appTitle;
    document.getElementById('appGreeting').textContent = t.greeting;
    document.getElementById('btnOpenTemplates').textContent = t.presetsBtn;
    if (this.btnUndo) this.btnUndo.textContent = t.undoBtn;
    if (this.btnRedo) this.btnRedo.textContent = t.redoBtn;
    if (this.btnSaveModel) this.btnSaveModel.textContent = t.saveModelBtn;
    if (this.btnLoadModel) this.btnLoadModel.textContent = t.loadModelBtn;
    if (this.btnShareLink) this.btnShareLink.textContent = t.shareBtn;
    document.getElementById('btnExportPNG').textContent = t.exportPngBtn;
    document.getElementById('btnCalcDetailsText').textContent = t.calcReportBtn;

    // View radio pills
    const rPill = document.querySelector('[data-view="reactions"]');
    const nPill = document.querySelector('[data-view="normal"]');
    const tPill = document.querySelector('[data-view="shear"]');
    const mPill = document.querySelector('[data-view="moment"]');
    if (rPill) rPill.innerHTML = `<span class="radio-dot"></span> ${t.reactionsView}`;
    if (nPill) nPill.innerHTML = `<span class="radio-dot"></span> ${t.normalView}`;
    if (tPill) tPill.innerHTML = `<span class="radio-dot"></span> ${t.shearView}`;
    if (mPill) mPill.innerHTML = `<span class="radio-dot"></span> ${t.momentView}`;

    // Sidebar titles
    document.getElementById('lblNodesTitle').textContent = t.nodesTitle;
    document.getElementById('btnAddNode').textContent = t.addNodeBtn;
    document.getElementById('lblElementsTitle').textContent = t.elementsTitle;
    document.getElementById('btnAddElement').textContent = t.addElemBtn;
    document.getElementById('lblNodalLoadsTitle').textContent = t.nodalLoadsTitle;
    document.getElementById('btnAddNodalLoad').textContent = t.addNodalLoadBtn;
    document.getElementById('lblDistLoadsTitle').textContent = t.distLoadsTitle;
    document.getElementById('btnAddDistLoad').textContent = t.addDistLoadBtn;
    document.getElementById('lblSidebarBadge').textContent = t.sidebarBadge;
    document.getElementById('lblSidebarSubBadge').textContent = t.sidebarSubBadge;

    // Modal report headers
    document.getElementById('lblCalcReportModalTitle').textContent = t.reportTitle;
    document.getElementById('lblPresetsModalTitle').textContent = t.presetsModalTitle;
    document.getElementById('btnCloseCalcModalFooter').textContent = t.closeBtn;
    document.getElementById('btnPrintCalcModalFooter').textContent = t.printBtn;

    if (this.btnCancelAddElement) this.btnCancelAddElement.textContent = t.cancelBtn;
    if (this.btnConfirmAddElement) this.btnConfirmAddElement.textContent = t.confirmAddBtn;

    const btnDrawNodeText = document.getElementById('btnDrawNodeText');
    if (btnDrawNodeText) {
      btnDrawNodeText.textContent = this.isDrawNodeMode ? (t.drawNodeBtnActive || '📍 Click Canvas to Place Node (Esc)') : (t.drawNodeBtn || '➕ Draw Node');
    }

    const btnDrawElementText = document.getElementById('btnDrawElementText');
    if (btnDrawElementText) {
      btnDrawElementText.textContent = this.isDrawElementMode ? (t.drawElementBtnActive || '🔗 Create Member (Esc)') : (t.drawElementBtn || '🔗 Create Member');
    }

    const btnClearCanvasText = document.getElementById('btnClearCanvasText');
    if (btnClearCanvasText) {
      btnClearCanvasText.textContent = t.clearCanvasBtn || '🗑️ Clear Canvas';
    }
    const btnClearCanvas = document.getElementById('btnClearCanvas');
    if (btnClearCanvas) {
      btnClearCanvas.title = t.clearCanvasTooltip || 'Clear canvas and direct to empty frame preset';
    }

    this.renderHeroPresets();
    this.renderTables();
    this.updateUndoRedoButtons();
  }

  toggleDrawNodeMode() {
    this.setDrawNodeMode(!this.isDrawNodeMode);
  }

  setDrawNodeMode(enabled) {
    this.isDrawNodeMode = enabled;
    if (enabled) {
      this.hideHeroOverlay();
      if (this.isDrawElementMode) {
        this.setDrawElementMode(false);
      }
    }
    const btn = document.getElementById('btnDrawNodeMode');
    const txt = document.getElementById('btnDrawNodeText');
    const t = this.t;

    if (btn) {
      if (enabled) {
        btn.classList.add('active');
        if (txt) txt.textContent = t.drawNodeBtnActive || '📍 Click Canvas to Place Node (Esc)';
      } else {
        btn.classList.remove('active');
        if (txt) txt.textContent = t.drawNodeBtn || '➕ Draw Node';
      }
    }

    this.renderer.setDrawNodeMode(enabled, (x, z) => {
      this.handleInteractiveNodePlaced(x, z);
    });
  }

  toggleDrawElementMode() {
    this.setDrawElementMode(!this.isDrawElementMode);
  }

  setDrawElementMode(enabled) {
    this.isDrawElementMode = enabled;
    if (enabled) {
      this.hideHeroOverlay();
      if (this.isDrawNodeMode) {
        this.setDrawNodeMode(false);
      }
    }
    const btn = document.getElementById('btnDrawElementMode');
    const txt = document.getElementById('btnDrawElementText');
    const t = this.t;

    if (btn) {
      if (enabled) {
        btn.classList.add('active');
        if (txt) txt.textContent = t.drawElementBtnActive || '🔗 Create Member (Esc)';
      } else {
        btn.classList.remove('active');
        if (txt) txt.textContent = t.drawElementBtn || '🔗 Create Member';
      }
    }

    this.renderer.setDrawElementMode(enabled, (startNodeId, endNodeId) => {
      this.handleInteractiveElementCreated(startNodeId, endNodeId);
    });
  }

  handleInteractiveNodePlaced(x, z) {
    // Check if a node already exists near this point (< 0.05m)
    const existing = (this.frameData.nodes || []).find(n => Math.hypot(n.x - x, n.z - z) < 0.05);
    if (existing) {
      this.showToast(this.t.toastNodeDuplicate || '⚠ Node already exists at this location');
      return;
    }

    // Find next available unique node ID (N1, N2, N3...)
    let maxNum = 0;
    (this.frameData.nodes || []).forEach(n => {
      const match = String(n.id).match(/^N(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextId = `N${maxNum + 1}`;

    this.frameData.nodes.push({
      id: nextId,
      x,
      z,
      support: 'none'
    });

    const msg = (this.t.toastNodeCreated || '📍 Node {id} created at ({x}m, {z}m)')
      .replace('{id}', nextId)
      .replace('{x}', formatNum(x))
      .replace('{z}', formatNum(z));
    this.showToast(msg);

    this.recalculate(true);
  }

  handleInteractiveElementCreated(startNodeId, endNodeId) {
    // Check if element already exists between these nodes (either direction)
    const existing = (this.frameData.elements || []).find(el =>
      (el.nodeI === startNodeId && el.nodeJ === endNodeId) ||
      (el.nodeI === endNodeId && el.nodeJ === startNodeId)
    );
    if (existing) {
      this.showToast(this.t.toastElementDuplicate || '⚠ Element already exists between these nodes');
      return;
    }

    // Find next available element ID (E1, E2, E3...)
    let maxNum = 0;
    (this.frameData.elements || []).forEach(el => {
      const match = String(el.id).match(/^E(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextId = `E${maxNum + 1}`;

    this.frameData.elements.push({
      id: nextId,
      nodeI: startNodeId,
      nodeJ: endNodeId,
      EJ: 1.0,
      hingeI: false,
      hingeJ: false
    });

    const msg = (this.t.toastElementCreated || '🔗 Element {id} created: {n1} → {n2}')
      .replace('{id}', nextId)
      .replace('{n1}', startNodeId)
      .replace('{n2}', endNodeId);
    this.showToast(msg);

    this.recalculate(true);
  }

  setViewMode(mode) {
    this.frameData.currentView = mode;
    document.querySelectorAll('.radio-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === mode);
    });
    this.renderer.setData(this.frameData, this.solution, mode);
  }

  recalculate(saveHistory = true) {
    if (saveHistory) {
      this.saveHistoryState();
    }

    try {
      const solver = new FrameSolver(this.frameData);
      this.solution = solver.solve();
      this.renderer.setData(this.frameData, this.solution, this.frameData.currentView || 'reactions');
      this.updateStatusEquilibrium();
      this.renderTables();

      // Autosave
      try {
        localStorage.setItem('polyframe_autosave_model', JSON.stringify(this.frameData));
      } catch (e) {}
    } catch (err) {
      console.error("Frame calculation error:", err);
    }
  }

  updateStatusEquilibrium() {
    if (!this.statusEquilibrium) this.statusEquilibrium = document.getElementById('statusEquilibrium');
    if (!this.statusEquilibrium) return;

    if (!this.solution || !this.solution.isStable) {
      this.statusEquilibrium.innerHTML = `
        <span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded font-bold text-[11.5px]">${this.t.statusUnstable}</span>
      `;
      return;
    }

    const det = this.solution.determinacy;
    const n = det ? (det.degree || 0) : 0;

    if (n === 0) {
      this.statusEquilibrium.innerHTML = `
        <span class="status-badge-ok">${this.t.statusDeterminate}</span>
        <span class="text-slate-500 text-[11.5px]">ΣFx = 0, ΣFz = 0, ΣM = 0</span>
      `;
    } else if (n > 0) {
      const text = this.t.statusIndeterminate.replace('{n}', n);
      this.statusEquilibrium.innerHTML = `
        <span class="status-badge-indeterminate">${text}</span>
        <span class="text-slate-500 text-[11.5px]">ΣFx = 0, ΣFz = 0, ΣM = 0</span>
      `;
    } else {
      this.statusEquilibrium.innerHTML = `
        <span class="bg-red-100 text-red-800 px-2.5 py-0.5 rounded font-bold text-[11.5px]">${this.t.statusUnstable}</span>
      `;
    }
  }

  updateStatusBarCursor(hoverInfo) {
    if (!hoverInfo || !this.solution || !this.solution.isStable) {
      this.statusElem.textContent = 'Elem: -';
      this.statusN.textContent = 'N = -';
      this.statusT.textContent = 'T = -';
      this.statusM.textContent = 'M = -';
      return;
    }

    this.statusElem.textContent = `${hoverInfo.elementId} (s = ${formatNum(hoverInfo.s)}m)`;
    this.statusN.textContent = `N = ${formatNum(hoverInfo.N)} kN`;
    this.statusT.textContent = `T = ${formatNum(hoverInfo.T)} kN`;
    this.statusM.textContent = `M = ${formatNum(hoverInfo.M)} kNm`;
  }

  renderTables() {
    this.renderNodesTable();
    this.renderElementsTable();
    this.renderNodalLoadsTable();
    this.renderDistLoadsTable();
  }

  renderNodesTable() {
    this.tableNodes.innerHTML = '';
    const t = this.t;

    (this.frameData.nodes || []).forEach((node, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" class="poly-input text-center font-bold text-blue-700 font-mono text-[11.5px]" value="${node.id}" placeholder="0" data-field="id"></td>
        <td><input type="number" step="0.5" class="poly-input text-center font-mono font-bold" value="${node.x}" placeholder="0" data-field="x"></td>
        <td><input type="number" step="0.5" class="poly-input text-center font-mono font-bold" value="${node.z}" placeholder="0" data-field="z"></td>
        <td>
          <select class="poly-input text-[11px] font-medium" data-field="support">
            <option value="none" ${node.support === 'none' ? 'selected' : ''}>${t.supportNone}</option>
            <option value="pin" ${node.support === 'pin' ? 'selected' : ''}>${t.supportPin}</option>
            <option value="roller_x" ${node.support === 'roller_x' ? 'selected' : ''}>${t.supportRollerX}</option>
            <option value="roller_z" ${node.support === 'roller_z' ? 'selected' : ''}>${t.supportRollerZ}</option>
            <option value="fixed" ${node.support === 'fixed' ? 'selected' : ''}>${t.supportFixed}</option>
          </select>
        </td>
        <td><button class="btn-icon-del">✕</button></td>
      `;

      tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          const oldId = this.frameData.nodes[idx].id;
          const val = field === 'id' ? e.target.value.trim() : (parseFloat(e.target.value) || 0);
          if (field === 'id' && val && val !== oldId) {
            (this.frameData.elements || []).forEach(el => {
              if (el.nodeI === oldId) el.nodeI = val;
              if (el.nodeJ === oldId) el.nodeJ = val;
            });
            (this.frameData.nodalLoads || []).forEach(nl => {
              if (nl.nodeId === oldId) nl.nodeId = val;
            });
          }
          this.frameData.nodes[idx][field] = val;
          this.recalculate(true);
        });
      });

      tr.querySelector('select').addEventListener('change', (e) => {
        this.frameData.nodes[idx].support = e.target.value;
        this.recalculate(true);
      });

      tr.querySelector('.btn-icon-del').addEventListener('click', () => {
        const delId = this.frameData.nodes[idx].id;
        this.frameData.nodes.splice(idx, 1);
        this.frameData.elements = (this.frameData.elements || []).filter(el => el.nodeI !== delId && el.nodeJ !== delId);
        this.frameData.nodalLoads = (this.frameData.nodalLoads || []).filter(nl => nl.nodeId !== delId);
        this.recalculate(true);
      });

      this.tableNodes.appendChild(tr);
    });
  }

  renderElementsTable() {
    this.tableElements.innerHTML = '';
    const nodeIds = (this.frameData.nodes || []).map(n => n.id);

    (this.frameData.elements || []).forEach((elem, idx) => {
      const tr = document.createElement('tr');
      const optI = nodeIds.map(nid => `<option value="${nid}" ${elem.nodeI === nid ? 'selected' : ''}>${nid}</option>`).join('');
      const optJ = nodeIds.map(nid => `<option value="${nid}" ${elem.nodeJ === nid ? 'selected' : ''}>${nid}</option>`).join('');

      const labelI = elem.nodeI || 'i';
      const labelJ = elem.nodeJ || 'j';

      tr.innerHTML = `
        <td><input type="text" class="poly-input text-center font-bold text-slate-800 font-mono text-[11.5px]" value="${elem.id}" placeholder="0" data-field="id"></td>
        <td><select class="poly-input text-[11px] font-bold" data-field="nodeI">${optI}</select></td>
        <td><select class="poly-input text-[11px] font-bold" data-field="nodeJ">${optJ}</select></td>
        <td><input type="number" step="0.1" min="0.01" class="poly-input text-center font-bold text-purple-700 font-mono text-[11.5px]" value="${elem.EJ !== undefined ? elem.EJ : 1.0}" placeholder="0" data-field="EJ"></td>
        <td>
          <div class="flex items-center justify-center gap-2 text-[10.5px]">
            <label class="flex items-center gap-1 cursor-pointer" title="Hinge at ${labelI} (Start Node)">
              <input type="checkbox" class="poly-checkbox" ${elem.hingeI ? 'checked' : ''} data-field="hingeI">
              <span class="font-mono font-bold text-blue-700">${labelI}</span>
            </label>
            <label class="flex items-center gap-1 cursor-pointer" title="Hinge at ${labelJ} (End Node)">
              <input type="checkbox" class="poly-checkbox" ${elem.hingeJ ? 'checked' : ''} data-field="hingeJ">
              <span class="font-mono font-bold text-blue-700">${labelJ}</span>
            </label>
          </div>
        </td>
        <td><button class="btn-icon-del">✕</button></td>
      `;

      tr.querySelector('input[data-field="id"]').addEventListener('change', (e) => {
        const oldElemId = this.frameData.elements[idx].id;
        const newElemId = e.target.value.trim();
        if (newElemId && newElemId !== oldElemId) {
          (this.frameData.distLoads || []).forEach(dl => {
            if (dl.elementId === oldElemId) dl.elementId = newElemId;
          });
        }
        this.frameData.elements[idx].id = newElemId;
        this.recalculate(true);
      });

      const inpEJ = tr.querySelector('input[data-field="EJ"]');
      if (inpEJ) {
        inpEJ.addEventListener('change', (e) => {
          this.frameData.elements[idx].EJ = parseFloat(e.target.value) || 1.0;
          this.recalculate(true);
        });
      }

      tr.querySelectorAll('select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          this.frameData.elements[idx][field] = e.target.value;
          this.recalculate(true);
        });
      });

      tr.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          const isChecked = e.target.checked;
          this.frameData.elements[idx][field] = isChecked;

          // Rule: Only one hinge could be set at one node!
          if (isChecked) {
            const targetNodeId = field === 'hingeI' ? elem.nodeI : elem.nodeJ;
            this.frameData.elements.forEach((otherElem, oIdx) => {
              if (oIdx !== idx) {
                if (otherElem.nodeI === targetNodeId) otherElem.hingeI = false;
                if (otherElem.nodeJ === targetNodeId) otherElem.hingeJ = false;
              }
            });
            this.renderElementsTable();
          }

          this.recalculate(true);
        });
      });

      tr.querySelector('.btn-icon-del').addEventListener('click', () => {
        const delElemId = this.frameData.elements[idx].id;
        this.frameData.elements.splice(idx, 1);
        this.frameData.distLoads = (this.frameData.distLoads || []).filter(dl => dl.elementId !== delElemId);
        this.recalculate(true);
      });

      this.tableElements.appendChild(tr);
    });
  }

  renderNodalLoadsTable() {
    this.tableNodalLoads.innerHTML = '';
    const nodeIds = (this.frameData.nodes || []).map(n => n.id);

    (this.frameData.nodalLoads || []).forEach((nl, idx) => {
      const tr = document.createElement('tr');
      const opt = nodeIds.map(nid => `<option value="${nid}" ${nl.nodeId === nid ? 'selected' : ''}>${nid}</option>`).join('');

      tr.innerHTML = `
        <td><select class="poly-input text-[11px] font-bold" data-field="nodeId">${opt}</select></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-red-600 font-mono" value="${nl.Fx || 0}" placeholder="0" data-field="Fx"></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-red-600 font-mono" value="${nl.Fz || 0}" placeholder="0" data-field="Fz"></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-amber-600 font-mono" value="${nl.M || 0}" placeholder="0" data-field="M"></td>
        <td><button class="btn-icon-del">✕</button></td>
      `;

      tr.querySelector('select').addEventListener('change', (e) => {
        this.frameData.nodalLoads[idx].nodeId = e.target.value;
        this.recalculate(true);
      });

      tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          this.frameData.nodalLoads[idx][field] = parseFloat(e.target.value) || 0;
          this.recalculate(true);
        });
      });

      tr.querySelector('.btn-icon-del').addEventListener('click', () => {
        this.frameData.nodalLoads.splice(idx, 1);
        this.recalculate(true);
      });

      this.tableNodalLoads.appendChild(tr);
    });
  }

  renderDistLoadsTable() {
    this.tableDistLoads.innerHTML = '';
    const elemIds = (this.frameData.elements || []).map(e => e.id);

    (this.frameData.distLoads || []).forEach((dl, idx) => {
      const tr = document.createElement('tr');
      const opt = elemIds.map(eid => `<option value="${eid}" ${dl.elementId === eid ? 'selected' : ''}>${eid}</option>`).join('');

      tr.innerHTML = `
        <td><select class="poly-input text-[11px] font-bold" data-field="elementId">${opt}</select></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-red-600 font-mono" value="${dl.qx || 0}" placeholder="0" data-field="qx"></td>
        <td><input type="number" step="1" class="poly-input text-center font-bold text-red-600 font-mono" value="${dl.qz || 0}" placeholder="0" data-field="qz"></td>
        <td><button class="btn-icon-del">✕</button></td>
      `;

      tr.querySelector('select').addEventListener('change', (e) => {
        this.frameData.distLoads[idx].elementId = e.target.value;
        this.recalculate(true);
      });

      tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          this.frameData.distLoads[idx][field] = parseFloat(e.target.value) || 0;
          this.recalculate(true);
        });
      });

      tr.querySelector('.btn-icon-del').addEventListener('click', () => {
        this.frameData.distLoads.splice(idx, 1);
        this.recalculate(true);
      });

      this.tableDistLoads.appendChild(tr);
    });
  }

  /* ---------------- Modal Add Dialogs ---------------- */

  openAddNodeModal() {
    const t = this.t;
    const nextIdx = (this.frameData.nodes.length + 1);
    this.modalAddElementTitle.textContent = t.modalAddNodeTitle;
    this.modalAddElementBody.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">${t.nodeIdLabel}</label>
          <input type="text" id="inpAddNodeId" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="N${nextIdx}" placeholder="0">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">${t.coordXLabel}</label>
            <input type="number" id="inpAddNodeX" step="0.5" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="0" placeholder="0">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">${t.coordZLabel}</label>
            <input type="number" id="inpAddNodeZ" step="0.5" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="0" placeholder="0">
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">${t.supportTypeLabel}</label>
          <select id="inpAddNodeSupport" class="poly-input text-left font-medium text-xs px-3 py-2">
            <option value="none">${t.supportNone}</option>
            <option value="pin">${t.supportPin}</option>
            <option value="roller_x">${t.supportRollerX}</option>
            <option value="roller_z">${t.supportRollerZ}</option>
            <option value="fixed">${t.supportFixed}</option>
          </select>
        </div>
      </div>
    `;

    this.currentAddConfirmHandler = () => {
      const nid = document.getElementById('inpAddNodeId').value.trim() || `N${Date.now()}`;
      const x = parseFloat(document.getElementById('inpAddNodeX').value) || 0;
      const z = parseFloat(document.getElementById('inpAddNodeZ').value) || 0;
      const support = document.getElementById('inpAddNodeSupport').value;

      this.frameData.nodes.push({ id: nid, x, z, support });
      this.closeAddElementModal();
      this.recalculate(true);
    };

    this.modalAddElement.classList.add('open');
  }

  openAddElementModal() {
    const t = this.t;
    const nextIdx = (this.frameData.elements.length + 1);
    const nodeIds = this.frameData.nodes.map(n => n.id);
    const optI = nodeIds.map((nid, i) => `<option value="${nid}" ${i === 0 ? 'selected' : ''}>${nid}</option>`).join('');
    const optJ = nodeIds.map((nid, i) => `<option value="${nid}" ${i === 1 ? 'selected' : ''}>${nid}</option>`).join('');

    this.modalAddElementTitle.textContent = t.modalAddElemTitle;
    this.modalAddElementBody.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">${t.elemIdLabel}</label>
          <input type="text" id="inpAddElemId" class="poly-input text-left font-mono font-bold text-sm px-3 py-2" value="E${nextIdx}" placeholder="0">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">${t.nodeILabel}</label>
            <select id="inpAddElemNodeI" class="poly-input text-left font-medium text-xs px-3 py-2">${optI}</select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">${t.nodeJLabel}</label>
            <select id="inpAddElemNodeJ" class="poly-input text-left font-medium text-xs px-3 py-2">${optJ}</select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">${t.elemEJCol || 'Flexural Rigidity EJ'}</label>
          <input type="number" id="inpAddElemEJ" step="0.1" min="0.01" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-purple-700" value="1.0" placeholder="0">
        </div>
        <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
          <label class="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" id="inpAddElemHingeI" class="poly-checkbox"> ${t.hingeILabel}
          </label>
          <label class="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" id="inpAddElemHingeJ" class="poly-checkbox"> ${t.hingeJLabel}
          </label>
        </div>
      </div>
    `;

    this.currentAddConfirmHandler = () => {
      const eid = document.getElementById('inpAddElemId').value.trim() || `E${Date.now()}`;
      const nodeI = document.getElementById('inpAddElemNodeI').value;
      const nodeJ = document.getElementById('inpAddElemNodeJ').value;
      const EJ = parseFloat(document.getElementById('inpAddElemEJ').value) || 1.0;
      const hingeI = document.getElementById('inpAddElemHingeI').checked;
      const hingeJ = document.getElementById('inpAddElemHingeJ').checked;

      // Enforce at most one hinge per node
      if (hingeI) {
        this.frameData.elements.forEach(otherElem => {
          if (otherElem.nodeI === nodeI) otherElem.hingeI = false;
          if (otherElem.nodeJ === nodeI) otherElem.hingeJ = false;
        });
      }
      if (hingeJ) {
        this.frameData.elements.forEach(otherElem => {
          if (otherElem.nodeI === nodeJ) otherElem.hingeI = false;
          if (otherElem.nodeJ === nodeJ) otherElem.hingeJ = false;
        });
      }

      this.frameData.elements.push({ id: eid, nodeI, nodeJ, EJ, hingeI, hingeJ });
      this.closeAddElementModal();
      this.recalculate(true);
    };

    this.modalAddElement.classList.add('open');
  }

  openAddNodalLoadModal() {
    const t = this.t;
    const nodeIds = this.frameData.nodes.map(n => n.id);
    const opt = nodeIds.map(nid => `<option value="${nid}">${nid}</option>`).join('');

    this.modalAddElementTitle.textContent = t.modalAddNodalLoadTitle;
    this.modalAddElementBody.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">${t.targetNodeLabel}</label>
          <select id="inpAddNodalLoadNode" class="poly-input text-left font-medium text-xs px-3 py-2">${opt}</select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">${t.forceFxLabel}</label>
            <input type="number" id="inpAddNodalFx" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-red-600" value="0" placeholder="0">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">${t.forceFzLabel}</label>
            <input type="number" id="inpAddNodalFz" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-red-600" value="0" placeholder="0">
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">${t.momentMLabel}</label>
          <input type="number" id="inpAddNodalM" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-amber-600" value="0" placeholder="0">
        </div>
      </div>
    `;

    this.currentAddConfirmHandler = () => {
      const nodeId = document.getElementById('inpAddNodalLoadNode').value;
      const Fx = parseFloat(document.getElementById('inpAddNodalFx').value) || 0;
      const Fz = parseFloat(document.getElementById('inpAddNodalFz').value) || 0;
      const M = parseFloat(document.getElementById('inpAddNodalM').value) || 0;

      this.frameData.nodalLoads.push({ id: `L_${Date.now()}`, nodeId, Fx, Fz, M });
      this.closeAddElementModal();
      this.recalculate(true);
    };

    this.modalAddElement.classList.add('open');
  }

  openAddDistLoadModal() {
    const t = this.t;
    const elemIds = this.frameData.elements.map(e => e.id);
    const opt = elemIds.map(eid => `<option value="${eid}">${eid}</option>`).join('');

    this.modalAddElementTitle.textContent = t.modalAddDistLoadTitle;
    this.modalAddElementBody.innerHTML = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">${t.targetElemLabel}</label>
          <select id="inpAddDistElem" class="poly-input text-left font-medium text-xs px-3 py-2">${opt}</select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">${t.distQxLabel}</label>
            <input type="number" id="inpAddDistQx" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-red-600" value="0" placeholder="0">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">${t.distQzLabel}</label>
            <input type="number" id="inpAddDistQz" step="1" class="poly-input text-left font-mono font-bold text-sm px-3 py-2 text-red-600" value="0" placeholder="0">
          </div>
        </div>
      </div>
    `;

    this.currentAddConfirmHandler = () => {
      const elementId = document.getElementById('inpAddDistElem').value;
      const qx = parseFloat(document.getElementById('inpAddDistQx').value) || 0;
      const qz = parseFloat(document.getElementById('inpAddDistQz').value) || 0;

      this.frameData.distLoads.push({ id: `D_${Date.now()}`, elementId, qx, qz, mode: 'proj_z' });
      this.closeAddElementModal();
      this.recalculate(true);
    };

    this.modalAddElement.classList.add('open');
  }

  closeAddElementModal() {
    this.modalAddElement.classList.remove('open');
    this.currentAddConfirmHandler = null;
  }

  /* ---------------- Other Modals ---------------- */

  openCalcDetailsModal() {
    const reportHtml = generateStepByStepReport(this.frameData, this.solution, this.lang);
    this.modalCalcBody.innerHTML = reportHtml;
    this.modalCalcDetails.classList.add('open');

    if (window.renderMathInElement) {
      window.renderMathInElement(this.modalCalcBody, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
  }

  closeCalcDetailsModal() {
    this.modalCalcDetails.classList.remove('open');
  }

  openTemplatesModal() {
    this.showHeroOverlay();
  }

  closeTemplatesModal() {
    this.modalTemplates.classList.remove('open');
  }

  loadPreset(preset) {
    if (this.isDrawNodeMode) this.setDrawNodeMode(false);
    if (this.isDrawElementMode) this.setDrawElementMode(false);
    this.frameData = JSON.parse(JSON.stringify(preset.data));
    const targetView = this.frameData.currentView || 'reactions';
    this.renderer.resetZoom();
    this.recalculate(true);
    this.setViewMode(targetView);
  }

  clearCanvasToEmptyPreset() {
    this.saveHistoryState();
    this.loadPreset(EMPTY_FRAME_PRESET);
    if (this.canvasPresetsOverlay) {
      this.hideHeroOverlay();
    }
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    this.showToast(this.t.toastCanvasCleared || '🗑️ Canvas cleared — Empty frame ready');
  }

  showToast(message, duration = 3000) {
    if (!this.toastNotification) this.toastNotification = document.getElementById('toastNotification');
    if (!this.toastNotification) return;
    this.toastNotification.textContent = message;
    this.toastNotification.classList.add('show');
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      this.toastNotification.classList.remove('show');
    }, duration);
  }

  saveModelJSON() {
    try {
      const exportData = {
        version: "1.0",
        appName: "2D Frame Calculator",
        timestamp: new Date().toISOString(),
        data: this.frameData
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame_model_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast(this.t.toastSaveSuccess || '💾 Frame model saved as JSON file.');
    } catch (err) {
      console.error('Save model error:', err);
    }
  }

  loadModelJSON(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const data = json.data || json;
        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.elements)) {
          throw new Error('Invalid frame structure in JSON');
        }
        this.loadPreset({ data });
        this.hideHeroOverlay();
        this.showToast(this.t.toastLoadSuccess || '📂 Frame model loaded successfully!');
      } catch (err) {
        console.error('Error loading model JSON:', err);
        this.showToast(this.t.toastLoadError || '❌ Invalid JSON file format.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  copyShareLink() {
    try {
      const cleanData = {
        nodes: this.frameData.nodes,
        elements: this.frameData.elements,
        nodalLoads: this.frameData.nodalLoads,
        distLoads: this.frameData.distLoads,
        currentView: this.frameData.currentView
      };
      const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(cleanData)))));
      const shareUrl = `${window.location.origin}${window.location.pathname}#model=${encoded}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          this.showToast(this.t.toastShareSuccess || '🔗 Link copied to clipboard!');
        }).catch(() => {
          this.fallbackCopyLink(shareUrl);
        });
      } else {
        this.fallbackCopyLink(shareUrl);
      }
    } catch (err) {
      console.error('Error creating share link:', err);
      this.showToast(this.t.toastShareError || '❌ Failed to copy link.');
    }
  }

  fallbackCopyLink(text) {
    try {
      const temp = document.createElement('input');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      this.showToast(this.t.toastShareSuccess || '🔗 Link copied to clipboard!');
    } catch (err) {
      console.error('Fallback copy error:', err);
    }
  }

  checkUrlHashModel() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#model=')) {
      try {
        const encoded = hash.substring(7);
        const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
        const data = JSON.parse(jsonStr);
        if (data && Array.isArray(data.nodes) && Array.isArray(data.elements)) {
          this.loadPreset({ data });
          this.hideHeroOverlay();
          return true;
        }
      } catch (err) {
        console.warn('Could not decode URL model hash:', err);
      }
    }
    return false;
  }

  initDraggableModals() {
    const modalIds = ['modalCalcDetails', 'modalTemplates', 'modalAddElement'];

    modalIds.forEach(id => {
      const overlay = document.getElementById(id);
      if (!overlay) return;
      const content = overlay.querySelector('.modal-content');
      const header = overlay.querySelector('.modal-header');
      if (!content || !header) return;

      let isDragging = false;
      let startX = 0, startY = 0;
      let currentX = 0, currentY = 0;

      const onPointerDown = (e) => {
        // Do not drag if clicking interactive buttons / inputs / links
        if (e.target.closest('button, input, select, textarea, a, .btn-icon-del')) return;

        isDragging = true;
        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        startX = clientX - currentX;
        startY = clientY - currentY;
        header.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        currentX = clientX - startX;
        currentY = clientY - startY;
        content.style.transform = `translate(${currentX}px, ${currentY}px)`;
      };

      const onPointerUp = () => {
        if (isDragging) {
          isDragging = false;
          header.style.cursor = 'grab';
          document.body.style.userSelect = '';
        }
      };

      header.addEventListener('mousedown', onPointerDown);
      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);

      header.addEventListener('touchstart', onPointerDown, { passive: true });
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);

      // Reset modal position to center whenever it is opened / closed
      const observer = new MutationObserver(() => {
        if (!overlay.classList.contains('open')) {
          currentX = 0;
          currentY = 0;
          content.style.transform = '';
        }
      });
      observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    });
  }

  exportPNG() {
    const canvas = document.getElementById('frameCanvas');
    const link = document.createElement('a');
    link.download = `2D_Frame_${this.frameData.currentView}_diagram.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}

function initApp() {
  try {
    if (!window.app) {
      window.app = new FrameCalculatorApp();
      console.log('✅ FrameCalculatorApp successfully initialized.');
    }
  } catch (err) {
    console.error('❌ Error initializing FrameCalculatorApp:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
