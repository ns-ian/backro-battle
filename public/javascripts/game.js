$(function () {

  $('#nicknameModal').modal({
    backdrop: 'static',
    keyboard: false,
    show: true
  });

  $('#nicknameModalForm').submit(function(e) {
    e.preventDefault();
    let roomName = IO.$roomName.val().trim();
    let nickname = IO.$nickname.val().trim();
    let allowed = /^[a-zA-Z0-9- _]*$/;

    if (!allowed.test(roomName) || !allowed.test(nickname)) {
      $('#modalFormError')
        .text('Names must only include letters, numbers, spaces, or underscores.')
        .css('color', 'red');
      return;
    }

    if (roomName === '' || nickname === '') {
      $('#modalFormError')
        .text('Blank values are not allowed.')
        .css('color', 'red');
      return;
    }

    Player.nickname = nickname;
    Player.roomName = roomName;
    IO.socket.open();
    $('#nicknameModal').modal('hide');
  });

  $('#chat').submit(function(e) {
    e.preventDefault();
    IO.socket.emit('chat message', $('#m').val(), Player);
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
      IO.$backroInput = $('#backro');
      IO.$backroForm = $('#backro-form');
      IO.$backroList = $('#backro-list');
      IO.$roomNameInfo = $('#room-name');
      IO.$roundNumber = $('#round-number');
    },

    bindEvents: function() {
      IO.socket.on('add existing player', IO.addExistingPlayer);
      IO.socket.on('begin round', IO.beginRound);
      IO.socket.on('chat message', IO.chatMessage);
      IO.socket.on('collect backros', IO.sendBackro);
      IO.socket.on('collect votes', IO.sendVote);
      IO.socket.on('connect', IO.onConnect);
      IO.socket.on('countdown', IO.countdown);
      IO.socket.on('countdown finished', IO.roundReady);
      IO.socket.on('player joined', IO.playerJoined);
      IO.socket.on('player left', IO.playerLeft);
      IO.socket.on('show backros', IO.showBackros);
      IO.socket.on('update player list', IO.updatePlayerList);
      IO.socket.on('voting results', IO.showResults);
      IO.socket.on('system message', IO.systemMessage);
      IO.socket.on('postgame message', IO.postgameMessage);
    },

    onConnect: function() {
      Player.socketId = IO.socket.id;
      IO.socket.emit('join room', Player);
      IO.$roomNameInfo.text(Player.roomName);
    },

    updatePlayerList: function(players) {
      $('#player-list li').remove();
      Game.players = players;
      let sortedPlayers = Object.entries(Game.players).sort((a, b) => b[1].score - a[1].score);
      for (let [socket, player] of sortedPlayers) {
        IO.$playerList.append($('<li>').text(`${player.nickname} (${player.score})`));
      }
    },

    chatMessage: function(nickname, msg) {
      let msgBody = $.parseHTML(msg);
      if (msgBody != '') {
        let prefix = '<strong>' + nickname + ': </strong>';
        let message = prefix + $(msgBody).text();
        IO.$chatMessages.append($('<li>').html(message));
        IO.$chatDiv.scrollTop(IO.$chatDiv[0].scrollHeight);
      }
    },

    systemMessage: function(msg) {
      IO.$chatMessages.append($('<li>').html('<strong>[SYSTEM] ' + msg + '</strong>'));
      IO.$chatDiv.scrollTop(IO.$chatDiv[0].scrollHeight);
    },

    countdown: function(template, count) {
      IO.$gameMessage.html(IO.fillTemplate(template, count));
    },

    postgameMessage: function() {
      msg = 'Game complete! A new game will begin if 3 players say NEWGAME in the chat.';
      IO.$gameMessage.html(msg);
    },

    fillTemplate: function(templateString, count) {
      return new Function("return `" + templateString + "`;").call(count);
    },

    roundReady: function() {
      IO.$gameMessage.html('Waiting for other players...');
      IO.socket.emit('round ready', Player.roomName);
    },

    beginRound: function(roundNumber, acro) {
      IO.$roundNumber.text(roundNumber);
      IO.$backroList.empty();
      Game.acro = acro;
      Player.backro = '';
    },

    sendBackro: function() {
      IO.socket.emit('player backro', Player);
    },

    showBackros: function(players) {
      Game.players = players;
      IO.$backroList.empty();

      let backros = [];
      for (const player in Game.players) {
        let backro = Game.players[player].backro;
        if (backro != '') backros.push(backro);
      }

      let backrosLen = backros.length;
      for (let i = 0; i < backrosLen; i++) {
        let index = Game.randomIntFromInterval(0, backros.length - 1);
        IO.$backroList.append(
          $('<li><a href="#" style="text-decoration: none;">' +
            backros[index] + '</a></li>')
        );
        backros.splice(index, 1);
      }
    },

    sendVote: function() {
      if (Player.vote != '' && Player.backro != '') {
        for (const player in Game.players) {
          if (Player.vote === Game.players[player].backro) {
            IO.socket.emit('player vote', Player, player);
            Player.vote = '';
            return;
          }
        }
      } else {
        IO.socket.emit('player vote', Player, null);
      }
    },

    showResults: function(players) {
      Game.players = players;
      IO.$backroList.empty();
      for (const player in Game.players) {
        if (Game.players[player].backro != '') {
          let votesReceived = Game.players[player].votesReceived;
          let votesGrammaticalForm = '';

          if (votesReceived === 1) {
            votesGrammaticalForm = 'vote';
          } else {
            votesGrammaticalForm = 'votes';
          }

          IO.$backroList.append(
            $('<li>' + Game.players[player].backro +
              ' <strong>(' +
              Game.players[player].nickname + ' - ' +
              votesReceived + ' ' +
              votesGrammaticalForm +
              ')</strong></li>')
          );
        }
      }
    },
  };

  var Game = {

    players: {},
    backros: {},
    acro: '',

    init: function() {
      console.log('Game init!');
      IO.$backroInput.on('input', Game.checkBackro);
      IO.$backroForm.submit(function(e) {
        e.preventDefault();
        let backro = IO.$backroInput.val();
        if (Game.backroIsValid(backro)) {
          Player.backro = backro;
          IO.$backroInput.val('');
          IO.$backroInput.css({'background-color':''});
        }
        return false;
      });

      $('#backro-list').on('click', 'li a', function(e) {
        let vote = $(e.target).text();
        if (Player.backro != vote) {
          Player.vote = vote;
          $('#backro-list li a').css({'background-color':''});
          $(this).css({'background-color':'#00FF00'});
        }
      });
    },

    checkBackro: function() {
      let phrase = IO.$backroInput.val();
      if (phrase.length < 1) {
        IO.$backroInput.css({'background-color':''});
        return;
      }
      Game.backroIsValid(phrase) ? IO.$backroInput.css({'background-color':'#00FF00'})
                                 : IO.$backroInput.css({'background-color':'#FF0000'});
    },

    backroIsValid: function(phrase) {
      let splitBackro = phrase.toUpperCase().split(' ');
      for (let i = 0; i < splitBackro.length; i++) {
        if (i > (Game.acro.length - 1) || splitBackro[i].charAt(0) !== Game.acro.charAt(i)) {
          return false;
        } else if (i === (Game.acro.length - 1) && splitBackro.length === Game.acro.length) {
          return true;
        }
      }
    },

    randomIntFromInterval: function(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    },
  };

  var Player = {
    socketId: '',
    roomName: '',
    nickname: '',
    backro: '',
    vote: '',
    score: 0,
    votesReceived: 0,
  };

  IO.init();
  Game.init();
});
