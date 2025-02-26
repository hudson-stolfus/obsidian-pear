import {Editor, Hotkey, Plugin} from 'obsidian';
import {EditorView} from "@codemirror/view";
import {DEFAULT_SETTINGS, PearPluginSettings, PearSettingsTab} from "./settings";
import {Task} from "./task";

export default class PearPlugin extends Plugin {
	settings: PearPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PearSettingsTab(this.app, this));

		this.registerMarkdownPostProcessor((element, context) => {
			const markdown = context.getSectionInfo(element)?.text;
			if (markdown == undefined) return;

			// Unsure about the reliability of using :nth-child along with section info.
			let i = 1;
			let tasks = Task.parseTasks(markdown, (task) => {
				console.log(task.attachments);
				task.attachPreviewResult(element.querySelector(`.task-list-item:nth-child(${i})`));
				task.render();
				i ++;
			}, this);
		});

		this.registerEditorExtension(EditorView.updateListener.of((update): void => {
			const { state, dispatch } = update.view;
			Task.parseTasks(state.doc.toString(), (task) => {}, this);
		}));

		this.addCommand({
			id: "mark-task-complete",
			name: "Mark task complete",
			hotkeys: [
				{ key: 'enter', modifiers: [ "Ctrl" ] } as Hotkey
			],
			editorCallback: (editor: Editor) => {

			},
		});
	}

	async onunload() {
		await this.saveSettings();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(Object.assign({}, this.settings));
	}
}
