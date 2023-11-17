import { spawn } from 'node:child_process';
import events from 'events';


/**
 * Class that run stockfish in command line
 * - Call setPosition(fen, moves) to set up the current position
 * - Call run(depth) to compute the list of moves with score
 */
export default class Stockfish {

  /**
   * Constructor, launch Stockfish and prepare events listener
   * @param {string} command the command that run Stockfish [path/filemane]
   * @param {object} options Options for starting Stockfish
   * @param {object} options.thread The number of CPU threads used for searching a position. 
   * @param {object} options.hash The size of the hash table in MB. 
   * @param {object} options.verbose Display additional information in the console when true
   */
  constructor(command, options = {}) {

    // Start Stockfish from path
    this.engine = spawn(command);

    // Current mode of the engine (fen or getMovesList)
    this.mode = 'none';

    // Create the event triggered when command is done
    this.eventDone = new events.EventEmitter();

    
    // Buffer store data from engine until end of line
    this.buffer = '';

    // Set listener on data (from Stockfish to JS)
    this.engine.stdout.on('data', (data) => {
      // Append the new data to the buffer
      this.buffer += data;

      // If the last character is a carriage return, process the buffer
      if (this.buffer[this.buffer.length - 1] == '\n') {

        // Dispatch the buffer according to the current mode
        switch (this.mode) {
          case 'setPosition': this.processFen(this.buffer); break;
          case 'getMovesList': this.processMoveList(this.buffer); break;
        }
        
        // Empty the buffer
        this.buffer ='';
      }
    });

    // Set listener on errors (from Stockfish to JS)
    this.engine.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    // Configure the engine with the options
    this.engine.stdin.write('setoption name MultiPV value 250\n');
    if (options.thread != undefined) this.engine.stdin.write(`setoption name Threads value ${options.thread}\n`);
    if (options.hash != undefined) this.engine.stdin.write(`setoption name Hash value ${options.hash}\n`);
    this.engine.stdin.write(`setoption name UCI_ShowWDL value true\n`);
    

    // Set the verbose option
    this.verbose = options.verbose ?? false;
  }



  /**
   * Set the position of the chess game with FEN and/or series of moves
   * Set up the position according to the FEN and play the moves
   * @param {string} fen A string containing the FEN, default fen is starting positions
   * @param {string} moves A string containing the list of moves "e2e4 d5d7"
   * @returns A promise returnin the new FEN of the game
   */
  async setPosition(fen = '', moves = '') {

    // Return a promise 
    return new Promise((resolve) => {

      // Store current mode
      this.mode = 'setPosition';

      // Set starting position if the FEN is not provided
      if (fen == '') this.engine.stdin.write(`position startpos moves ${moves}\n`);
      else this.engine.stdin.write(`position fen ${fen} moves ${moves}\n`);

      // Send th d command to get the new FEN
      this.engine.stdin.write(`d\n`);

      // When the engine answered to the last command, resolve the promise
      this.eventDone.on('fen-done', () => { resolve(this.fen) });

    })
  }


  /**
   * Calculate the current position from position command.
   * @param {integer} depth The number of plies to search, default depth is 1
   * @returns A promise resolved when the depth is reached with a list of moves and scores
   */
  async run(depth = 1) {

    // Return a promise
    return new Promise((resolve) => {

      // Keep track of max depth for console info
      this.maxDepth = 0;

      // Initialize list of moves
      this.moveList = {};

      // Set the current mode for events 
      this.mode = 'getMovesList';

      // Write the command to Stockfish
      this.engine.stdin.write(`go depth ${depth}\n`);

      // When the command is done, resolve the promise
      this.eventDone.on('get-moves-list-done', () => {

        // Sort the move list from best to worst
        let array = Object.entries(this.moveList);
        array.sort((a, b) => {
          // Compare 2 moves
          if (a[1][0] < b[1][0]) return -1;
          if (a[1][0] > b[1][0]) return 1;
          return 0;
        })

        // Resolve the promise and return the list of moves
        resolve(array);
      })
    })
  }


  /**
   * Quit Stockfish (must be called before exiting)
   * Send the stop and quit commands
   */
  quit() {
    this.engine.stdin.write('stop\n');
    this.engine.stdin.write('quit\n');
  }



  //#region Callback function call when data are sent by the engine


  /**
   * Callback function called in getPosition mode
   * @param {string} data Data to process (sent by the engine)
   */
  processFen(data) {

    // Split the data in lines
    const lines = data.toString().split('\n')

    // Process each line
    lines.forEach((line) => {

      // In verbose mode, display the lines
      if (this.verbose) console.log(line)

      // Split the line in words
      const words = line.split(' ');

      // If the line contains the FEN
      if (words[0] == 'Fen:') {

        // Remove the line prefix and store the FEN
        this.fen = line.replace('Fen: ', "");

        //Fire the 'fen-done' event:
        this.eventDone.emit('fen-done');
      }
    })
  }


  /**
   * Callback function called in getMovesList mode
   * @param {string} data Data to process (sent by the engine)
   */
  processMoveList(data) {
    //console.log ('moves', data.toString())
    // Split the string into lines
    const lines = ((this.currentLine ?? '') + data.toString()).split('\n');

    // Process each line
    lines.forEach((line) => {

      /* if (line[-1]!='\n') {
         this.currentLine = line;
         return;
       }*/

      // In verbose mode, display the lines
      if (this.verbose) console.log(line);

      // Split the line in words
      const words = line.split(' ');

      // If the line starts with best move, requested depth is reach, search is done
      if (words[0] == 'bestmove') this.eventDone.emit('get-moves-list-done');

      // If the line contains the best position, store the score in moves list
      if (words[0] == 'info' && words[1] == 'depth' && words[25] !== undefined) {

        // Display depth in the console
        const depth = parseInt(words[2])
        if (depth > this.maxDepth) {
          this.maxDepth = depth;
          console.info('Current depth:', this.maxDepth);
        }

        // Add the score in the moves list
        this.moveList[words[25]] = [ parseInt(words[9]), parseInt(words[11]), parseInt(words[12]), parseInt(words[13]) ];
      }
    })
  }


  //#endregion Callback function call when data are sent by the engine

}

