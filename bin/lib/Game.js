
const app = require('../../app');
const {GuildPlayer, MessageEmbed} = require('discord.js');
const MessageInteractable = require('./MessageInteractable');

const GameStage = ['INITIALIZING', 'PLAYER_SELECTION', 'MAP_SELECTION', 'WAITING_FOR_CASTER', 'IN_GAME', 'POST_GAME', 'FINISHED'];

module.exports = class {

    id = Object.keys(app.gamemap).length;
    snowflake = app.snowflake.generateSnowflake();
    category = 0;
    gamestage = 0;
    channels = {};
    guild = null;
    map = "";
    invite = null;
    players = [];
    players_unassigned = [];
    epoch = 0;
    map_pool = ['ASCENT', 'HAVEN', 'BIND', 'SPLIT', 'ICEBOX'];
    teams = [];

    staff_alert = 0;

    /**
     *
     * @param {Guild} guild discord.js#guild
     * @param {[GuildMember]}players
     */
    constructor(guild, players) {

        app.gamemap.push(this);

        this.epoch = (new Date()).getTime();
        this.guild = guild;
        this.players = players;
        this.players_unassigned = [...players];

        // Determine Captains
        let captains = this.#determineCaptains();

        this.players_unassigned = removeItemAll(this.players_unassigned, captains[0].id);
        this.players_unassigned = removeItemAll(this.players_unassigned, captains[1].id);

        // Create teams
        this.teams.push({
            captain: captains[0],
            name: "Red",
            text_channel: null,
            voice_channel: null,
            players: [captains[0].id]
        },{
            captain: captains[1],
            name: "Blue",
            text_channel: null,
            voice_channel: null,
            players: [captains[1].id]
        });

        app.database.registerGame(this).then(r => {
            this.teams[0].snowflake = r['team0']
            this.teams[1].snowflake = r['team1']
            console.log(`Game ${this.snowflake} has been pushed to db`)
        });

        this.staff_alert = setTimeout(()=>{
            this.staff_alert = null;
            this.channels['staff'].send(`<@&${app.config.guilds[this.guild.id].supportRole}> this match has gone 60 seconds without team selection. Assistance may be needed.`);
        },60000);

        // Create channels
        this.#createChannels();
    }

    /**
     * get unique game identifier
     * @returns {number} Game identifier
     */
    getId() {
        return this.id;
    }

    /**
     * Cancel match and run cleanup such as deleting channels and adding players back to queue
     */
    cancel(silent) {
        // Update database
        app.database.finishGame(this);

        if(this.staff_alert != null){
            clearInterval(this.staff_alert);
            this.staff_alert = null;
        }
        // Delete channels
        app.discordClient.channels.fetch(this.category).then(category => {
            (async ()=>{
                for(const channel of category['children']){
                    await channel[1].delete()
                }
                category.delete().then(null);
            })();
        })

        // Remove object
        app.gamemap = removeItemAll(app.gamemap,this);

        // Message players
        if(silent === undefined || silent === false) {
            this.players.forEach(player => {
                // Give queue priority for 5 minutes
                app.queuemap[this.guild['id']].priority.push({
                    player: player,
                    expires: (new Date()).getTime(60000)
                });

                // Direct message player
                app.discordClient.users.resolve(player).send(new MessageEmbed().setColor("RED").setTitle("Your match has been cancelled").setDescription(`The game ${this.id} has been cancelled. You have been returned to the queue.\n\n**If you re-queue within a minute you will be at the top**`)).then(null);
            });
        }

        delete this;
    }

    /**
     * Set the team of a player in the game
     * @param {Snowflake} player Discord.JS player object
     * @param {Number} teamId Team number (0 - 1)
     */
    setTeam(player, teamId) {
        let currentTeam = this.getTeam(player);
        if(currentTeam != null)
            currentTeam.players = removeItemAll(currentTeam.players, player);
        this.players_unassigned = removeItemAll(this.players_unassigned, player);
        if(this.teams[teamId] !== undefined)
            this.teams[teamId].players.push(player);
        this.teams.forEach(team => {
            if(team.voice_channel !== null)
                team.voice_channel.overwritePermissions(createOverrideFromlist(team.players, this.guild))
        })
    }

    setTeamName(team, name) {
        app.database.setTeamName(this.teams[team].snowflake, name);
    }

    setCaptain(team, player) {
        this.teams[team].captain = player;
        this.teams[team].text_channel.overwritePermissions(createOverrideFromlist([player.id], this.guild));
        this.setTeam(player.id, team);
    }

    /**
     *
     * @param {Snowflake} player
     * @returns {{}} Team
     */
    getTeam(player) {
        return this.teams.find((team => {
            if(team.players.indexOf((player.id !== undefined)?player.id:player) > -1)
                return team;
        }))
    }

    async setCasters(members) {
        for (const member of members) {
            let player = await app.database.getPlayerOrCreate(member[0]);
            let caster = await app.database.getCasterOrCreate(player.snowflake, "");
            app.database.addCasterToGame(this.snowflake, caster.snowflake);
            app.integration.giveCasterGame(caster.snowflake, this.snowflake)
        }
    }

    addPlayer(player) {
        this.players.push(player);
        this.players_unassigned.push(player);

        app.discordClient.channels.fetch(this.category).then(channel =>
            channel.overwritePermissions(createOverrideFromlist(this.players, this.guild))
        )
    }
    removePlayer(player) {
        this.players = removeItemAll(this.players, player);
        this.players_unassigned = removeItemAll(this.players_unassigned, player);
        let team = this.getTeam(player);
        if(team !== null) {
            if(team.captain.id === player){
                this.channels['staff'].send(`A team captain has been removed from the game. Please specify a new Captain using \`.game this setcaptain ${this.teams.indexOf(team)+1} {player}\``);
            }
        }

        this.setTeam(player, null);

        app.discordClient.channels.fetch(this.category).then(channel =>
            channel.overwritePermissions(createOverrideFromlist(this.players, this.guild))
        )
    }

    setStage(stage) {
        switch(stage.toUpperCase()) {
            case "PLAYER_SELECTION":
                this.teams.forEach(team => {
                    team.interact.cancel();
                    this.#doTeamSelection(team.text_channel, this.teams.indexOf(team));
                });
                break;
            case "MAP_SELECTION":
                this.teams.forEach(team => {
                    team.interact.cancel();
                    this.#doMapSelection(team.text_channel, this.teams.indexOf(team));
                });
                break;
            case "NAME_SELECTION":
                this.teams.forEach(team => {
                    team.interact.cancel();
                    this.#doTeamNameSelection(team.text_channel, this.teams.indexOf(team));
                });
                break;
            case "WAITING_FOR_CASTER":
                this.teams.forEach(async team => {
                    this.#doSelectionCleanup(await app.discordClient.channels.fetch(team.text_channel), this.teams.indexOf(team));
                });
                break;
        }
    }

    getSub(channel) {
        let embed = new MessageEmbed().setTitle("Added player from queue").setColor("BLURPLE");
        let member = app.queuemap[this.guild.id].getQueueMembers()[0]
        app.queuemap[this.guild.id].removeFromQueue(member);
        this.addPlayer(member);
        embed.setDescription("Added <@"+member+"> from queue");
        channel.send(embed);
        return member;
    }

    printv(channel) {
        let embed = new MessageEmbed().setTitle("Game debug");
        embed.addField("Category", "> "+this.id);
        embed.addField("Stage", "> "+GameStage[this.gamestage]);
        embed.addField("Maps", "> "+JSON.stringify(this.map_pool));
        embed.addField("Players", "> "+JSON.stringify(this.players));
        embed.addField("Players Unassigned", "> "+JSON.stringify(this.players_unassigned));
        embed.addField("Team 1", "> "+formatPlayers(this.teams[0].players));
        embed.addField("Team 2", "> "+formatPlayers(this.teams[1].players));
        embed.addField("Epoch", "> "+this.epoch);

        embed.setFooter(this.snowflake)
        this.teams.forEach(team => {
            embed.addField(team+ " Active Interaction", "> "+team.interact.discordMessage);
            embed.addField(team+ " Players", "> "+JSON.stringify(team.players));
            embed.addField(team+" isActive", "> "+team.interact.discordMessage.active);
        });
        channel.send(embed);

        console.log(JSON.stringify({
            game_id: this.id,
            snowflake: this.snowflake,
            category: this.category,
            gamestage: this.gamestage,
            channels: Object.keys(this.channels),
            map: this.map,
            invite: this.invite.code,
            players: this.players,
            players_unassigned: this.players_unassigned,
            epoch: this.epoch,
            map_pool: this.map_pool,
            teams: this.teams
        }));
    }

    /**
     * Create all channels needed for game to run
     */
    #createChannels() {
        let permissionOverwrites = createOverrideFromlist(this.players, this.guild);

        this.guild.channels.create(`10 Mans Game ${this.snowflake}`, {
            type: "category",
            position: app.config.parameters.hoist_offset,
            reason: "10 Mans game has started",
            permissionOverwrites: permissionOverwrites
        }).then(category => {
            this.category = category.id;
            // Create channels
            this.guild.channels.create(`main`, {
                type: "text",
                parent: category,
                reason: "10 Mans game has started"
            }).then(mainChannel => {
                mainChannel.lockPermissions();
                this.channels['main'] = mainChannel;

                var embed = new (require('discord.js')).MessageEmbed();
                embed.setTitle("10 Mans Game");
                embed.setColor("BLURPLE")
                embed.addField("Captains", `**Team 1** <@${this.teams[0].captain.user.id}>\n**Team 2** <@${this.teams[1].captain.user.id}>`)
                embed.addField("Players", formatPlayers(this.players))
                mainChannel.send(embed)

                mainChannel.send(formatPlayers(this.players)).then(message => message.delete());
            })


            this.guild.channels.create(`Team 1`, {
                type: "text",
                parent: category,
                reason: "10 Mans game has started",
                permissionOverwrites: createOverrideFromlist([this.teams[0].captain.user.id], this.guild)
            }).then(mainChannel => {
                this.channels['team1'] = mainChannel;
                this.teams[0].text_channel = mainChannel.id;
                mainChannel.send(`<@${this.teams[0].captain.user.id}>`).then(message => message.delete());
                mainChannel.send(new (require('discord.js')).MessageEmbed().setColor("RED").setTitle("You are a captain").setDescription("If you are seeing this message you have been given captaincy for a team.\n You will be able to decide your teammates and the map.\n Please follow the prompts below to continue!\n\n**If needed you can tag <@&"+app.config.guilds[this.guild.id].supportRole+"> for support.**"));

                this.#doTeamSelection(mainChannel, 0);
            });


            this.guild.channels.create(`Team 2`, {
                type: "text",
                parent: category,
                reason: "10 Mans game has started",
                permissionOverwrites: createOverrideFromlist([this.teams[1].captain.user.id], this.guild)
            }).then(mainChannel => {
                this.channels['team2'] = mainChannel;
                this.teams[1].text_channel = mainChannel.id;
                mainChannel.send(`<@${this.teams[1].captain.user.id}>`).then(message => message.delete());
                mainChannel.send(new MessageEmbed().setColor("RED").setTitle("You are a captain").setDescription("If you are seeing this message you have been given captaincy for a team.\n You will be able to decide your teammates and the map.\n Please follow the prompts below to continue!\n\n**If needed you can tag <@&"+app.config.guilds[this.guild.id].supportRole+"> for support.**"));

                this.#doTeamSelection(mainChannel, 1);
            })

            this.guild.channels.create(`Game general voice`, {
                type: "voice",
                parent: category,
                reason: "10 Mans game has started"
            }).then(voiceChannel => {
                this.channels['voice'] = voiceChannel;
                voiceChannel.lockPermissions();
                voiceChannel.createInvite({
                    temporary: false,
                    reason: "10 Mans game has started"
                }).then((invite)=>{
                    this.invite = invite;
                    // Message all players informing them game is ready
                    this.players.forEach(player => {
                        app.discordClient.users.fetch(player, true).then(p => {
                            p.send(
                                new MessageEmbed()
                                    .setColor("RED")
                                    .setTitle("You have a 10 Mans game!!!")
                                    .setDescription(`This message is to inform you that you need to join the voice channel for 10 mans game #${Object.keys(app.gamemap).length}.`)
                                    .setFooter(`Click below to join the voice channel`, `https://discord.com/invite/${this.invite.code}`)
                            ).then(null).catch((e)=>{});
                            p.send(`https://discord.com/invite/${this.invite.code}`).then(null).catch((e)=>{});
                        })
                    })
                })
            });

            this.guild.channels.create(`staff-actions`, {
                type: "text",
                parent: category,
                reason: "10 Mans game has started",
                permissionOverwrites: createOverrideFromlist([], this.guild)
            }).then(mainChannel => {
                this.channels['staff'] = mainChannel;
                mainChannel.send(new MessageEmbed().setColor("RED").setDescription("This channel can be used to run game specific commands. These commands are listed below")
                    .addField("Cancel Match",".game this cancel")
                    .addField("Remove player",".game this remplayer {tag}")
                    .addField("Add player",".game this addplayer {tag}")
                    .addField("Set player team",".game this setteam {tag} {1 - 2}")
                    .addField("Add next player",".game this getsub")
                    .addField("Set team name",".game this setname {1 -2} {name (max 1 word)}")
                    .addField("Set Casters",".game this setcasters {tag all casters...}")
                );
            });
        });

    }

    #doTeamSelection(channel, team) {
        this.gamestage = 1;
        this.teams[team].interact = new MessageInteractable((reaction => {
            if(this.staff_alert != null) {
                clearTimeout(this.staff_alert);
                this.staff_alert = null;
            }

            let emojies = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
            reaction.message.reactions.removeAll();
            reaction.message.guild.members.fetch(this.players_unassigned[emojies.indexOf(reaction._emoji.name)]).then(member => {
                this.players_unassigned = removeItemAll(this.players_unassigned, member.id);
                this.teams[team].interact.setActive(false);
                this.teams[team].interact.doRenderAction(this.players_unassigned);
                this.teams[team===0?1:0].interact.setActive(true);
                this.teams[team===0?1:0].interact.doRenderAction(this.players_unassigned);
                this.setTeam(member.id, team);

                if(this.players_unassigned.length <= 1) {
                    this.teams[0].interact.cancel();
                    this.teams[1].interact.cancel();
                    this.gamestage = 2;

                    reaction.message.guild.members.fetch(this.players_unassigned[0]).then(member => {
                        this.setTeam(member.id, team===0?1:0);
                    });
                }
            })
        }), {
            title: ["Select your players", "Waiting for other captain..."],
            color: '00a8ff',
            defaultsActive: team === 0,
            fields: this.players_unassigned,
            modules: ['GUILDMEMBER_SELECT']
        }, channel, ()=>{
            this.#doMapSelection(channel, team);
        });
    }

    #doMapSelection(channel, team) {
        console.log("Started map selection for "+team+" sending in "+channel);
        this.teams[team].interact = new MessageInteractable((reaction => {
            let emojies = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
            reaction.message.reactions.removeAll();

            let map = this.map_pool[emojies.indexOf(reaction._emoji.name)];

            this.map_pool = removeItemAll(this.map_pool, map);
            this.teams[team].interact.setActive(false);
            this.teams[team].interact.doRenderAction(this.map_pool);
            this.teams[team===0?1:0].interact.setActive(true);
            this.teams[team===0?1:0].interact.doRenderAction(this.map_pool);

            if(this.map_pool.length === 1) {
                this.map = this.map_pool[0];
                this.teams[team].interact.cancel();
                this.teams[team===0?1:0].interact.cancel();
                this.gamestage = 3;

                // Update in Database
                app.database.setGameMap(this, this.map_pool[0]);
            }
        }), {
            title: ["Ban a map", "Waiting for other captain..."],
            color: '00a8ff',
            defaultsActive: team === 1,
            fields: this.map_pool,
            modules: ['MAP_SELECT']
        }, channel, ()=>{
            this.#doTeamNameSelection(channel, team);
        });
    }

    #doTeamNameSelection(channel, team) {

        // TODO Find a good way to name teams. For now can be done by 10 Mans staff
        channel.send(
            new MessageEmbed().setColor('#00a8ff')
                .setTitle(`Creativity time`)
                .setDescription("Please think of a 1 word team name that is less than 7 characters.")
                .setFooter("Inappropriate team names will result in suspension from this event"));

        app.selfDistructiveChannelListener[channel.id] = (message)=>{
            channel.send(`You want your team name to be... ${message.content.split(' ')[0].substr(0,7)}? Ok i guess... Let me get this checked real quick <@&${app.config.guilds[channel.guild.id].supportRole}>`);

            setTimeout(() => {
                this.#doSelectionCleanup(channel,team);
            }, 6000);

        }
    }

    #doSelectionCleanup(channel, team) {

        this.channels['main'].send(
            new MessageEmbed().setColor(team===0?'#FF7D7D':'#7D9FFF')
                .setTitle(this.teams[team].name+` team Summary`)
                .addField("Captain", `<@${this.teams[team].captain.id}>`)
                .addField("Players", formatPlayers(this.teams[team].players))
                .addField("Map", this.map));
        // Create team voice channels
        app.discordClient.channels.fetch(this.category).then(category => {
            this.guild.channels.create(`Team ${this.teams[team].name} Voice`, {
                type: "voice",
                parent: category,
                permissionOverwrites: createOverrideFromlist(this.teams[team].players, this.guild),
                reason: "10 Mans game has started"
            }).then(mainChannel => {
                this.teams[0].voice_channel = mainChannel;
            });
        });
    }

    /**
     * Decide captains depending on their ranks and other factors
     * @returns {GuildPlayer[]}
     */
    #determineCaptains() {

        // Group players into ranks
        let rank_grouping = {};
        let captains = [];
        // Check sizes of ranks
        // Pick highest 2 players as captains

        app.config.guilds[this.guild.id].captainPriority.forEach(role => rank_grouping[`${role.name}`] = []);
        let rank_names = Object.keys(rank_grouping);

        this.players.forEach(player => {
            player = this.guild.members.resolve(player);
            let rank = undefined;

            for(let i=0; i<rank_names.length && rank === undefined; i++)
                rank = player.roles.cache.find((role, _) => role.name === rank_names[i]);
            rank_grouping[rank.name].push(player);
        });

        rank_names.forEach(rank =>
            rank_grouping[rank].forEach(player => {
                if (captains.length < 2){
                    captains.push(player);
                }
            })
        );

        return captains;
    }
}
function createOverrideFromlist(players, guild) {
    let permissionOverwrites = [
        {
            id: guild.roles.everyone,
            deny: ['VIEW_CHANNEL'],
            allow: ['SEND_MESSAGES', 'CONNECT', 'SPEAK', 'USE_VAD', 'READ_MESSAGE_HISTORY']
        },
        {
            id: guild.roles.cache.find(role => role.id === app.config.guilds[guild.id].supportRole),
            allow: ['VIEW_CHANNEL', 'PRIORITY_SPEAKER', 'ADMINISTRATOR']
        },
        {
            id: app.discordClient.user.id,
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES']
        }
    ];

    players.forEach(player => {
        permissionOverwrites.push({
            id: player,
            allow: ['VIEW_CHANNEL']
        })
    });

    return permissionOverwrites;
}
function formatPlayers(players) {
    var reply = "";
    players.forEach(player => reply+=`**${players.indexOf(player)+1}** <@${player}>\n`);
    return reply;
}

function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}