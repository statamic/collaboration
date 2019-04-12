import Workspace from './Workspace';

export default class Manager {

    constructor() {
        this.echo = null;
        this.workspaces = {};
    }

    boot() {
        if (! this.echo) return;

        Object.values(this.workspaces).forEach(workspace => {
            workspace.echo = this.echo;
            workspace.start();
        });
    }

    addWorkspace(container) {
        const workspace = new Workspace(container);
        this.workspaces[container.name] = workspace;
        this.boot();
    }

    destroyWorkspace(container) {
        this.workspaces[container.name].destroy();
        delete this.workspaces[container.name];
    }

}
