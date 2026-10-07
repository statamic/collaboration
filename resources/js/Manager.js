import EmptyWorkspace from './EmptyWorkspace';
import Workspace from './Workspace';

export default class Manager {

    constructor() {
        this.echo = null;
        this.workspaces = {};
    }

    boot() {
        if (! this.echo) return;

        let workspaceStarted = false;


        Object.values(this.workspaces).forEach(workspace => {
            workspace.echo = this.echo;
            workspace.start();

            workspaceStarted = true;
        });

        if( !workspaceStarted ) {
            this.addEmptyWorkspace();
        }
    }

    addEmptyWorkspace() {
        const workspace = new EmptyWorkspace();
        this.workspaces['empty'] = workspace;
        this.boot();
    }

    destroyEmptyWorkspace() {
        this.workspaces['empty'].destroy();
        delete this.workspaces['empty'];
    }

    addWorkspace(container) {
        if( this.workspaces['empty'] ) {
            this.destroyEmptyWorkspace();
        }

        const workspace = new Workspace(container);
        this.workspaces[container.name] = workspace;
        this.boot();
    }

    destroyWorkspace(container) {
        this.workspaces[container.name].destroy();
        delete this.workspaces[container.name];
    }

}
