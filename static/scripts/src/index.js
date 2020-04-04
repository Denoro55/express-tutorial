import Engine from './Core/Engine';
import Golem from "./Actors/Golem";
import Player from "./Actors/Player";

window.onload = function() {
    (() => {
        const socket = io(window.location.host);

        // init
        let name;
        fetch('/getName', {method: 'POST'})
            .then(response => response.json())
            .then(json => {
                name = json.name;
                // engine.setName(name);
            });

        socket.emit('init');
        socket.on('init', (data) => {
            updateRoomList(data.rooms);
        });

        const elements = {
            gameContainer: document.querySelector('.game'),
            roomsContainer: document.querySelector('.room-list'),
            formCreateRoom: document.getElementById('js-create-room'),
            formTraining: document.getElementById('js-training-form'),
            formBoss: document.getElementById('js-boss-form'),
            gameStatus: document.querySelector('.js-game-status'),
            player1Info: document.querySelector('.js-player-info-1'),
            player2Info: document.querySelector('.js-player-info-2')
        };

        // создание комнаты
        elements.formCreateRoom.onsubmit = function(e) {
            e.preventDefault();
            const data = new FormData(e.target);
            const roomId = data.get('room_id');
            const bgIndex = data.get('room_bg');
            if (roomId) {
                socket.emit('createRoom', { roomId, bgIndex, name });
                elements.gameContainer.classList.add('active');
            }
        };

        const mappingBotName = {
            1: 'Легкий',
            2: 'Средний',
            3: 'Тяжелый'
        };

        // создание комнаты с ботом
        elements.formTraining.onsubmit = function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const difficult = formData.get('difficult');
            const botName = 'ИИ (' + mappingBotName[difficult] + ')';
            const data = {
                status: 'Игра',
                playerIndex: 1,
                player1: {
                    name
                },
                player2: {
                    name: botName
                }
            };

            renderGame(data);

            const player = new Player({
                name,
                skin: '1.jpg',
                index: 1
            });
            const player2 = new Player({
                name: botName,
                skin: '2.jpg',
                index: 2
            });

            engine.startGame(1, player, player2, {
                bgIndex: 1 + Math.floor(Math.random() * 9),
                singleMode: true,
                difficult
            });
        };

        const mappingBoss = {
            'forest-golem': Golem
        };

        // создание комнаты с боссом
        elements.formBoss.onsubmit = function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            const bossValue = formData.get('boss_name');
            const bossName = 'Босс ' + bossValue.match(new RegExp(/\(.+?\)/))[0];
            const bossKey = bossValue.match(new RegExp(/.+(?=\()/))
            const data = {
                status: 'Игра',
                playerIndex: 1,
                player1: {
                    name
                },
                player2: {
                    name: bossName
                }
            };

            renderGame(data);

            const player = new Player({
                name,
                skin: '1.jpg',
                index: 1
            });
            const boss = new mappingBoss[bossKey]({
                name: bossName,
                // skin: '/static/img/skins/boss/golem.png',
                index: 2
            });

            engine.startGame(1, player, boss, {
                bgIndex: 11,
                singleMode: true,
                difficult: 3
            });
        };

        const updateRoomList = (rooms) => {
              elements.roomsContainer.innerHTML = '';
              Object.entries(rooms).forEach(([id, values]) => {
                  const item = document.createElement('li');
                  item.className = 'room-list__item';
                  const button = document.createElement('button');
                  button.textContent = 'Комната ' + id;
                  button.addEventListener('click', () => {
                      socket.emit('joinRoom', { name, roomId: id });
                  });
                  item.appendChild(button);
                  elements.roomsContainer.appendChild(item);
              })
        };

        socket.on('roomListUpdated', (data) => {
            updateRoomList(data.rooms);
        });

        socket.on('startGame', (data) => {
            renderGame(data);

            const player = new Player({
                name: data.player1.name,
                skin: '1.jpg',
                index: 1
            });
            const player2 = new Player({
                name: data.player2.name,
                skin: '2.jpg',
                index: 2
            });

            engine.startGame(data.playerIndex, player, player2, {
                bgIndex: data.bgIndex,
                roomId: data.roomId
            });
        });

        socket.on('gamePlayersStatus', function(data) {
            if (data.status) {
                document.querySelector('.js-opponent-info').classList.remove('off');
            } else {
                document.querySelector('.js-opponent-info').classList.add('off');
            }
        });

        socket.on('gameUserLeft', function(data) {
            document.querySelector('.js-opponent-info').classList.add('left');
        });

        function renderGame(data) {
            elements.gameStatus.innerHTML = data.status;
            elements.gameContainer.classList.add('active');
            elements.gameContainer.classList.add('play');

            elements.player1Info.querySelector('.player-info__name').innerHTML = data.player1.name;
            elements.player2Info.querySelector('.player-info__name').innerHTML = data.player2.name;

            if (data.playerIndex === 2) {
                elements.player1Info.classList.add('js-opponent-info');
            } else {
                elements.player2Info.classList.add('js-opponent-info');
            }

            document.querySelector('.js-opponent-info').classList.remove('left');
        }

        const engine = new Engine(socket);

    })()
};
