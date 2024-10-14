import {
	App,
	Editor, Hotkey,
	Plugin,
	PluginSettingTab,
	Setting, MarkdownView,
} from 'obsidian';
import {EditorView} from "@codemirror/view";
import DurationConstructor = moment.unitOfTime.DurationConstructor;
import {Task, COMPLETE, DEFAULT} from "./task";
import {PearPluginSettings} from "./settings";

const DEFAULT_SETTINGS: PearPluginSettings = {
	dateFormats: [ "YYYY-MM-DD HH:mm" ],
	floatingDates: false,
	hideCompleted: true,
	schedulingEnabled: true,
	showPeriod: { period: 2, unit: "weeks" }
}

export default class PearPlugin extends Plugin {
	settings: PearPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PearSettingTab(this.app, this));

		this.registerMarkdownPostProcessor((element, context) => {
			const sectionInfo = context.getSectionInfo(element);
			const file = this.app.vault.getFileByPath(context.sourcePath);
			if (!sectionInfo || !file) return;
			let cache: {[key: number]: Task} = {};

			for (const [line, lineText] of sectionInfo.text.split('\n').entries()) {
				if (lineText.search(/^(\t| {2})*- \[.] /g) != -1) {
					cache[line] = new Task(lineText, file, this);
				}
			}

			const taskEls = element.findAll('li.task-list-item');
			for (const [index, taskEl] of taskEls.entries()) {
				const queue = cache[sectionInfo.lineStart + Number(taskEl.getAttr('data-line') ?? -1)];
				if (!queue) return;
				queue.attachPreviewResult(taskEl);
				queue.render();
			}
		});

		this.registerInterval(window.setInterval(() => {

		}, 1000));

		this.registerEditorExtension(EditorView.updateListener.of((update): void => {
			const { state, dispatch } = update.view;
			const file = this.app.workspace.getActiveFile();
			let cache: {[key: number]: Task} = {};

			if (this.app.workspace.activeEditor == null) return;

			if (file) for (let i = 1; i <= state.doc.lines; i ++) {
				if (state.doc.line(i).text.search(/^\s*- \[.] /g) != -1) {
					cache[i] = new Task(state.doc.line(i).text, file, this);
				}
			}
		}));

		this.addCommand({
			id: "mark-task-complete",
			name: "Mark task complete",
			hotkeys: [
				{ key: 'x', modifiers: [ "Alt" ] } as Hotkey
			],
			editorCallback: (editor: Editor) => {
				// for (let taskId in this.cache) {
				// 	if (this.app.workspace.getActiveViewOfType(MarkdownView)?.file == this.cache[taskId].file && this.cache[taskId].line == editor.getCursor("head").line) {
				// 		switch (this.cache[taskId].getStatus()) {
				// 			case COMPLETE:
				// 				this.cache[taskId].setStatus(DEFAULT);
				// 				break;
				// 			default:
				// 				this.cache[taskId].setStatus(COMPLETE);
				// 				break;
				// 		}
				// 	}
				// }
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


class PearSettingTab extends PluginSettingTab {
	plugin: PearPlugin;

	constructor(app: App, plugin: PearPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('General format for Pear dates')
			.addText(text => text
				.setValue(this.plugin.settings.dateFormats.join(', '))
				.setPlaceholder("YYYY-MM-DD HH:mm")
				.onChange(async (value) => {
					this.plugin.settings.dateFormats = value.split(', ');
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName('Floating Dates')
			.setDesc('Dates will appear on the right side of the screen instead of inline for a cleaner look')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.floatingDates)
				.onChange(async (value) => {
					this.plugin.settings.floatingDates = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName('Hide Completed Tasks')
			.setDesc('Tasks will remain in the note, however not appear in preview')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideCompleted)
				.onChange(async (value) => {
					this.plugin.settings.hideCompleted = value;
					await this.plugin.saveSettings();
				})
			)
		new Setting(containerEl)
			.setName('Scheduling tasks')
			.setDesc('Mark tasks as scheduling when no date is provided')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.schedulingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.schedulingEnabled = value;
					await this.plugin.saveSettings();
				})
			)
		new Setting(containerEl)
			.setName('Scheduling tasks')
			.setDesc('Mark tasks as scheduling when no date is provided')
			.addText(text => text
				.setValue(this.plugin.settings.showPeriod.period.toString())
				.onChange(async (value) => {
					this.plugin.settings.showPeriod.period = Number(value);
					await this.plugin.saveSettings();
				})
			)
			.addDropdown(momentFormat => momentFormat
				.addOption("hours", "Hours")
				.addOption("days", "Days")
				.addOption("weeks", "Weeks")
				.addOption("months", "Months")
				.setValue(this.plugin.settings.showPeriod.unit)
				.onChange(async (value) => {
					this.plugin.settings.showPeriod.unit = value as DurationConstructor;
					await this.plugin.saveSettings();
				})
			)
	}
}
