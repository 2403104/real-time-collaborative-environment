SYNC PROJECT - SETUP GUIDE
==========================

PREREQUISITES
-------------
- Node.js (v18+)
- VS Code
- MongoDB: already configured in .env (Atlas)


STEP 1 - Install Server Dependencies
-------------------------------------
    cd sync-project/server(go to server directory)
    npm install


STEP 2 - Environment File (create .env file and put the content given below )
--------------------------
The server/.env file should contain:
    PORT=8080
    NODE_ENV=development

    MONGO_URI=mongodb+srv://admin:YT2tZMiYv8hSayp5@cluster0.5gqni.mongodb.net/syncdb?retryWrites=true&w=majority&appName=Cluster0

    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379

    ENGINE_PATH=../../cpp-engine/build/Release/engine.node
    REDIS_SNAPSHOT_INTERVAL=6000
    MONGO_SAVE_INTERVAL=3000

Note: cpp-engine is already compiled, no build needed.


STEP 3 - Start the Server
--------------------------
    cd sync-project/server
    npm run dev

Expected output:
    [MongoDB] Connected.
    [Server] Listening on port 8080
    [Server] Live WS endpoint: ws://localhost:8080/live
    [Server] Sync WS endpoint: ws://localhost:8080/sync


STEP 4 - Install the VS Code Extension
----------------------------------------
Option A (terminal):
    code --install-extension sync-project/sync-extension-0.0.1.vsix

Option B (manual):
    1. Open VS Code
    2. Ctrl+Shift+P -> "Extensions: Install from VSIX..."
    3. Select the .vsix file from the main directory (given you in the main directory)


STEP 5 - Reload VS Code
------------------------
    Ctrl+Shift+P -> "Developer: Reload Window"

Installation complete.

**
If you want to make changes in extension, then after making changes , save the changed file.
Uninstall previous extension first (from extension tab)

run the commnad: 
  code --uninstall-extension ankit.sync-extension
  npm run build
  vsce package
  code --install-extension sync-extension-0.0.1.vsix

This is install in the system you are working on. 
To install globally install from vsix tab.
**



TESTING THE Project
----------------------

1. Open two separate VS Code windows
   (File -> New Window, not split editor in the same window)


2. In the FIRST window:
   - Press Ctrl+Shift+P
   - Type and run: Sync: New Session
   - Two files will be created automatically:
       .gitignore
       .sync.json
   - Open .sync.json and copy the sessionKey value


3. In the SECOND window:
   - Press Ctrl+Shift+P
   - Type and run: Sync: Join Existing Session
   - Paste the sessionKey you copied


4. Start editing in either window and observe changes syncing live.

You can repeat this with as many VS Code windows as you want —
each one just needs to join with the same session key.


IMPORTANT
----------
Do NOT use VS Code auto-complete or snippet expansion while testing.

For example: typing "wh" and pressing Enter to expand it into "while"
is not handled. Type your code manually and in full.


Thank you!



