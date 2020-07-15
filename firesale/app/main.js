const { app, BrowserWindow, dialog } = require('electron')
const fs = require('fs')

let mainWindow = null

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadFile(`${__dirname}/index.html`);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
        getFileFromUser()
    })

    mainWindow.on('closed', () => {
        mainWindow = null;
    })
})

const getFileFromUser = exports.getFileFromUser = () => {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'Markdown Files', extensions: ['md', 'markdown'] }
        ]
    }).then(files => {
        if (files) {
            openFile(files.filePaths[0])
        }
    }).catch(error => console.log('ERRO: ', error.code))
}

const openFile = (file) => {
    const content = fs.readFileSync(file).toString()
    mainWindow.webContents.send('file-opened', file, content)
}