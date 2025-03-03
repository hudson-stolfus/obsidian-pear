import {Editor, Hotkey, Plugin} from 'obsidian';
import {EditorView} from "@codemirror/view";
import {DEFAULT_SETTINGS, PearPluginSettings, PearSettingsTab} from "./settings";
import {Task} from "./task";
import {Embed} from "./embed";

export default class PearPlugin extends Plugin {
	settings: PearPluginSettings;
	tasks: Task[] = [];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PearSettingsTab(this.app, this));

		this.registerMarkdownPostProcessor((element, context) => {
			let markdown = context.getSectionInfo(element)?.text ?? '';
			if (markdown === '') return;

			element.querySelectorAll('pre:has(code.language-pear)').forEach(pearEmbed => {
				let embed = new Embed(pearEmbed.getText(), this);
				pearEmbed.replaceWith(embed.render());
			});

			// Unsure about the reliability of using :nth-child along with section info.
			let i = 1;
			this.tasks = Task.parseTasks(markdown, (task) => {
				task.attachPreviewResult(element.querySelector(`.task-list-item:nth-child(${i})`));
				task.render();
				i ++;
			}, this);
		});

		this.registerEditorExtension(EditorView.updateListener.of((update): void => {
			const { state, dispatch } = update.view;
			Task.parseTasks(state.doc.toString(), (task) => {}, this);
		}));

		this.registerInterval(window.setInterval(() => {
			this.tasks.forEach(task => {
				task.render();
			});
		}, 5000))

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
