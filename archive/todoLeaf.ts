import {IconName, MarkdownView, MarkdownViewModeType, moment, TFile, WorkspaceLeaf} from 'obsidian';
import {PearPluginSettings} from "../src/settings";

export const VIEW_TODO_PREVIEW = 'todo-preview';

export class TodoLeaf extends MarkdownView {
	settings: PearPluginSettings;

	constructor(settings: PearPluginSettings, leaf: WorkspaceLeaf) {
		super(leaf);
		this.settings = settings;
	}

	getViewType() {
		return VIEW_TODO_PREVIEW;
	}

	getIcon(): IconName {
		return 'list-todo';
	}

	getMode(): MarkdownViewModeType {
		return 'preview';
	}

	getDisplayText() {
		return 'Example view';
	}

	async onOpen() {
		await super.onOpen();
		let file = this.app.vault.getFileByPath(this.settings.todoFile);
		if (file == null) {
			return;
		}
		console.log(await this.leaf.openFile(file, { active: false }));
		const container = this.containerEl.children[1];
		container.addClass('pear-upcoming-list');
	}

	// async onClose() {
		// Nothing to clean up.
	// }
}
