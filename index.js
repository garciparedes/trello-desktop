'use strict';
const path = require('path');
const fs = require('fs');
const app = require('app');
const BrowserWindow = require('browser-window');
const Dialog = require('dialog');
const shell = require('shell');

require('electron-debug')();
require('crash-reporter').start();

let mainWindow;

function updateBadge(title) {
	if (!app.dock) {
		return;
	}

	if (title.indexOf('Messenger') === -1) {
		return;
	}

	const messageCount = (/\(([0-9]+)\)/).exec(title);
	app.dock.setBadge(messageCount ? messageCount[1] : '');
}

function createMainWindow() {
	const win = new BrowserWindow({
		'title': app.getName(),
		'show': false,
		'width': 800,
		'height': 600,
		'icon': process.platform === 'linux' && path.join(__dirname, 'media', 'Icon.png'),
		'min-width': 400,
		'min-height': 200,
		'title-bar-style': 'hidden-inset',
		'web-preferences': {
			// fails without this because of CommonJS script detection
			'node-integration': false,

			'preload': path.join(__dirname, 'browser.js'),

			// required for Facebook active ping thingy
			'web-security': false,

			'plugins': true
		}
	});

	win.loadUrl('https://trello.com/login');
	win.on('closed', app.quit);
	//win.on('page-title-updated', (e, title) => updateBadge(title));

	return win;
}

app.on('ready', () => {

	mainWindow = createMainWindow();

	const page = mainWindow.webContents;

	page.on('dom-ready', () => {
		page.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'));
		mainWindow.show();
	});

	page.on('new-window', (e, url) => {
		e.preventDefault();
		shell.openExternal(url);
	});

	mainWindow.webContents.session.on('will-download', (event, item) => {
		const totalBytes = item.getTotalBytes();

		item.on('updated', () => {
			mainWindow.setProgressBar(item.getReceivedBytes() / totalBytes);
		});

		item.on('done', (e, state) => {
			mainWindow.setProgressBar(-1);

			if (state === 'interrupted') {
				Dialog.showErrorBox('Download error', 'The download was interrupted');
			}
		});
	});
});
