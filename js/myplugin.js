(function ($) {
  $.fn.game = function(options) {
    var MIN_GRID = 6;
    var MAX_GRID = 12;

    if (options !== undefined &&
        typeof options !== "object")
    {
      console.log("Options must be an object {k: v}");
      return false;
    }
    if (options === undefined)
      options = {};

    if (options.xSize === undefined || !Number.isInteger(options.xSize))
      options.xSize = 7;
    if (options.ySize === undefined || !Number.isInteger(options.ySize))
      options.ySize = 6;
    if (options.xSize !== undefined && options.xSize > MAX_GRID)
    {
      console.log("Maximum " + MAX_GRID + " columns for xSize");
      options.xSize = MAX_GRID;
    }
    if (options.ySize !== undefined && options.ySize > MAX_GRID)
    {
      console.log("Maximum " + MAX_GRID + " rows for ySize");
      options.ySize = MAX_GRID;
    }
    if (options.colorp1 === undefined)
      options.colorp1 = "#F00";
    if (options.colorp2 === undefined)
      options.colorp2 = "#FF0";

    if (options.xSize < MIN_GRID || options.ySize < MIN_GRID)
    {
      console.log("xSize and ySize cannot be under " + MIN_GRID);
      return false;
    }

    if (options.colorp1 == options.colorp2)
    {
      console.log("Both players have the same color !");
      return false;
    }

    if (options.ffvch === undefined)
      options.ffvch = false;
    if (options.pvp === undefined)
      options.pvp = false;
// ====================================================================================================

// ====================================================================================================
  // -------------------------------------------------------- GAME BEGIN
    $("#GUI").remove();
    if ($(this).prop("tagName") !== "CANVAS")
    {
      $(this).html("");
      $(this).append("<button id=\"turnback\">Annuler le dernier coup</button>");
      $(this).append("<div id=\"GUI\"></canvas>");
      $(this).append("<canvas id=\"gameCan\"></canvas>");
      var $GUI = $("#GUI");
      var $canvas = $("#gameCan");
      var canvas = $canvas[0];
    }
    else
    {
      $(this).before("<div id=\"GUI\"></canvas>");
      var $GUI = $("#GUI");
      var $canvas = $(this);
      var canvas = $canvas[0];
    }

    var ctx = canvas.getContext("2d");
    if (!ctx) {
      console.log("Canvas is not supported!");
      return false;
    }

    var frame = 1000 / 30;
    var sprites = {};
    sprites.cell = new Image();
    sprites.cell.src = "images/cell.png";
    sprites.firefox = new Image();
    sprites.firefox.src = "images/firefox.png";
    sprites.chrome = new Image();
    sprites.chrome.src = "images/chrome.png";

  // -------------------------------------------------------- GAME FUNCTIONS
    var Game = function() {
      var self = {
        cell_size: 64,
        current_player: 0,
        players: [],
        end: false
      };
      self.init = function() {
        $canvas.attr("width", options.xSize * self.cell_size);
        $canvas.attr("height", options.ySize * self.cell_size);
        $canvas.css("display", "block");
        $canvas.css("margin", "0 auto");

        $GUI.css("padding", "5px");
        $GUI.css("border", "1px solid black");
        $GUI.css("background", "rgba(0,0,0,0.3)");
        $GUI.css("width", "250px");

        //var rnd = Math.floor((Math.random() * 2) + 1);
        self.current_player = self.players[0];
      };

      self.addPlayer = function(what, id, color, name, img) {
        if (id === undefined || color === undefined)
        {
          console.log("Missing parameter on Game.addPlayer");
        }

        var tmp = {
          id: id,
          color: color,
          name: name,
          img: img === undefined ? null : img
        };
        if (what == "player")
          self.players.push(new Player(tmp));
        else
          self.players.push(new IA(tmp));
      };

      self.changeCurrentPlayer = function() {
        var tmp = 0;
        for (var i in self.players)
        {
          if (self.players[i] == self.current_player)
            tmp = i;
        }
        tmp = parseInt(tmp) + 1;
        self.current_player = self.players[(tmp % self.players.length)];
      };
      self.save = function(p_name)
      {
        var pts = 1;
        if (localStorage.getItem(p_name) != undefined)
        {
          pts += parseInt(localStorage.getItem(p_name));
        }
        localStorage.setItem(p_name, pts);
      }
      self.update = function() {
        var str = "<strong>Tour de</strong> " + self.current_player.name + "<br />";
        str += "<strong>Pions :</strong> " + self.current_player.nb_pions + "<br />";
        str += "<strong>Victoires :</strong> " + self.current_player.score;
        if (options.ffvch)
        {
          str += "<img src=\"" + sprites[self.current_player.img].src + "\" style=\"width:32px; height:32px; display: block; border: 1px solid #AAA;\"></div>";
        } else {
          str += "<div style=\"width:32px; height:32px; background-color:" + self.current_player.color + "; border: 1px solid #AAA;\"></div>";
        }
        $GUI.html(str);

        var t = 0;
        for (var p in self.players)
        {
          if (self.players[p].won)
          {
            self.end = true;
            $canvas.after("<center><h2>Victoire de " + self.players[p].name + "</h2></center>");
            self.save(self.players[p].name);
            return false;
          }
          if (self.players[p].countPions())
          {
            t++;
          }
        }
        if (t === self.players.length)
        {
          self.end = true;
          $canvas.after("<center><h2>Match null ! Plus de pions à mettre en jeu</h2></center>");
          return false;
        }
      };

      return self;
    };

    var GameBoard = function(_size) {
      var self = {
        cell_size: _size,
        grid: [],
        pions: [],
        lastPion: null
      };

      // ----- LOCAL FUNCTIONS
      var allPionsDstY = function() {
        for (var p in self.pions)
        {
          self.pions[p].y = self.pions[p].dst_y;
        }
      }
      self.whoWon = function() {
        self.lastPion = self.pions[self.pions.length - 1];
        var curr_y = self.lastPion.dst_y / self.cell_size;
        var curr_x = self.lastPion.x / self.cell_size;
        var there_is_a_winner = false;
        if (checkHorizontal(curr_y, curr_x))
        {
          there_is_a_winner = true;
        }
        else if (checkVertical(curr_y, curr_x))
        {
          there_is_a_winner = true;
        }
        else if (checkDiagonaleRight(curr_y, curr_x))
        {
          there_is_a_winner = true;
        }
        else if (checkDiagonaleLeft(curr_y, curr_x))
        {
          there_is_a_winner = true;
        }

        if (there_is_a_winner)
        {
          allPionsDstY();
          self.lastPion.owner.won = true;
        }
      };
      var checkHorizontal = function(curr_y, curr_x) {
        // Init à 1 parce qu'on a au moins 1 pion
        var total = 1;

        for (var i = 1; i <= 4; i++)
        {
          var next = curr_x + i;
          if (self.grid[curr_y][next] !== undefined && self.grid[curr_y][next].owner === self.lastPion.owner)
          {
            total += 1;
          }
          else
          {
            break;
          }
        }
        if (total < 4)
        {
          for (var i = 1; i <= 4; i++)
          {
            var next = curr_x - i;
            if (self.grid[curr_y][next] !== undefined && self.grid[curr_y][next].owner === self.lastPion.owner)
            {
              total += 1;
            }
            else
            {
              break;
            }
          }
        }
        return total >= 4;
      };
      var checkVertical = function(curr_y, curr_x) {
        // Init à 1 parce qu'on a au moins 1 pion
        var total = 1;
        for (var i = 1; i <= 4; i++)
        {
          var next = curr_y + i;
          if (self.grid[next] !== undefined)
          { 
            if (self.grid[next][curr_x] !== undefined && self.grid[next][curr_x].owner === self.lastPion.owner)
            {
              total += 1;
            }
            else
            {
              break;
            }
          }
        }
        return total >= 4;
      };
      var checkDiagonaleRight = function(curr_y, curr_x) {
        // Init à 1 parce qu'on a au moins 1 pion
        var total = 1;

        for (var i = 1; i <= 4; i++)
        {
          var nextx = curr_x - i;
          var nexty = curr_y + i;
          if (self.grid[nexty] !== undefined)
          {
            if (self.grid[nexty][nextx] !== undefined && self.grid[nexty][nextx].owner === self.lastPion.owner)
            {
              total += 1;
            }
            else
            {
              break;
            }
          }
        }
        if (total < 4)
        {
          for (var i = 1; i <= 4; i++)
          {
            var nextx = curr_x + i;
            var nexty = curr_y - i;
            if (self.grid[nexty] !== undefined)
            {
              if (self.grid[nexty][nextx] !== undefined && self.grid[nexty][nextx].owner === self.lastPion.owner)
              {
                total += 1;
              }
              else
              {
                break;
              }
            }
          }
        }
        return total >= 4;
      };
      var checkDiagonaleLeft = function(curr_y, curr_x) {

        // Init à 1 parce qu'on a au moins 1 pion
        var total = 1;

        for (var i = 1; i <= 4; i++)
        {
          var nextx = curr_x + i;
          var nexty = curr_y + i;
          if (self.grid[nexty] !== undefined)
          {
            if (self.grid[nexty][nextx] !== undefined && self.grid[nexty][nextx].owner === self.lastPion.owner)
            {
              total += 1;
            }
            else
            {
              break;
            }
          }
        }
        if (total < 4)
        {
          for (var i = 1; i <= 4; i++)
          {
            var nextx = curr_x - i;
            var nexty = curr_y - i;
            if (self.grid[nexty] !== undefined)
            {
              if (self.grid[nexty][nextx] !== undefined && self.grid[nexty][nextx].owner === self.lastPion.owner)
              {
                total += 1;
              }
              else
              {
                break;
              }
            }
          }
        }
        return total >= 4;
      };
      
      // ----- OBJECT FUNCTIONS
      self.init = function() {
        for (var y = 0; y < options.ySize; y++)
        {
          self.grid.push([]);
          for (var x = 0; x < options.xSize; x++)
          {
            self.grid[y].push(-1);
          }
        }
      };
      self.draw = function(game) {
        var total = 0;
        for (var y in self.grid)
        {
          for (var x in self.grid[y])
          {
            if (self.grid[y][x] !== -1)
            {
              var pion = self.grid[y][x];
              pion.update();
              if (pion.owner.img === null) {
                ctx.beginPath();
                ctx.fillStyle = pion.owner.color;
                ctx.arc(pion.x + (pion.w / 2), pion.y + (pion.h / 2), (pion.w / 2), 0, 2 * Math.PI);
                ctx.fill();
              } else {
                ctx.drawImage(sprites[pion.owner.img], 0, 0, self.cell_size, self.cell_size, pion.x, pion.y, self.cell_size, self.cell_size);
              }
              if (game !== undefined)
              {
                total += 1;
              }
            }
          }
        }

        for (var y in self.grid)
        {
          for (var x in self.grid[y])
          {
            ctx.drawImage(sprites.cell, 0, 0, self.cell_size, self.cell_size, x * self.cell_size, y * self.cell_size, self.cell_size, self.cell_size);
          }
        }
        if (total === options.xSize * options.ySize)
        {
          game.end = true;
          $canvas.after("<center><h2>Match null ! La grille est complète</h2></center>");
          return false;
        }
      };
      self.newPion = function(position, owner) {
        var tmp = 0;
        var posX = Math.floor(position / self.cell_size);
        for (var y in self.grid)
        {
            if (self.grid[y][posX] !== -1)
              tmp++;
        }
        if (tmp === self.grid.length)
        {
          console.log("Colonne complète !");
          return false;
        }
        else
        {
          for (var y = self.grid.length - 1; y >= 0; y--)
          {
            if (self.grid[y][posX] === -1)
            {
              break;
            }
          }
          
          var pion = new Pion({owner: owner, x: posX * self.cell_size, y: 0, dst_y: y * self.cell_size});
          self.pions.push(pion);
          self.grid[y][posX] = pion;
          owner.nb_pions--;
        }
      };
      self.update = function(game) {
        if (self.pions.length > 0)
        {
          self.whoWon();
        }
        self.draw(game);
      };

      return self;
    };

    var Player = function(params) {
      var self = {
        id: params.id,
        color: params.color,
        img: params.img,
        name: params.name,
        score: (localStorage.getItem(params.name)) ? localStorage.getItem(params.name) : 0,
        nb_pions: 99,
        won: false,
        lastPion: null
      };

      self.countPions = function() {
        return self.nb_pions <= 0;
      };

      return self;
    };

    var IA = function(params) {
      var self = new Player(params);
      self.isIA = true;

      var getBestMove = function(curr_p, rec) {
        if (rec !== undefined) {
          if (gameBoard.whoWon())
            return 10;
          else if (gameBoard.whoWon())
            return -10;
          else
            return 0;
        }

        var moves = [];
        for (var y in gameBoard.grid)
        {
          for (var x in gameBoard.grid[y])
          {
            if (gameBoard.grid[y][x] === -1) {
              var move = {};
              move.x = x;
              move.y = y;
              gameBoard.newPion(x, game.current_player);

              if (curr_p !== self) {
                move.score = getBestMove(curr_p, true);
              } else {
                move.score = getBestMove(self, true);
              }

              moves.push(move);

              var nb = gameBoard.pions.length;
              gameBoard.pions.splice(nb-1, 1);
              gameBoard.grid[y][x] = -1;
            }
          }
        }
        var bestMove = 0;
        if (curr_p === self) {
          var bestScore = -Infinity;
          for (var k in moves) {
            if (moves[k].score > bestScore)
            {
              bestMove = k;
              bestScore = moves[k].score;
            }
          }
        } else {
          var bestScore = Infinity;
          for (var k in moves) {
            if (moves[k].score < bestScore)
            {
              bestMove = k;
              bestScore = moves[k].score;
            }
          }
        }

        return moves[bestMove];
      };

      var performMove = function() {
        var bestMoveIA = getBestMove(self);
        var bestMoveP = getBestMove(game.players[0]);
        if (bestMoveIA.score == 10)
          gameBoard.newPion(bestMoveIA.x, game.current_player);
        else if (bestMoveP.score == -10)
          gameBoard.newPion(bestMoveP.x, game.current_player);
        else
          gameBoard.newPion(bestMoveIA.x, game.current_player);
          
      };

      self.setMove = function() {
        if (game.current_player === self && !game.end)
        {
          console.log("IA Turn !");
          performMove();
          game.changeCurrentPlayer();
        }
      };

      return self;
    };

    var Pion = function(params) {
      var self = {
        owner: params.owner,
        isFalling: true,
        fallSpeed: 16,
        w: 64,
        h: 64,
        x: params.x,
        y: params.y,
        dst_y: params.dst_y
      };
      self.collision = function(collider) {
        if ((self.x >= collider.x + collider.w
            || self.x + self.w <= collider.x
            || self.y >= collider.y + collider.h
            || self.y + self.h <= collider.y)
            )
            return false;

        return true;
      };
      self.update = function() {
        if (self.isFalling)
        {
          self.y += self.fallSpeed;
        }
        if (self.dst_y <= self.y && self.isFalling)
        {
          self.isFalling = false;
          self.y = self.dst_y;
        }
      };

      return self;
    };

    var game = new Game();
    var side = [];
    if (options.ffvch)
    {
      side.push("firefox");
      side.push("chrome");
    }
    game.addPlayer("player", 1, options.colorp1, (options.namep1 === undefined) ? "Player1" : options.namep1, side[0]);
    if (options.pvp)
    {
      game.addPlayer("player", 2, options.colorp2, (options.namep2 === undefined) ? "Player2" : options.namep2, side[1]);
    }
    else
    {
      game.addPlayer("cpu", 2, options.colorp2, (options.namep2 === undefined) ? "Player2" : options.namep2, side[1]);
    }
    console.log(game.players);
    game.init();

    var gameBoard = new GameBoard(game.cell_size);
    gameBoard.init();

    $canvas.on("click", function(evt) {
      if (!game.end && game.current_player.isIA === undefined)
      {
        var offset = $(this).offset();
        var posX = evt.clientX - offset.left;
        if (gameBoard.newPion(posX, game.current_player) !== false)
        {
          game.changeCurrentPlayer();
          if (game.current_player.isIA !== undefined)
          {
            game.current_player.setMove();
          }
        }
      }
    });

    $("#turnback").on("click", function(evt) {
        evt.preventDefault();
        var nb = gameBoard.pions.length;
        if (nb > 0 && !game.end)
        {
          var c_pion = gameBoard.pions[nb - 1];
          var y = c_pion.y / gameBoard.cell_size;
          var x = c_pion.x / gameBoard.cell_size;
          gameBoard.pions.splice(nb-1, 1);
          gameBoard.grid[y][x] = -1;
          game.changeCurrentPlayer();
          game.current_player.nb_pions += 1;
        }
      });

    setInterval(function() {
      if (!game.end)
      {
        ctx.clearRect(0, 0, $canvas.attr("width"), $canvas.attr("height"));
        /*if (game.current_player.isIA !== undefined)
        {
          game.current_player.setMove();
        }*/
        gameBoard.update(game);
        game.update();
      }
    }, frame);
  }
}(jQuery));