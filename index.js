import Stockfish from './stockfish.js';


let cmd = './stockfish-engine';
let stockfish = new Stockfish(cmd, { thread : 7, verbose: false});

let fen;

// Initial position
fen = await stockfish.setPosition('', '');


//fen = await stockfish.setPosition('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'a2a4 g7g5');

// Mate in 8 for the white
//fen = await stockfish.setPosition('7k/8/8/8/3R4/8/3K4/8 w - - 0 1', '');

// Mate in 5 for the black
//fen = await stockfish.setPosition('5q1k/5r2/8/8/8/8/3K4/8 w - - 0 1', '');

// Draw
//fen = await stockfish.setPosition("8/4k3/8/8/2K5/8/8/8 w - - 0 1",'')

console.log (fen)

let moves = await stockfish.run(30)
console.log (moves);
console.log (moves.length);


stockfish.quit();
