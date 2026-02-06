# Deploying League of Lag

Follow these steps to host the game on a new device (e.g., for the event).

## 1. Prerequisites
- **Node.js** (v18 or higher) must be installed.
- **Git** (optional, for cloning) or a USB drive to copy files.

## 2. Copy Files
Copy the entire `cseg` folder to the host machine.

## 3. Install Dependencies
Open a terminal in the `cseg` folder and run:
```bash
npm install
```

## 4. Run the Game
You need to run **two** separate terminals.

### Terminal 1: Game Server (Validation Logic)
This runs the backend, including the **Code Check Algorithm** (Diff + Execution Validation).
```bash
npm run server
```
*You should see: "Server running on port 3001"*

### Terminal 2: Frontend (Game UI)
This hosts the web interface for players to join.
```bash
sudo npm run dev
```
*You will see a "Network" IP address (e.g., `http://192.168.1.5`).*

## 5. Players Join
- Players should connect to the **Network IP** shown in Terminal 2 (e.g., `http://192.168.1.5`) using their browsers.
- Ensure all devices are on the same Wi-Fi.

## How the Code Check Algorithm Works
The game uses a **Hybrid Validation System**:
1.  **Diff Engine (`diffEngine.js`)**:
    - Compares line-by-line changes.
    - Ignores comment-only changes (server-side check).
    - Ensures 3-5 lines of code are modified.
2.  **Execution Sandbox (`server/index.js`)**:
    - In the Blue Round (Fix It), the server securely executes the submitted code.
    - It runs test cases against the code.
    - **Bonus:** +1 Point is awarded if the code runs successfully (no syntax/runtime errors).
    - **Verification:** It compares the output against the original snippet's expected output.
