$(function () {

  $('#nicknameModal').modal('show');

  $('#nicknameModalForm').submit(function(e) {
    e.preventDefault();
    Player.nickname = IO.$nickname.val();
    Player.roomName = IO.$roomName.val();
    IO.socket.open();
    $('#nicknameModal').modal('hide');
  });

  $('#chat').submit(function(e) {
    e.preventDefault();
    IO.socket.emit('chat message', $('#m').val());
    $('#m').val('');
    return false;
  });

  var IO = {

    init: function() {
      IO.socket = io({ autoConnect: false });
      IO.cacheElements();
      IO.bindEvents();
    },

    cacheElements: function() {
      IO.$playerList = $('#player-list');
      IO.$chatMessages = $('#chat-messages');
      IO.$chatDiv = $('#chat-div');
      IO.$m = $('#m');
      IO.$nicknameModal = $('#nicknameModal');
      IO.$nickname = $('#nickname');
      IO.$roomName = $('#roomName');
      IO.$gameMessage = $('#game-message');
      IO.$phraseInput = $('#backro');
      IO.$backroForm = $('#backro-form');
    },

    bindEvents: function() {
      IO.socket.on('connect', IO.onConnect);
      IO.socket.on('update player list', IO.updatePlayerList);
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
      //Game.players[Player.socketId] = Player;
      //IO.socket.emit('player joined', Player);
      //console.log(Game.players);

      IO.socket.emit('join room', Player);
    },

    updatePlayerList: function(players) {
      $('#player-list li').remove();
      Game.players = players;
      let sortedPlayers = Object.entries(Game.players).sort((a, b) => a[1].score - b[1].score);
      for (let [socket, player] of sortedPlayers) {
        IO.$playerList.append($('<li>').text(`${player.nickname} (${player.score})`));
      }
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
      IO.socket.emit('round ready', Player.roomName);
    },

    beginRound: function(acro) {
      Game.acro = acro;
      Game.backro = '';
    },

    endRound: function() {
    },
  };

  var Game = {

    players: {},
    acro: '',
    backro: '',

    init: function() {
      console.log('Game init!');
      IO.$phraseInput.on('input', Game.checkPhrase);
      IO.$backroForm.submit(function(e) {
        e.preventDefault();
        let backro = IO.$phraseInput.val();
        if (Game.phraseIsValid(backro)) {
          Player.phrase = backro;
          IO.$phraseInput.val('');
        }
        return false;
      });
    },

    checkPhrase: function() {
      let phrase = IO.$phraseInput.val();
      if (phrase.length < 1) {
        IO.$phraseInput.css({'background-color':''});
        return;
      }
      Game.phraseIsValid(phrase) ? IO.$phraseInput.css({'background-color':'#00FF00'})
                                 : IO.$phraseInput.css({'background-color':'#FF0000'});
    },

    phraseIsValid: function(phrase) {
      let splitPhrase = phrase.toUpperCase().split(' ');
      for (let i = 0; i < splitPhrase.length; i++) {
        if (splitPhrase[i].charAt(0) !== Game.acro.charAt(i)) {
          return false;
        } else if (i === (Game.acro.length - 1)) {
          return true;
        }
      }
    },
  };

  var Player = {
    socketId: '',
    roomName: '',
    nickname: '',
    score: 0,
  };

  IO.init();
  Game.init();
});
