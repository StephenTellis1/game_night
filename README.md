# League of Lag 2026

A competitive coding sabotage game where players introduce bugs into code snippets, and then fix bugs introduced by others.

## 🛠️ Prerequisites

To run this game on your laptop (Linux/Mac/PC), you need:

1.  **Node.js** (v18+) - [Download](https://nodejs.org/)
2.  **Git** - Version control.
3.  **GCC compiler** - Required for running C/C++ snippets.
    - *Linux*: `sudo apt install build-essential`
    - *Mac*: `xcode-select --install`
    - *Windows*: Install MinGW or use WSL.

## 📥 Setup & Sync

1.  **Clone the repository** (first time):
    ```bash
    git clone <YOUR_REPO_URL>
    cd league-of-lag
    ```

2.  **Sync latest changes** (updates):
    ```bash
    git pull origin main
    ```

3.  **Install dependencies**:
    ```bash
    npm install
    ```

## 🚀 How to Run

You need **two terminal windows**:

### Terminal 1: Game Server (Validation Core)
This handles game logic, C compilation, and scoring.
```bash
npm run server
```

### Terminal 2: Frontend (Game UI)
This hosts the web interface. 
**Note:** Runs on Port 80 (requires sudo privileges).
```bash
sudo npm run dev
```

Open your browser at `http://localhost` (or your Network IP shown in terminal).

## 📄 Documentation
- [DEPLOY.md](./DEPLOY.md): Detailed hosting guide.
