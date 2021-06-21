
module.exports = class extends require('../../lib/Command') {

    async execute() {

        let stage = this.getGuild().channels.resolve("855252064912932865");
        let connection = await stage.join()

        dispatcher = connection.play('../../../music/queue1.mp3');
        dispatcher.setVolume(0.2);

    }
}