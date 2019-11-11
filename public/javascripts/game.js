$(function () {
  var socket = io();

  $('#nicknameModal').modal('show');

  $('#chat').submit(function(e) {
    e.preventDefault();
    socket.emit('chat message', $('#m').val());
    $('#m').val('');
    return false;
  });

  socket.on('chat message', function(msg) {
    $('#chat-messages').append($('<li>').text(msg));
    $('#chat-div').scrollTop($('#chat-div')[0].scrollHeight);
  });
});
