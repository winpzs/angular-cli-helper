'use strict';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext, commands, window,QuickPickItem, Terminal, workspace } from 'vscode'; 

function getCurrentPath(args): string {
    return args && args.fsPath ? args.fsPath : (window.activeTextEditor ? window.activeTextEditor.document.fileName : '');
}

function getRelativePath(args): string {
    let fsPath = getCurrentPath(args);

    let stats = fs.lstatSync(fsPath),
        isDir = stats.isDirectory();

    return isDir ? fsPath : path.parse(fsPath).dir;
}

export interface IGenerateConfig{
    command:string;
    title:string;
}

export interface IBuildParam{
    param:string;
    title:string;
}

function config<T>(property: string, defaultValue?: T): T {
    return workspace.getConfiguration('angularclihelper').get<T>(property, defaultValue);
}

function generateConfig():Array<IGenerateConfig>{
    return config<Array<IGenerateConfig>>('generateConfig');
}

function buildParam():Array<IBuildParam>{
    return config<Array<IBuildParam>>('buildParam');
}

export function activate(context: ExtensionContext) {

    let build_terminal:Terminal,
        serve_terminal:Terminal,
        generate_terminal:Terminal;
    let disposeTerminal = function(terminal:Terminal){
        try{
            terminal && terminal.dispose();
        } catch(e){
            return;
        }
    }
    context.subscriptions.push({
        dispose:()=>{
            disposeTerminal(serve_terminal);
            disposeTerminal(serve_terminal);
            disposeTerminal(generate_terminal);
            disposeTerminal(other_terminal);
        }
    });

    context.subscriptions.push(commands.registerCommand('angularclihelper.serve', (args) => {
        let fsPath = getRelativePath(args);
        disposeTerminal(serve_terminal);
        serve_terminal = window.createTerminal("ng-serve");
        serve_terminal.show(true);
        serve_terminal.sendText('cd "' + fsPath + '"');
        serve_terminal.sendText("ng serve");
    }));
    
    let send_build_terminal = function (fsPath: string, cmd: string) {
        disposeTerminal(build_terminal);
        build_terminal = window.createTerminal("ng-build");
        build_terminal.show(true);
        fsPath && build_terminal.sendText('cd "' + fsPath + '"');
        build_terminal.sendText(cmd);
    };

    context.subscriptions.push(commands.registerCommand('angularclihelper.build', (args) => {
        let params = buildParam(),
            picks = params.map((item) => item.title);

        let fsPath = getRelativePath(args);
        window.showQuickPick(picks).then((data) => {
                if (!data) return;
                let item = params.find((item) => item.title == data);
                if (!item) return;
                send_build_terminal(fsPath, "ng build " + item.param);
            });

    }));
    
    let other_terminal:Terminal;
    let send_other_terminal = function (fsPath: string, cmd: string) {
        disposeTerminal(serve_terminal);
        other_terminal = window.createTerminal("ng-other");
        other_terminal.show(true);
        fsPath && other_terminal.sendText('cd "' + fsPath + '"');
        other_terminal.sendText(cmd);
    };
    context.subscriptions.push(commands.registerCommand('angularclihelper.test', (args) => {
        let fsPath = getRelativePath(args);
        send_other_terminal(fsPath, "ng test");
    }));
    
    context.subscriptions.push(commands.registerCommand('angularclihelper.e2e', (args) => {
        let fsPath = getRelativePath(args);
        send_other_terminal(fsPath, "ng e2e");
    }));
    
    let send_generate_terminal = function (fsPath: string, cmd: string) {
        disposeTerminal(generate_terminal);
        generate_terminal = window.createTerminal("ng-generate");
        //build_terminal.show(true);
        fsPath && generate_terminal.sendText('cd "' + fsPath + '"');
        generate_terminal.sendText(cmd);
    };
    context.subscriptions.push(commands.registerCommand('angularclihelper.generate', (args) => {
        let configs = generateConfig(),
            picks = configs.map((item) => item.title);

        let fsPath = getRelativePath(args),
            curPath = getCurrentPath(args);
        window.showQuickPick(picks).then((data) => {
            if (!data) return;
            let item = configs.find((item) => item.title == data);
            if (!item || !item.command) return;

            let defaultName = path.basename(curPath);
            defaultName = defaultName.split('.')[0];

            window.showInputBox({
                prompt: '请输入文件名称？',
                value: defaultName
            }).then((fileName) => {
                if (!fileName)
                    window.showInformationMessage('请输入名称!');
                else if (/[~`!#$%\^&*+=\[\]\\';,{}|\\":<>\?]/g.test(fileName)) {
                    window.showInformationMessage('文件名称存在不合法字符!');
                } else {
                    let cmd = item.command.replace(/\%input\%/gi, fileName);
                    console.log(cmd);
                    send_generate_terminal(fsPath, cmd);
                }
            },
            (error) => console.error(error));
        });

    }));

}

