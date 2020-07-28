const { app, BrowserWindow, dialog } = require('electron')
const fs = require('fs')

const windows = new Set()
const openFiles = new Map();

let mainWindow = null

app.on('ready', () => {
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        return false
    }

    app.quit()
})

app.on('activate', (event, hasVisibleWindows) => {
    if (!hasVisibleWindows) { createWindow() }
})

app.on('will-finish-launching', () => {
    app.on('open-file', (event, file) => {
        const win = createWindow()
        win.once('ready-to-show', () => {
            openFile(win, file)
        })
    })
})

const createWindow = exports.createWindow = () => {
    let x, y

    const currentWindow = BrowserWindow.getFocusedWindow()

    if (currentWindow) {
        const [currentWindowX, currentWindowY] = currentWindow.getPosition()
        x = currentWindowX + 10
        y = currentWindowY + 10
    }

    let newWindow = new BrowserWindow({
        x,
        y,
        show: false,
        webPreferences: { nodeIntegration: true }
    })

    newWindow.loadFile(`${__dirname}/index.html`)
    newWindow.setMenu(null)

    newWindow.once('ready-to-show', () => {
        newWindow.show()
    })

    newWindow.on('close', (event) => {
        if (newWindow.isDocumentEdited()) {
            event.preventDefault()

            const result = dialog.showMessageBox(newWindow, {
                type: 'warning',
                title: 'Quit with Unsaved Changes?',
                message: 'Your changes will be lost if you do not save.',
                buttons: [
                    'Quit Anyway',
                    'Cancel',
                ],
                defaultId: 0,
                cancelId: 1
            })
            if (result === 0) newWindow.destroy()
        }
    })

    newWindow.on('closed', () => {
        windows.delete(newWindow)
        stopWatchingFile(newWindow)
        newWindow = null
    })

    windows.add(newWindow)
}

const getFileFromUser = exports.getFileFromUser = (targetWindow) => {
    dialog.showOpenDialog(targetWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'Markdown Files', extensions: ['md', 'markdown'] }
        ]
    }).then(files => {
        if (files) {
            openFile(targetWindow, files.filePaths[0])
        }
    }).catch(error => console.log('ERRO AO OBTER ARQUIVOS DO USUÁRIO: ', error.code))
}

const openFile = exports.openFile = (targetWindow, file) => {
    const content = fs.readFileSync(file).toString()
    app.addRecentDocument(file)
    targetWindow.setRepresentedFilename(file)
    targetWindow.webContents.send('file-opened', file, content)
}

const saveHtml = exports.saveHtml = (targetWindow, content) => {
    dialog.showSaveDialog(targetWindow, {
        title: 'Save HTML',
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm'] }
        ]
    }).then(file => {
        if (file) {
            fs.writeFileSync(file.filePath, content)
        }
    }).catch(error => console.log('ERRO AO SALVAR O HTML: ', error.code))
}

const saveMarkdown = exports.saveMarkdown = (targetWindow, file, content) => {
    dialog.showSaveDialog(targetWindow, {
        title: 'Save Markdown',
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'Markdown Files', extensions: ['md', 'markdown'] }
        ]
    }).then(file => {
        if (file) {
            fs.writeFileSync(file.filePath, content)
            openFile(targetWindow, file.filePath)
        }
    }).catch(error => console.log('ERRO AO SALVAR O MARKDOWN: ', error.code))
}

const startWatchingFile = (targetWindow, file) => {
    stopWatchingFile(targetWindow)

    const watcher = fs.watchFile(file, (event) => {
        if (event === 'change') {
            const content = fs.readFileSync(file)
            targetWindow.webContents.send('file-changed', file, content)
        }
    })
    openFiles.set(targetWindow, watcher)
}
const stopWatchingFile = (targetWindow) => {
    if (openFiles.has(targetWindow)) {
        openFiles.get(targetWindow).stop()
        openFiles.delete(targetWindow)
    }
}