var config = require('./config');
const bot_api_token = config.bot_api_token;

var _ = require('lodash');
var telegram = require('telegram-bot-api');

var bot = new telegram({
        token: bot_api_token,
        updates: {
            enabled: true
    }
});

var game = [];
function new_game () {

  return {is_started: false,
          start_message_id: 0,
          join_message_id: 0,
          lucky_number: _.random(1,99),
          participants: [],
          turn: 0,
          lower_bound: 1,
          upper_bound: 99
  };
}

var game_initiated_text = "Game initiated! Waiting for players to join.";
var game_already_initiated_text = "Game already initiated!";
var start_game_button = {text: "Enough, let's start!", callback_data: 'start'};
var start_game_keyboard = {inline_keyboard: [[start_game_button]]};
var game_started_text = "Game started!";
var join_game_text = " joined.";
var join_game_button = {text: 'Join Game', callback_data: 'join'};
var join_game_keyboard = {inline_keyboard: [[join_game_button]]};

bot.on('message', function(message) {
  var chat_id = message.chat.id;
  var user = message.from;
  
  switch (message.text) {
    case '/hoseh':
      initGame(chat_id);
      break;
    default:
      if (!_.isEmpty(game[chat_id])) {
        if (!game[chat_id].is_started) {
        } else {
          // game has started
          var guess_number = _.toNumber(message.text);
          if (_.isInteger(guess_number)) {
            guess(guess_number, chat_id, user);
          }
        }
      }
  }
});

function initGame (chat_id) {
  if (!_.isEmpty(game[chat_id])) {
    bot.sendMessage({chat_id: chat_id, text: game_already_initiated_text});
  } else {
    game[chat_id] = new_game();
console.log("Game initiated in " + chat_id);
    bot.sendMessage({chat_id: chat_id, 
                     text: game_initiated_text,
                     reply_markup: JSON.stringify(start_game_keyboard)
    })
    .then(function(message) {
      game[chat_id].start_message_id = message.message_id;
      bot.sendMessage({chat_id: chat_id, 
                       text: 'Nobody' + join_game_text,
                       reply_markup: JSON.stringify(join_game_keyboard)
      })
      .then(function(message) {
        game[chat_id].join_message_id = message.message_id;
      });
    });
  } 
}

function guess (guess_number, chat_id, user) {
  var participants = game[chat_id].participants;
  var turn = game[chat_id].turn;
  var turn_participant = _.nth(participants, turn);
  var lucky_number = game[chat_id].lucky_number;
  var lower_bound = game[chat_id].lower_bound;
  var upper_bound = game[chat_id].upper_bound;

  if (user.id == turn_participant.id) {
    if (_.inRange(guess_number, lower_bound, upper_bound+1)) {
      if (guess_number == lucky_number) {
        bot.sendMessage({chat_id: chat_id,
                         text: "HOSEH! " + user.first_name + " is the one!"
        });
        game[chat_id] = null;
        // game is over
      } else {
        var response_text = "Too ";
        if (_.gt(guess_number, lucky_number)) {
          upper_bound = guess_number -1;
          game[chat_id].upper_bound = upper_bound;
          response_text +="high";
        } else {
          lower_bound = guess_number + 1;
          game[chat_id].lower_bound = lower_bound;
          response_text +="low";
        }
        response_text += ", " + user.first_name + "!";
        bot.sendMessage({chat_id: chat_id,
                       text: response_text
        })
        .then(function (message) {
          //next turn
          turn = (turn + 1) % _.size(participants);
          game[chat_id].turn = turn;
          sendTurnMessage(chat_id);
        });
      }

    } else {
      bot.sendMessage({chat_id: chat_id,
                       text: "Out of range. Guess again, " + user.first_name
      });
    }
  } else {
    bot.sendMessage({chat_id: chat_id,
                     text: "It's not your turn, " + user.first_name
    });
  }
}

function sendTurnMessage (chat_id) {
  var turn = game[chat_id].turn;
  var turn_participant = _.nth(game[chat_id].participants, turn);
  var lower_bound = game[chat_id].lower_bound;
  var upper_bound = game[chat_id].upper_bound;

  var turn_message = turn_participant.first_name + ", it's your turn. Guess a positive integer from " + lower_bound + " to " + upper_bound + ".";

  bot.sendMessage({chat_id: chat_id,
                   text: turn_message
  });
}

bot.on('inline.callback.query', function(callback_query) {
  var chat_id = callback_query.message.chat.id;
  var user = callback_query.from;
console.log(user);
  if (!_.isEmpty(game[chat_id])) {
    if (!game[chat_id].is_started) {
      switch(callback_query.data) {
        case 'start':
          startGame(chat_id);
          break;
        case 'join':
          joinGame(chat_id, user);
          break;
        default:
          //do nothing
      }
    } else {
      // game has started
    }
  } 
});

function startGame (chat_id) {
  if (_.size(game[chat_id].participants) > 1) {
    game[chat_id].is_started = true;

    var participants = _.toString(_.map(game[chat_id].participants, 'first_name'));
    bot.editMessageText({chat_id: chat_id,
                         message_id: game[chat_id].start_message_id,
                         text: game_started_text
    });
    bot.editMessageText({chat_id: chat_id,
                         message_id: game[chat_id].join_message_id,
                         text: participants + join_game_text
    });
    sendTurnMessage(chat_id);
  }
};

function joinGame (chat_id, user) {
  if (-1 == _.findIndex(game[chat_id].participants, user)) {
    game[chat_id].participants.push(user);
console.log(user.first_name + " joined game " + chat_id);
    var participants = _.toString(_.map(game[chat_id].participants, 'first_name'));
    bot.editMessageText({chat_id: chat_id,
                         message_id: game[chat_id].join_message_id,
                         text: participants + join_game_text,
                         reply_markup: JSON.stringify(join_game_keyboard)
    });
  }
};
/*
api.on('message', function(message) {
  var chat_id = message.chat.id;
  var message_id = message.message_id;
console.log(chat_id + " " + message_id);
  if (!_.isEmpty(message.photo)) {
    var file_id = _.last(message.photo).file_id;
  }

  if (!_.isEmpty(file_id)) {
    api.getFile({file_id: file_id})
      .then(function(data) {
        var file_path = data.file_path;
        var inline_keyboard_button = {text: 'Describe loh..', callback_data: file_path};
        var inline_keyboard = {inline_keyboard: [[inline_keyboard_button]]};
        api.sendMessage({chat_id: chat_id, 
                         text: "Do you want me to describe?",
                         reply_to_message_id: message_id,
                         reply_markup: JSON.stringify(inline_keyboard)
        });
      });
  }
});

api.on('inline.callback.query', function(callback_query) {
  var chat_id = callback_query.message.chat.id;
  var message_id = callback_query.message.message_id;
  var photo_url = 'https://api.telegram.org/file/bot' + bot_api_token + '/' + callback_query.data;

  request
    .post('https://api.projectoxford.ai/vision/v1.0/describe?maxCandidates=1')
    .send('{"url":"'+photo_url+'"}')
    .type('application/json')
    .set('Ocp-Apim-Subscription-Key', vision_api_token)
    .end(function (err, res) {
       var caption =  _.head(res.body.description.captions).text;
       var confidence =  _.toNumber(_.head(res.body.description.captions).confidence);
       var response_set = response_sets[(_.floor(confidence*10))];
       var random_response = response_set[_.random(1, _.size(response_set)) - 1];
       var response = _.replace(random_response, 'CAPTION', caption);
       api.editMessageText({chat_id: chat_id, message_id: message_id, text: response});
       api.editMessageReplyMarkup({chat_id: chat_id, message_id: message_id});
    });        
});
*/
