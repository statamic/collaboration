import Workspace from './Workspace';

export default class Manager {

    constructor() {
        this.echo = null;
        this.workspaces = [];
    }

    boot() {
        if (! this.echo) return;

        this.workspaces.forEach(workspace => {
            workspace.echo = this.echo;
            workspace.start();
        });
    }

    addWorkspace(container) {
        const workspace = new Workspace(container);
        this.workspaces.push(workspace);
        this.boot();
    }

}
