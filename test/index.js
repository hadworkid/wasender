const { Connection } = require('../src');

const init = async () => {
    try {
        const client = await (new Connection()).createSession({
            sessionName: 'session-test',
        });

        const resp = await client.sendMessage({
            to: '6281314972509',
            content: {
                caption: 'Test',
            }
        });
        console.log(resp);
    } catch (err) {
        console.log(err);
    }
};

init();