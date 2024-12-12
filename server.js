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

function send_all_clients_json (ob) {
    server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(ob));
        }
    });
}

// sending static files to the client
const http_server = http.createServer((req, res) => {
    if (users >= maxUsers) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Maximum connections quantity is 2');;
    }
    else {
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
    }
});

const engine_name = './Checkmate_CPP/chess_engine';
const chessEngine = spawn(engine_name);
let game_end = false;

chessEngine.on('close', (code) => {
    console.log(`Chess engine exited with code ${code}`);
    chessEngine.stdin.end();
});

// activating websocket
const server = new WebSocket.Server({ server: http_server });

server.on ("connection", (ws) => { // ws is connected client
    ++users;
    console.log("Someone connected...");

    ws.on("close", () => {
        --users;
        console.log("Someone disconnected...");
    });

    ws.on("message", (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === "move") {
                chessEngine.stdin.write(JSON.stringify(message) + '\n');
                chessEngine.stdout.once('data', (data) => {
                    try {
                        data = JSON.parse(data.toString("utf-8"));
                        if (data["game_end"] === "true") {
                            game_end = true;
                            send_all_clients_json({
                                "type" : "game_over",
                                "message" : "The game has ended. Thanks for playing!"
                            });
                        }
                        if (data["valid"] === "true") {
                            if (data["state"] === "castling") {
                                send_all_clients_json({
                                    "type" : "update_board",
                                    "move_state" : "castling",
                                    "startSquare" : message.startSquare,
                                    "endSquare" : message.endSquare,
                                    "rockStart" : data.rockStart,
                                    "rockEnd" : data.rockEnd
                                });
                            }
                            else {
                                send_all_clients_json({
                                    "type" : "update_board",
                                    "startSquare" : message.startSquare,
                                    "endSquare" : message.endSquare
                                });
                            }
                        }
                        else if (data["valid"] === "false") {

                        }
                        console.log("Engine Response:", data);
                    } catch (err) {
                        console.error("Invalid JSON response:", data, err.message);
                    }
                });
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