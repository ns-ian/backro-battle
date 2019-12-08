$(function () {

  //$('#nicknameModal').modal('show');

  $('#chat').submit(function(e) {
    e.preventDefault();
    IO.socket.emit('chat message', $('#m').val());
    $('#m').val('');
    return false;
  });

  var IO = {

    init: function() {
      IO.socket = io.connect();
      IO.cacheElements();
      IO.bindEvents();
    },

    cacheElements: function() {
      IO.$chatMessages = $('#chat-messages');
      IO.$chatDiv = $('#chat-div');
      IO.$m = $('#m');
      IO.$nicknameModal = $('#nicknameModal');
    },

    bindEvents: function() {
      IO.socket.on('connect', IO.onConnect);
      IO.socket.on('chat message', IO.chatMessage);
      IO.socket.on('player joined', IO.playerJoined);
      IO.socket.on('add existing player', IO.addExistingPlayer);
      IO.socket.on('player left', IO.playerLeft);
    },

    onConnect: function() {
      Player.socketId = IO.socket.id;
      Game.players[Player.socketId] = Player;
      IO.socket.emit('player joined', Player);
      console.log(Game.players);
    },

    chatMessage: function(msg) {
      IO.$chatMessages.append($('<li>').text(msg));
      IO.$chatDiv.scrollTop(IO.$chatDiv[0].scrollHeight);
    },

    playerJoined: function(player) {
      IO.socket.emit('send player data', player.socketId, Player);
      Game.players[player.socketId] = player;
      console.log('A new player joined!');
      console.log(Game.players);
    },

    playerLeft: function(socketId) {
      delete Game.players[socketId];
      console.log('Player with ID ' + socketId + ' left!');
      console.log(Game.players);
    },

    addExistingPlayer: function(player) {
      Game.players[player.socketId] = player;
      console.log('Added existing player!');
      console.log(Game.players);
    },
  };

  var Game = {

    players: {},

    init: function() {
      console.log('Game init!');
    },
  };

  var Player = {
    socketId: 0,
    nickname: '',
    score: 0,
    phrase: '',
  };

  IO.init();
  Game.init();
});
