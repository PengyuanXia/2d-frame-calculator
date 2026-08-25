/**
 * 2D Frame Calculator - Internationalization (i18n)
 * Coordinate system: x (horizontal right), z (vertical down)
 * Notation: N for normal force, T for shear force, M for bending moment, EJ for flexural rigidity.
 * Default language: English (en).
 */

export const TRANSLATIONS = {
  en: {
    appTitle: '2D Frame Calculator',
    greeting: 'Direct Stiffness Method (EJ = 1)',
    presetsBtn: '📚 Presets',
    undoBtn: '↶ Undo (Ctrl+Z)',
    redoBtn: '↷ Redo (Ctrl+Y)',
    saveModelBtn: '💾 Save',
    loadModelBtn: '📂 Load',
    shareBtn: '🔗 Share',
    exportPngBtn: 'Export PNG',
    toastSaveSuccess: '💾 Frame model saved as JSON file.',
    toastLoadSuccess: '📂 Frame model successfully loaded!',
    toastLoadError: '❌ Failed to load file: Invalid JSON format.',
    toastShareSuccess: '🔗 Shareable link copied to clipboard!',
    toastShareError: '❌ Failed to copy link to clipboard.',
    
    // View modes
    reactionsView: 'Structure & Reactions',
    normalView: 'Normal Force N(s)',
    shearView: 'Shear Force T(s)',
    momentView: 'Bending Moment M(s)',
    calcReportBtn: 'Calculation Report',
    langBtn: '🌐 EN / PL',
    kofiBtn: 'Buy me a coffee',
    kofiTitle: 'Buy me a coffee on Ko-fi',

    // Hero Welcome Overlay on Canvas
    heroWelcomeTitle: 'Select a Frame Configuration to Start',
    heroWelcomeSubtitle: 'Choose a benchmark template to instantly view reactions, Normal Force N, Shear Force T, and Bending Moment M diagrams.',
    blankFrameTitle: 'Empty Frame (Create from Scratch)',
    blankFrameDesc: 'Start with a completely empty canvas with no preset elements to build your structure from scratch.',
    
    // Sidebar Cards
    nodesTitle: 'Nodes (Coordinates x, z)',
    nodeIdCol: 'Node',
    nodeXCol: 'x [m]',
    nodeZCol: 'z [m]',
    nodeSupportCol: 'Support',
    addNodeBtn: '+ Add Node',
    
    elementsTitle: 'Members (Elements)',
    elemIdCol: 'Elem',
    elemNodeICol: 'From',
    elemNodeJCol: 'To',
    elemHingesCol: 'Hinges',
    elemEJCol: 'EJ',
    addElemBtn: '+ Add Member',

    nodalLoadsTitle: 'Nodal Loads & Moments',
    loadNodeCol: 'Node',
    loadFxCol: 'Fx [kN]',
    loadFzCol: 'Fz [kN]',
    loadMCol: 'M [kNm]',
    addNodalLoadBtn: '+ Add Nodal Load',

    distLoadsTitle: 'Distributed Loads',
    distElemCol: 'Elem',
    distQxCol: 'qx [kN/m]',
    distQzCol: 'qz [kN/m]',
    addDistLoadBtn: '+ Add Distributed Load',

    sidebarBadge: '2D Frame Calculator',
    sidebarSubBadge: 'Direct Stiffness Method (EJ = 1)',

    // Support Types
    supportNone: 'Free',
    supportPin: 'Pin (Rx, Rz)',
    supportRollerX: 'Roller X (free X, fixed Z)',
    supportRollerZ: 'Roller Z (free Z, fixed X)',
    supportFixed: 'Fixed (Rx, Rz, M)',

    // Modal Add Dialogs
    modalAddNodeTitle: 'Add New Node',
    modalAddElemTitle: 'Add New Member',
    modalAddNodalLoadTitle: 'Add Nodal Force / Moment',
    modalAddDistLoadTitle: 'Add Distributed Load',
    nodeIdLabel: 'Node ID',
    elemIdLabel: 'Member ID',
    coordXLabel: 'Horizontal Coordinate x [m]',
    coordZLabel: 'Vertical Coordinate z [m]',
    supportTypeLabel: 'Support Restraint',
    nodeILabel: 'Start Node (Node i)',
    nodeJLabel: 'End Node (Node j)',
    hingeILabel: 'Hinge at Node i',
    hingeJLabel: 'Hinge at Node j',
    ejValueLabel: 'Flexural Rigidity EJ',
    targetNodeLabel: 'Target Node',
    forceFxLabel: 'Horizontal Force Fx [kN] (+ right →)',
    forceFzLabel: 'Vertical Force Fz [kN] (+ down ↓)',
    momentMLabel: 'Concentrated Moment M [kNm] (+ clockwise ↻)',
    targetElemLabel: 'Target Member',
    distQxLabel: 'Horizontal Distributed Load qx [kN/m] (+ right →)',
    distQzLabel: 'Vertical Distributed Load qz [kN/m] (+ down ↓)',
    cancelBtn: 'Cancel',
    confirmAddBtn: 'Add to Frame',

    // Canvas
    watermark: '2D FRAME CALCULATOR',
    normalDiagramTitle: 'Normal Force Diagram N [kN]',
    shearDiagramTitle: 'Shear Force Diagram T [kN]',
    momentDiagramTitle: 'Bending Moment Diagram M [kNm]',
    coordSystemLabel: 'x -> (right), z v (down)',
    drawNodeBtn: '➕ Draw Node',
    drawNodeBtnActive: '📍 Click Canvas to Place Node (Esc)',
    toastNodeCreated: '📍 Node {id} created at ({x}m, {z}m)',
    toastNodeDuplicate: '⚠ A node already exists at this location',
    drawElementBtn: '🔗 Draw Element',
    drawElementBtnActive: '🔗 Click nodes to connect (Esc)',
    drawElementSelectStart: '① Click the START node',
    drawElementSelectEnd: '② Click the END node (from {id})',
    toastElementCreated: '🔗 Element {id} created: {n1} → {n2}',
    toastElementDuplicate: '⚠ Element already exists between these nodes',

    // Status bar & Warnings
    statusDeterminate: '✓ Statically Determinate (n = 0)',
    statusIndeterminate: '✓ Statically Indeterminate (n = {n})',
    statusUnstable: '⚠ Unstable Structure / Mechanism (No Results)',
    unstableBannerTitle: 'Structure is Geometrically Unstable',

    // Modal Calculation Report
    reportTitle: 'Frame Structural Calculation Report',
    section1Title: '1. Structural Geometry & Determinacy',
    section2Title: '2. Global Equilibrium & Reactions',
    section3Title: '3. Member End Forces (Local Coordinates)',
    section4Title: '4. Extreme Internal Forces Summary',
    classificationLabel: 'Structural Classification:',
    nodesCountLabel: 'Nodes Count:',
    membersCountLabel: 'Members Count:',
    supportsCountLabel: 'Supports Count:',
    statusLabel: 'Status:',
    sumFxEq: 'Horizontal Equilibrium (ΣFx = 0):',
    sumFzEq: 'Vertical Equilibrium (ΣFz = 0):',
    sumMEq: 'Moment Equilibrium (origin (0,0)):',
    supportNodeCol: 'Support Node',
    locCol: 'Location (x, z) [m]',
    rxCol: 'Reaction Rx [kN]',
    rzCol: 'Reaction Rz [kN]',
    mrCol: 'Reaction Moment MR [kNm]',
    memberCol: 'Member',
    nodeIForcesCol: 'Node i [Ni, Ti, Mi]',
    nodeJForcesCol: 'Node j [Nj, Tj, Mj]',
    closeBtn: 'Close',
    printBtn: 'Print / Export PDF',
    presetsModalTitle: '📚 Benchmark Frame Presets'
  },

  pl: {
    appTitle: 'Kalkulator Ram 2D',
    greeting: 'Metoda Sztywności (EJ = 1)',
    presetsBtn: '📚 Przykłady',
    undoBtn: '↶ Cofnij (Ctrl+Z)',
    redoBtn: '↷ Ponów (Ctrl+Y)',
    saveModelBtn: '💾 Zapisz',
    loadModelBtn: '📂 Wczytaj',
    shareBtn: '🔗 Udostępnij',
    exportPngBtn: 'Eksportuj PNG',
    toastSaveSuccess: '💾 Model ramy zapisany jako plik JSON.',
    toastLoadSuccess: '📂 Model ramy wczytany pomyślnie!',
    toastLoadError: '❌ Błąd odczytu pliku: Niepoprawny format JSON.',
    toastShareSuccess: '🔗 Link skopiowany do schowka!',
    toastShareError: '❌ Nie udało się skopiować linku do schowka.',
    
    // View modes
    reactionsView: 'Schemat i Reakcje',
    normalView: 'Siły osiowe N(s)',
    shearView: 'Siły tnące T(s)',
    momentView: 'Momenty zginające M(s)',
    calcReportBtn: 'Raport obliczeniowy',
    langBtn: '🌐 PL / EN',
    kofiBtn: 'Postaw mi kawę',
    kofiTitle: 'Postaw mi kawę na Ko-fi',

    // Hero Welcome Overlay on Canvas
    heroWelcomeTitle: 'Wybierz schemat ramy na start',
    heroWelcomeSubtitle: 'Wybierz jeden z klasycznych schematów, aby natychmiast zobaczyć reakcje, wykres sił osiowych N, sił tnących T oraz momentów M.',
    blankFrameTitle: 'Pusty schemat (Czysta rama)',
    blankFrameDesc: 'Rozpocznij od pustego obszaru bez żadnych zdefiniowanych elementów, aby stworzyć własny schemat od zera.',
    
    // Sidebar Cards
    nodesTitle: 'Węzły ramy (Współrzędne x, z)',
    nodeIdCol: 'Węzeł',
    nodeXCol: 'x [m]',
    nodeZCol: 'z [m]',
    nodeSupportCol: 'Podpora',
    addNodeBtn: '+ Dodaj węzeł',
    
    elementsTitle: 'Pręty (Elementy ramy)',
    elemIdCol: 'Pręt',
    elemNodeICol: 'Od',
    elemNodeJCol: 'Do',
    elemHingesCol: 'Przeguby',
    elemEJCol: 'EJ',
    addElemBtn: '+ Dodaj pręt',

    nodalLoadsTitle: 'Siły i momenty węzłowe',
    loadNodeCol: 'Węzeł',
    loadFxCol: 'Fx [kN]',
    loadFzCol: 'Fz [kN]',
    loadMCol: 'M [kNm]',
    addNodalLoadBtn: '+ Dodaj siłę węzłową',

    distLoadsTitle: 'Obciążenia ciągłe prętów',
    distElemCol: 'Pręt',
    distQxCol: 'qx [kN/m]',
    distQzCol: 'qz [kN/m]',
    addDistLoadBtn: '+ Dodaj obciążenie ciągłe',

    sidebarBadge: 'Kalkulator Ram 2D',
    sidebarSubBadge: 'Metoda Sztywności (EJ = 1)',

    // Support Types
    supportNone: 'Swobodny',
    supportPin: 'Przegub (Rx, Rz)',
    supportRollerX: 'Podpora przesuwna X',
    supportRollerZ: 'Podpora przesuwna Z',
    supportFixed: 'Utwierdzenie (Rx, Rz, M)',

    // Modal Add Dialogs
    modalAddNodeTitle: 'Dodaj nowy węzeł',
    modalAddElemTitle: 'Dodaj nowy pręt',
    modalAddNodalLoadTitle: 'Dodaj siłę / moment w węźle',
    modalAddDistLoadTitle: 'Dodaj obciążenie ciągłe na pręcie',
    nodeIdLabel: 'Nazwa węzła',
    elemIdLabel: 'Nazwa pręta',
    coordXLabel: 'Współrzędna pozioma x [m]',
    coordZLabel: 'Współrzędna pionowa z [m]',
    supportTypeLabel: 'Warunek podparcia',
    nodeILabel: 'Węzeł początkowy (Węzeł i)',
    nodeJLabel: 'Węzeł końcowy (Węzeł j)',
    hingeILabel: 'Przegub w węźle i',
    hingeJLabel: 'Przegub w węźle j',
    ejValueLabel: 'Sztywność na zginanie EJ',
    targetNodeLabel: 'Węzeł docelowy',
    forceFxLabel: 'Siła pozioma Fx [kN] (+ w prawo →)',
    forceFzLabel: 'Siła pionowa Fz [kN] (+ w dół ↓)',
    momentMLabel: 'Moment skupiony M [kNm] (+ zgodnie z zegarem ↻)',
    targetElemLabel: 'Pręt docelowy',
    distQxLabel: 'Obciążenie poziome qx [kN/m] (+ w prawo →)',
    distQzLabel: 'Obciążenie pionowe qz [kN/m] (+ w dół ↓)',
    cancelBtn: 'Anuluj',
    confirmAddBtn: 'Dodaj do ramy',

    // Canvas
    watermark: 'KALKULATOR RAM 2D',
    normalDiagramTitle: 'Wykres sił osiowych N [kN]',
    shearDiagramTitle: 'Wykres sił tnących T [kN]',
    momentDiagramTitle: 'Wykres momentów zginających M [kNm]',
    coordSystemLabel: 'x -> (w prawo), z v (w dół)',
    drawNodeBtn: '➕ Rysuj węzeł',
    drawNodeBtnActive: '📍 Kliknij na płótnie, aby dodać węzeł (Esc)',
    toastNodeCreated: '📍 Węzeł {id} utworzony w ({x}m, {z}m)',
    toastNodeDuplicate: '⚠ Węzeł już istnieje w tym punkcie',
    drawElementBtn: '🔗 Rysuj pręt',
    drawElementBtnActive: '🔗 Kliknij węzły, aby połączyć (Esc)',
    drawElementSelectStart: '① Kliknij węzeł STARTOWY',
    drawElementSelectEnd: '② Kliknij węzeł KOŃCOWY (od {id})',
    toastElementCreated: '🔗 Pręt {id} utworzony: {n1} → {n2}',
    toastElementDuplicate: '⚠ Pręt już istnieje między tymi węzłami',

    // Status bar & Warnings
    statusDeterminate: '✓ Układ statycznie wyznaczalny (n = 0)',
    statusIndeterminate: '✓ Układ statycznie niewyznaczalny (n = {n})',
    statusUnstable: '⚠ Układ geometrycznie zmienny / niestabilny (Brak wyników)',
    unstableBannerTitle: 'Układ jest geometrycznie zmienny',

    // Modal Calculation Report
    reportTitle: 'Sprawozdanie z Obliczeń Ramy Płaskiej',
    section1Title: '1. Geometria i Stopień Statycznej Niewyznaczalności',
    section2Title: '2. Równania Równowagi i Reakcje Podporowe',
    section3Title: '3. Siły Przekrojowe na Końcach Prętów (Układ Lokalny)',
    section4Title: '4. Zestawienie Wartości Ekstremalnych',
    classificationLabel: 'Klasyfikacja statyczna:',
    nodesCountLabel: 'Liczba węzłów:',
    membersCountLabel: 'Liczba prętów:',
    supportsCountLabel: 'Liczba podpór:',
    statusLabel: 'Status:',
    sumFxEq: 'Równowaga sił poziomych (ΣFx = 0):',
    sumFzEq: 'Równowaga sił pionowych (ΣFz = 0):',
    sumMEq: 'Równowaga momentów (względem (0,0)):',
    supportNodeCol: 'Węzeł podporowy',
    locCol: 'Położenie (x, z) [m]',
    rxCol: 'Reakcja pozioma Rx [kN]',
    rzCol: 'Reakcja pionowa Rz [kN]',
    mrCol: 'Moment w utwierdzeniu MR [kNm]',
    memberCol: 'Pręt',
    nodeIForcesCol: 'Węzeł i [Ni, Ti, Mi]',
    nodeJForcesCol: 'Węzeł j [Nj, Tj, Mj]',
    closeBtn: 'Zamknij',
    printBtn: 'Drukuj / Eksportuj PDF',
    presetsModalTitle: '📚 Przykłady Schematów Ram'
  }
};

export function getSavedLanguage() {
  return localStorage.getItem('polyframe_lang') || 'en';
}

export function setSavedLanguage(lang) {
  localStorage.setItem('polyframe_lang', lang);
}
