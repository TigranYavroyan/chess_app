const ws = new WebSocket("ws://localhost:8080");
const board = document.getElementById('board');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let valid_move = null;

ws.onmessage = event => {
    const data = JSON.parse(event.data);
	if (data["type"] === "update_board") {
		const endSquare = Number(data.endSquare);
		const startSquare = Number(data.startSquare);
        console.log(startSquare, endSquare);
		const pickedPiece = board.children[startSquare].firstChild;

		const child = board.children[endSquare].firstChild;
        console.log(child);
		if (child)
			child.remove();
        console.log(board.children[endSquare], endSquare);
		board.children[endSquare].appendChild(pickedPiece);
		// board.children[startSquare].firstChild.remove();
	}
}

function draw_checkboard () {
    // Create the board
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');
        if (Math.floor(i / 8) % 2 === 0) {
            square.style.backgroundColor = i % 2 === 0 ? '#eeeed2' : '#769656';
        } else {
            square.style.backgroundColor = i % 2 === 0 ? '#769656' : '#eeeed2';
        }
        board.appendChild(square);
    }

    // Add pieces using Unicode characters
    const initialPositions = {
        0: '♜', 1: '♞', 2: '♝', 3: '♛', 4: '♚', 5: '♝', 6: '♞', 7: '♜',
        8: '♟', 9: '♟', 10: '♟', 11: '♟', 12: '♟', 13: '♟', 14: '♟', 15: '♟',
        48: '♙', 49: '♙', 50: '♙', 51: '♙', 52: '♙', 53: '♙', 54: '♙', 55: '♙',
        56: '♖', 57: '♘', 58: '♗', 59: '♕', 60: '♔', 61: '♗', 62: '♘', 63: '♖'
    };

    for (const [index, piece] of Object.entries(initialPositions)) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece');
        pieceElement.textContent = piece;
        const row = Math.floor(index / 8);
        const col = index % 8;
        pieceElement.dataset.row = row; // Save initial row
        pieceElement.dataset.col = col; // Save initial column
        board.children[index].appendChild(pieceElement);
    }
}

document.addEventListener('DOMContentLoaded', () => {

	draw_checkboard();

    // Make pieces draggable and snap to squares with bounds check
    let selectedPiece = null;
    let offsetX, offsetY;
    let startSquare = null;

    document.querySelectorAll('.piece').forEach(piece => {
        piece.addEventListener('mousedown', (e) => {
            selectedPiece = e.target;
            offsetX = e.offsetX;
            offsetY = e.offsetY;
            startSquare = Array.from(board.children).indexOf(selectedPiece.parentElement);
            selectedPiece.style.position = 'absolute';
            selectedPiece.style.zIndex = 1000;
        });

        document.addEventListener('mousemove', (e) => {
            if (selectedPiece) {
                selectedPiece.style.left = `${e.pageX - offsetX}px`;
                selectedPiece.style.top = `${e.pageY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (selectedPiece) {
                const boardRect = board.getBoundingClientRect();
                const x = e.pageX - boardRect.left;
                const y = e.pageY - boardRect.top;
				const valid_coords = x > 0 && x < 480 && y > 0 && y < 480;
                const col = Math.floor(x / 60);
                const row = Math.floor(y / 60);
                const endSquare = row * 8 + col;
                if (endSquare >= 0 && endSquare < 64 && valid_coords) {
                    ws.send(JSON.stringify({ // how wait after sent message to get response on it
                        "type" : "move",
                        "startRow" : selectedPiece.dataset.row,
                        "startCol" : selectedPiece.dataset.col,
                        "endRow" : String(row),
                        "endCol" : String(col),
                        "startSquare" : startSquare,
                        "endSquare" : endSquare,
                    }));
                }
                selectedPiece.style.position = 'static';
                selectedPiece = null;
            }
        });
    });
});