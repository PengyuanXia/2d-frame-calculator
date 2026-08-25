# 2D Frame Calculator Web App 🏛️📐

An interactive, responsive web application for **2D Plane Frame Structural Analysis**, tailored for civil and structural engineering students.

Built with vanilla JavaScript (ES Modules), HTML5 Canvas, Tailwind CSS, and KaTeX for instant, analytical structural mechanics calculations.

---

## ✨ Features

- **Direct Stiffness Method (DSM)**: Exact matrix analysis for 2D plane frames ( = 1$, rigid axial EA behavior).
- **Comprehensive Diagrams**:
  - **Reactions**: Global support reactions (, R_z, M_R$) and static equilibrium checks ($\Sigma F_x = 0, \Sigma F_z = 0, \Sigma M = 0$).
  - **Normal Force Diagram (s)$**: Axial tension and compression diagrams with peak value callouts.
  - **Shear Force Diagram (s)$**: Transverse shear force distribution.
  - **Bending Moment Diagram (s)$**: Drawn on the tension fiber side with exact parabolas for distributed loads.
- **Member Hinges**: Supports internal member moment hinges (at element ends and nodes).
- **Supports**: Fixed clamped (, z, \theta$), Pinned hinge (, z$), and Rollers ($ or $).
- **Loads**: Point forces (, F_z, M$) and distributed loads (, q_z$).
- **Interactive Canvas Tools**:
  - **➕ Draw Node**: Click on canvas with 0.5m grid snapping to place nodes.
  - **🔗 Draw Element**: Click nodes directly to connect structural members.
  - **Pan & Zoom**: Mouse drag and wheel controls with reset fit button.
- **Bilingual Interface**: Seamless 1-click toggle between **English (EN)** and **Polish (PL)** (N, T, M conventions).
- **LaTeX Step-by-Step Report**: Complete analytical equilibrium breakdown ready for printing or PDF export.
- **Benchmark Presets**: Built-in classic civil engineering frame homework problems.
- **Save / Load / Share**: Export/import JSON model files or generate instant shareable URL hash links.

---

## 🚀 Getting Started

### 1. Run with Python (Recommended)
No 
ode_modules or dependencies needed! Simply clone and run:

`ash
# Clone the repository
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>

# Start local server
python server.py
`
Open **[http://localhost:8001](http://localhost:8001)** in any modern browser.

### 2. Windows 1-Click
Double-click start.bat to launch the local server and open your browser automatically.

### 3. Deploy to GitHub Pages (Static Hosting)
Because this app runs 100% client-side in the browser, you can host it for free on **GitHub Pages**:
1. Go to your repository settings on GitHub.
2. Under **Pages** &rarr; **Build and deployment** &rarr; select **Deploy from a branch** (main / /root).
3. Your app will be live globally!

---

## 📁 Project Structure

`
├── css/
│   └── frame-calculator.css   # Modern UI and canvas overlay styling
├── js/
│   ├── constants.js          # Default frame data & support configurations
│   ├── frameSolver.js        # Direct Stiffness Method matrix solver
│   ├── i18n.js               # Full English and Polish dictionaries
│   ├── presets.js            # Benchmark engineering homework presets
│   ├── renderer.js           # Interactive Canvas renderer & diagrams
│   ├── stepByStep.js         # KaTeX analytical calculation report generator
│   └── ui.js                 # UI controller, event listeners, undo/redo
├── index.html                # Main application interface
├── package.json              # Project metadata
├── server.py                 # Lightweight zero-dependency HTTP server
├── start.bat                 # Windows quick launcher
└── README.md                 # Project documentation
`

---

## 📜 License

Distributed under the **MIT License**. See LICENSE for more information.
