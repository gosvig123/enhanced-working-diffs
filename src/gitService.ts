import * as vscode from 'vscode';
import * as path from 'path';

// Import the Git API types
export interface GitExtension {
    readonly enabled: boolean;
    readonly onDidChangeEnablement: vscode.Event<boolean>;
    getAPI(version: 1): GitAPI;
}

export interface GitAPI {
    readonly state: 'uninitialized' | 'initialized';
    readonly onDidChangeState: vscode.Event<'uninitialized' | 'initialized'>;
    readonly git: Git;
    readonly repositories: Repository[];
    readonly onDidOpenRepository: vscode.Event<Repository>;
    readonly onDidCloseRepository: vscode.Event<Repository>;
    toGitUri(uri: vscode.Uri, ref: string): vscode.Uri;
    getRepository(uri: vscode.Uri): Repository | null;
}

export interface Git {
    readonly path: string;
}

export interface Repository {
    readonly rootUri: vscode.Uri;
    readonly state: RepositoryState;
    diffWith(ref: string): Promise<Change[]>;
    diffWith(ref: string, path: string): Promise<string>;
    diffIndexWith(ref: string): Promise<Change[]>;
    diffIndexWith(ref: string, path: string): Promise<string>;
    diffWithHEAD(): Promise<Change[]>;
    diffWithHEAD(path: string): Promise<string>;
    diff(cached?: boolean): Promise<string>;
    status(): Promise<void>;
}

export interface RepositoryState {
    readonly HEAD: Branch | undefined;
    readonly refs: Ref[];
    readonly remotes: Remote[];
    readonly submodules: Submodule[];
    readonly rebaseCommit: Commit | undefined;
    readonly mergeChanges: Change[];
    readonly indexChanges: Change[];
    readonly workingTreeChanges: Change[];
    readonly untrackedChanges: Change[];
    readonly onDidChange: vscode.Event<void>;
}

export interface Branch {
    readonly name?: string;
    readonly commit?: string;
    readonly upstream?: { name: string; remote: string; };
}

export interface Ref {
    readonly type: RefType;
    readonly name?: string;
    readonly commit?: string;
}

export enum RefType {
    Head,
    RemoteHead,
    Tag
}

export interface Remote {
    readonly name: string;
    readonly fetchUrl?: string;
    readonly pushUrl?: string;
    readonly isReadOnly: boolean;
}

export interface Submodule {
    readonly name: string;
    readonly path: string;
    readonly url: string;
}

export interface Commit {
    readonly hash: string;
    readonly message: string;
    readonly parents: string[];
}

export interface Change {
    readonly uri: vscode.Uri;
    readonly originalUri: vscode.Uri;
    readonly renameUri: vscode.Uri | undefined;
    readonly status: Status;
}

export enum Status {
    INDEX_MODIFIED,
    INDEX_ADDED,
    INDEX_DELETED,
    INDEX_RENAMED,
    INDEX_COPIED,
    MODIFIED,
    DELETED,
    UNTRACKED,
    IGNORED,
    INTENT_TO_ADD,
    INTENT_TO_RENAME,
    TYPE_CHANGED,
    ADDED_BY_US,
    ADDED_BY_THEM,
    DELETED_BY_US,
    DELETED_BY_THEM,
    BOTH_ADDED,
    BOTH_DELETED,
    BOTH_MODIFIED
}

/**
 * GitService class to interact with VS Code's Git API
 */
export class GitService {
    private gitAPI: GitAPI | undefined;

    constructor() {
        this.initGitAPI();
    }

    /**
     * Initialize the Git API
     */
    private initGitAPI(): void {
        try {
            const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
            if (gitExtension) {
                this.gitAPI = gitExtension.getAPI(1);
            }
        } catch (error) {
            console.error('Failed to initialize Git API:', error);
        }
    }

    /**
     * Get the repository for a given file path
     * @param filePath The file path to get the repository for
     * @returns The repository or null if not found
     */
    public getRepository(filePath: string): Repository | null {
        if (!this.gitAPI) {
            return null;
        }

        const uri = vscode.Uri.file(filePath);
        return this.gitAPI.getRepository(uri);
    }

    /**
     * Check if a file is tracked and has changes in git
     * @param filePath The file path to check
     * @returns An object with information about the file's status
     */
    public async getFileStatus(filePath: string): Promise<{ 
        isModified: boolean; 
        relativePath: string;
        workspaceFolder: vscode.WorkspaceFolder | undefined;
    } | null> {
        const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath);
        if (!document) {
            return null;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return null;
        }

        const repository = this.getRepository(filePath);
        if (!repository) {
            return null;
        }

        // Make sure the repository state is up to date
        await repository.status();

        const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath).replace(/\\/g, '/');
        
        // Check if the file is modified in the working tree
        const isModified = repository.state.workingTreeChanges.some(change => 
            change.uri.fsPath === filePath
        );

        return {
            isModified,
            relativePath,
            workspaceFolder
        };
    }

    /**
     * Get the diff for a file
     * @param filePath The file path to get the diff for
     * @returns The diff as a string or null if not available
     */
    public async getDiff(filePath: string): Promise<string | null> {
        const repository = this.getRepository(filePath);
        if (!repository) {
            return null;
        }

        try {
            // Get the diff for the file
            const diff = await repository.diffWithHEAD(filePath);
            return diff;
        } catch (error) {
            console.error('Error getting diff:', error);
            return null;
        }
    }
}
