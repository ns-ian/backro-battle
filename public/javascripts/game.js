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
      IO.$gameMessage = $('#game-message');
    },

    bindEvents: function() {
      IO.socket.on('connect', IO.onConnect);
      IO.socket.on('chat message', IO.chatMessage);
      IO.socket.on('player joined', IO.playerJoined);
      IO.socket.on('add existing player', IO.addExistingPlayer);
      IO.socket.on('player left', IO.playerLeft);
      IO.socket.on('countdown', IO.countdown);
      IO.socket.on('countdown finished', IO.roundReady);
      IO.socket.on('begin round', IO.beginRound);
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

    countdown: function(prefix, count) {
      IO.$gameMessage.html(prefix + count + ' seconds.');
    },

    roundReady: function() {
      IO.$gameMessage.text('Waiting for other players...');
      IO.socket.emit('round ready');
    },

    beginRound: function(acro) {
      Game.acro = acro;
      Player.phrase = '';
    },
  };

  var Game = {

    players: {},
    acro: '',

    init: function() {
      console.log('Game init!');
    },
  };

  var Player = {
    socketId: '',
    nickname: '',
    score: 0,
    phrase: '',
  };

  IO.init();
  Game.init();
});
