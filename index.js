import Stockfish from './stockfish.js';


let cmd = './stockfish-engine';
let stockfish = new Stockfish(cmd, { thread : 7, verbose: false});

let fen;

fen = await stockfish.setPosition('', '');

//let fen = await stockfish.setPosition('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'a2a4 g7g5');
//console.log (fen)

// Mate in 8 for the white
//fen = await stockfish.setPosition('7k/8/8/8/3R4/8/3K4/8 w - - 0 1', '');
//console.log (fen)

// Mate in 5 for the black
//fen = await stockfish.setPosition('5q1k/5r2/8/8/8/8/3K4/8 w - - 0 1', '');
console.log (fen)

let moves = await stockfish.run(20)
console.log (moves);
console.log (moves.length);


stockfish.quit();
