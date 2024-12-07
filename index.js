const { spawn } = require('child_process');
const http = require("http")
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

let users = 0;
const maxUsers = 2;

function switch_off_server (server) {
    server.close(err => { // callback functions doesn't work, why ?
        if (err)
            throw err;
        else
            console.log("Servered closed");
    });
    process.exit(0);
}

// sending static files to the client
const http_server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);

    let contentType = 'text/html';
    if (extname === '.css') contentType = 'text/css';
    else if (extname === '.js') contentType = 'application/javascript';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});



const engine_name = './Checkmate_CPP/chess_engine';
const chessEngine = spawn(engine_name);
let game_end = false;

chessEngine.stdout.on('data', (data) => {
    try {
        const jsonResponse = JSON.parse(data.toString());
        if (jsonResponse["game_end"] === "true") {
            game_end = true;
        }
        console.log("Engine Response:", jsonResponse);
    } catch (err) {
        console.error("Invalid JSON response:", response, err.message);
    }
});

chessEngine.on('close', (code) => {
    console.log(`Chess engine exited with code ${code}`);
});

(async () => {
    if (game_end)
    {
        console.log("game ended");
        chessEngine.stdin.end();
        process.exit(0);
    }
})();

// activating websocket
const server = new WebSocket.Server({ server: http_server });

server.on ("connection", (ws) => { // ws is connected client
    ++users;
    console.log("Try to connect...");
    if (users > maxUsers)
        switch_off_server(server);
    else
        console.log("Someone connected...");

    ws.on("close", () => {
        --users;
        console.log("Someone disconnected...");
    });

    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === "update_board") {
                server.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            "type" : "update_board",
                            "startSquare" : message.startSquare,
                            "endSquare" : message.endSquare
                        }));
                    }
                });
            }
            else if (message.type === "move") {
                console.log(message);
                chessEngine.stdin.write(JSON.stringify(message) + '\n');
            }
        }
        catch (err) {
            console.error("There is error: ", err);
        }
    });
});

server.on("error", (err) => {
    console.error("Server error:", err);
});

http_server.listen(8080, () => {
    console.log("Listening port 8080...");
});